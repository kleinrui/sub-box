import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { exportDataSchema, getImportPreview } from "../lib/export-data";
import * as schema from "../server/db/schema";
import type { ExportData } from "../server/services/export-service";

const timestamps = { createdAt: "2026-10-10T00:00:00.000Z", updatedAt: "2026-10-10T00:00:00.000Z" };
const fixture: ExportData = {
  users: [{ id: "user", name: "用户", subscriptionKey: "private-subscription-key", subconverterId: null, ...timestamps }],
  nodes: [
    { id: "node", name: "节点", type: "custom", host: null, accessUrl: null, ...timestamps },
    { id: "external", name: "外部节点", type: "external-subscription", host: "example.com", accessUrl: "https://example.com/private-access-url", ...timestamps },
  ],
  nodeClients: [{ id: "client", nodeId: "node", url: "vless://private-client-url", ...timestamps }],
  userClientOptions: [{ userId: "user", nodeClientId: "client", enable: false, order: 0, ...timestamps }],
  subconverters: [{ id: "converter", url: "https://example.com", options: "", isDefault: false, ...timestamps }],
  clashConfigs: [
    { id: "config", key: "config-key", name: "配置", globalConfig: null, rules: null, ...timestamps },
    { id: "with-rules", key: "another-key", name: "带规则的配置", globalConfig: "mode: rule", rules: "- MATCH,DIRECT", ...timestamps },
  ],
};

test("数据库导出记录经 JSON 往返后通过共享导入校验，保留 null、布尔值和字符串", async () => {
  const client = createClient({ url: ":memory:" });
  const database = drizzle(client, { schema });
  try {
    for (const migration of ["0000_silky_paibok.sql", "0001_soft_captain_cross.sql", "0002_marvelous_gauntlet.sql"]) {
      for (const sql of readFileSync(`migrations/${migration}`, "utf8").split("--> statement-breakpoint")) {
        if (sql.trim()) await client.execute(sql);
      }
    }
    await database.insert(schema.users).values(fixture.users);
    await database.insert(schema.nodes).values(fixture.nodes);
    await database.insert(schema.nodeClients).values(fixture.nodeClients);
    await database.insert(schema.userClientOptions).values(fixture.userClientOptions);
    await database.insert(schema.subconverters).values(fixture.subconverters);
    await database.insert(schema.clashConfigs).values(fixture.clashConfigs);

    // 与 exportAll 使用相同表及记录格式，覆盖数据库返回的可空字段和布尔值。
    const exported: ExportData = {
      users: await database.select().from(schema.users),
      nodes: await database.select().from(schema.nodes),
      nodeClients: await database.select().from(schema.nodeClients),
      userClientOptions: await database.select().from(schema.userClientOptions),
      subconverters: await database.select().from(schema.subconverters),
      clashConfigs: await database.select().from(schema.clashConfigs),
    };
    assert.deepEqual(exportDataSchema.parse(JSON.parse(JSON.stringify(exported))), exported);
  } finally {
    client.close();
  }
});

test("导入校验拒绝缺失资源、非数组和无效记录，允许空导出", () => {
  const empty = { users: [], nodes: [], nodeClients: [], userClientOptions: [], subconverters: [], clashConfigs: [] };
  assert.equal(exportDataSchema.safeParse(empty).success, true);
  assert.equal(exportDataSchema.safeParse({}).success, false);
  assert.equal(exportDataSchema.safeParse({ ...fixture, nodes: {} }).success, false);
  assert.equal(exportDataSchema.safeParse({ ...fixture, nodeClients: [{ id: "missing-fields" }] }).success, false);
  assert.equal(exportDataSchema.safeParse({ ...fixture, userClientOptions: [{ ...fixture.userClientOptions[0], enable: "false" }] }).success, false);
});

test("未知 secret 和 API Token 字段被移除，导入预览只包含资源数量", () => {
  const parsed = exportDataSchema.parse({
    ...fixture,
    secret: "private-secret",
    apiTokens: [{ token: "private-api-token" }],
    users: fixture.users.map((user) => ({ ...user, secret: "private-user-secret" })),
  });
  assert.deepEqual(parsed, fixture);
  const preview = getImportPreview(parsed);
  assert.deepEqual(
    preview.map(({ key, count }) => [key, count]),
    [
      ["users", 1],
      ["nodes", 2],
      ["nodeClients", 1],
      ["userClientOptions", 1],
      ["subconverters", 1],
      ["clashConfigs", 2],
    ]
  );
  assert.ok(!JSON.stringify(preview).includes("private-"), "预览不能包含订阅密钥、链接或 secret");
});

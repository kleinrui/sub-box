import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import type { Database } from "../server/db";
import * as schema from "../server/db/schema";
import { NodeClientService } from "../server/services/node-client-service";

async function withDatabase(run: (service: NodeClientService, sqlite: ReturnType<typeof drizzle<typeof schema>>) => Promise<void>) {
  const client = createClient({ url: ":memory:" });
  const sqlite = drizzle(client, { schema });
  try {
    for (const migration of ["0000_silky_paibok", "0001_soft_captain_cross", "0002_marvelous_gauntlet"]) {
      for (const sql of readFileSync(`migrations/${migration}.sql`, "utf8").split("--> statement-breakpoint")) await client.execute(sql);
    }
    const now = "2026-01-01T00:00:00.000Z";
    await sqlite.insert(schema.nodes).values({ id: "node", name: "测试节点", createdAt: now, updatedAt: now });
    await sqlite.insert(schema.users).values(["user-a", "user-b", "user-c"].map((id) => ({ id, name: id, subscriptionKey: id, createdAt: now, updatedAt: now })));
    await sqlite
      .insert(schema.nodeClients)
      .values(["client-a", "client-b"].map((id) => ({ id, nodeId: "node", url: `vless://${id}@example.com:443`, createdAt: now, updatedAt: now })));
    await run(new NodeClientService(sqlite as unknown as Database), sqlite);
  } finally {
    client.close();
  }
}

test("编辑提交完整用户集合时保留旧关联的启用状态和顺序", async () => {
  await withDatabase(async (service) => {
    await service.setUserClientOption("client-a", "user-a", { enable: true, order: 7 });
    await service.setUserClientOption("client-a", "user-b", { enable: false, order: 19 });
    const before = await service.getUserClientOptions("client-a");

    await service.setUserClientOptions("client-a", ["user-a", "user-b", "user-c"], { enable: true, order: 0 });
    await service.updateUserClientOption("client-a", "user-a", { enable: false });
    const options = await service.getUserClientOptions("client-a");
    assert.equal(options.length, 3);
    assert.deepEqual(
      options.find((option) => option.userId === "user-b"),
      before.find((option) => option.userId === "user-b")
    );
    assert.equal(options.find((option) => option.userId === "user-a")?.order, 7);
    assert.equal(options.find((option) => option.userId === "user-a")?.enable, false);
    assert.equal(options.find((option) => option.userId === "user-c")?.enable, true);

    await service.setUserClientOptions("client-a", ["user-b", "user-c"]);
    assert.deepEqual((await service.getUserClientOptions("client-a")).map((option) => option.userId).sort(), ["user-b", "user-c"]);
    assert.equal((await service.getUserClientOptions("client-a")).find((option) => option.userId === "user-b")?.order, 19);
    assert.ok(await service.get("client-a"));
  });
});

test("取消关联只删除指定用户与客户端的组合，保留共享客户端和其他关联", async () => {
  await withDatabase(async (service, sqlite) => {
    await service.setUserClientOption("client-a", "user-a", { enable: false, order: 7 });
    await service.setUserClientOption("client-a", "user-b", { enable: false, order: 19 });
    await service.setUserClientOption("client-b", "user-a", { enable: true, order: 21 });
    const before = await sqlite.select().from(schema.userClientOptions);

    await Promise.all([service.removeUserClientOption("client-a", "user-a"), service.setUserClientOption("client-a", "user-c", { enable: true })]);
    await service.removeUserClientOption("client-a", "user-a");
    const after = await sqlite.select().from(schema.userClientOptions);
    assert.ok(!after.some((option) => option.nodeClientId === "client-a" && option.userId === "user-a"));
    for (const option of before.filter((option) => option.userId !== "user-a" || option.nodeClientId !== "client-a")) {
      assert.deepEqual(
        after.find((current) => current.userId === option.userId && current.nodeClientId === option.nodeClientId),
        option
      );
    }
    assert.ok(after.some((option) => option.userId === "user-c" && option.nodeClientId === "client-a"));
    assert.ok(await service.get("client-a"));
    assert.equal((await service.getByUserId("user-a")).length, 1);
    assert.equal((await service.getByUserId("user-b"))[0]?.enable, false);
  });
});

test("单个关联保存可重复调用，保留现有顺序和其他用户，并按当前用户追加顺序", async () => {
  await withDatabase(async (service, sqlite) => {
    await service.setUserClientOption("client-a", "user-b", { enable: false, order: 99 });
    await service.setUserClientOption("client-b", "user-a", { enable: false, order: 21 });
    const shared = (await service.getUserClientOptions("client-a"))[0];
    const created = await service.setUserClientOption("client-a", "user-a", { enable: false });
    assert.equal(created.order, 22);
    assert.equal(created.enable, false);
    const unchanged = await service.setUserClientOption("client-a", "user-a");
    assert.equal(unchanged.enable, false);
    assert.equal(unchanged.order, 22);
    const updated = await service.setUserClientOption("client-a", "user-a", { enable: true });
    assert.equal(updated.enable, true);
    assert.equal(updated.order, 22);
    assert.equal(updated.createdAt, created.createdAt);
    assert.deepEqual(
      (await service.getUserClientOptions("client-a")).find((option) => option.userId === "user-b"),
      shared
    );

    await Promise.all([service.setUserClientOption("client-b", "user-c", { enable: false }), service.setUserClientOption("client-b", "user-c", { enable: false })]);
    const repeated = await sqlite
      .select()
      .from(schema.userClientOptions)
      .where(and(eq(schema.userClientOptions.nodeClientId, "client-b"), eq(schema.userClientOptions.userId, "user-c")));
    assert.equal(repeated.length, 1);
    assert.equal(repeated[0]?.enable, false);
  });
});

test("单个关联保存拒绝不存在的用户或客户端，不创建孤立关联", async () => {
  await withDatabase(async (service, sqlite) => {
    await assert.rejects(service.setUserClientOption("missing-client", "user-a"), /节点客户端不存在/);
    await assert.rejects(service.setUserClientOption("client-a", "missing-user"), /用户不存在/);
    assert.equal((await sqlite.select().from(schema.userClientOptions)).length, 0);
    await service.delete("client-a");
    await assert.rejects(service.setUserClientOption("client-a", "user-a"), /节点客户端不存在/);
    assert.equal((await sqlite.select().from(schema.userClientOptions)).length, 0);
  });
});

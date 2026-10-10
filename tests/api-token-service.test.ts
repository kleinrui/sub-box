import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createApiTokenSchema, hashApiToken } from "../lib/api-token";
import type { Database } from "../server/db";
import * as schema from "../server/db/schema";
import { apiTokenService } from "../server/services/api-token-service";

test("Token 哈希存储、过期与撤销在 SQLite 上生效", async () => {
  const client = createClient({ url: ":memory:" });
  // 与 D1 使用相同 SQLite schema；仅替换测试数据库的连接驱动。
  const sqlite = drizzle(client, { schema });
  const database = sqlite as unknown as Database;
  try {
    for (const sql of readFileSync("migrations/0003_wild_edwin_jarvis.sql", "utf8").split("--> statement-breakpoint")) await client.execute(sql);
    const input = createApiTokenSchema.parse({ name: "  test  ", permission: "read", expiresInDays: "7" });
    const { token } = await apiTokenService.create(database, input);
    const [record] = await sqlite.select().from(schema.apiTokens);
    assert.ok(record);
    assert.equal(record.name, "test");
    assert.equal(record.tokenHash, await hashApiToken(token));
    assert.ok(!JSON.stringify(record).includes(token), "数据库不保存完整 Token");
    assert.equal(await hashApiToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert.equal((await apiTokenService.authenticate(database, `Bearer ${token}`)).permission, "read");
    const [listed] = await apiTokenService.list(database);
    assert.ok(listed?.lastUsedAt);
    assert.ok(!("tokenHash" in listed));
    const unauthorized = (error: unknown) => error instanceof Error && "code" in error && error.code === "UNAUTHORIZED";
    await assert.rejects(apiTokenService.authenticate(database, "Bearer invalid"), unauthorized);
    await assert.rejects(apiTokenService.authenticate(database, `Basic ${token}`), unauthorized);
    await sqlite.update(schema.apiTokens).set({ expiresAt: "2000-01-01T00:00:00.000Z" }).where(eq(schema.apiTokens.id, record.id));
    await assert.rejects(apiTokenService.authenticate(database, `Bearer ${token}`), unauthorized);
    await sqlite.update(schema.apiTokens).set({ expiresAt: "2999-01-01T00:00:00.000Z" }).where(eq(schema.apiTokens.id, record.id));
    await apiTokenService.revoke(database, record.id);
    await assert.rejects(apiTokenService.authenticate(database, `Bearer ${token}`), unauthorized);
    await apiTokenService.delete(database, record.id);
    assert.equal((await apiTokenService.list(database)).length, 0);
    const active = await apiTokenService.create(database, input);
    const [activeRecord] = await apiTokenService.list(database);
    assert.ok(activeRecord);
    await apiTokenService.delete(database, activeRecord.id);
    await assert.rejects(apiTokenService.authenticate(database, `Bearer ${active.token}`), unauthorized);
    assert.equal((await apiTokenService.list(database)).length, 0);
    assert.equal(createApiTokenSchema.safeParse({ name: " ", permission: "admin", expiresInDays: "0" }).success, false);
  } finally {
    client.close();
  }
});

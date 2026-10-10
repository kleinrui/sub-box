import { mock } from "bun:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { parse } from "yaml";

// 在独立进程内替换外部依赖，实际执行订阅路由、tRPC、配置查询和 YAML 合并。
const client = createClient({ url: ":memory:" });
await client.execute("CREATE TABLE clash_configs (id TEXT PRIMARY KEY, key TEXT UNIQUE, name TEXT, global_config TEXT, rules TEXT, created_at TEXT, updated_at TEXT)");
const database = drizzle(client);
mock.module("../../server/db", () => ({ db: async () => database }));
mock.module("../../server/services/authentication-service", () => ({ getUser: async () => null }));
mock.module("../../server/services/api-token-service", () => ({ apiTokenService: {} }));
mock.module("../../server/services/user-service", () => ({
  userService: { findBySubscriptionKey: async (key) => (key === "test-user" ? { id: "user", subconverterId: null } : null) },
}));
const original = "mode: rule\nproxies: []\nrules:\n  - MATCH,DIRECT\n";
let upstream = original;
let upstreamError = null;
let upstreamCalls = 0;
mock.module("../../server/services/subscription-service", () => ({
  subscriptionService: {
    generateSubscription: async () => {
      upstreamCalls++;
      if (upstreamError) throw upstreamError;
      return upstream;
    },
  },
}));
const { subscriptionRouter } = await import("../../server/api/routers/subscription");
mock.module("../../server/api/root", () => ({ createCaller: (ctx) => ({ subscription: subscriptionRouter.createCaller(ctx) }) }));
const { GET } = await import("../../app/sub/[key]/route");
const { clashConfigService } = await import("../../server/services/clash-config-service");
const andRule = "AND,((NETWORK,UDP),(DOMAIN,stun.l.google.com)),🚀 节点选择";
const config = await clashConfigService.create({
  key: "daily",
  name: "测试",
  globalConfig: "mode: global\ndns:\n  enable: true",
  rules: `- ${andRule}\n- DOMAIN-SUFFIX,example.com,DIRECT`,
});
const request = (query = "", key = "test-user") => GET(new Request(`http://localhost/sub/${key}${query}`), { params: Promise.resolve({ key }) });
try {
  for (const value of [config.key, config.id]) {
    const response = await request(`?config=${value}`);
    assert.equal(response.status, 200);
    const yaml = parse(await response.text());
    assert.equal(yaml.mode, "global");
    assert.deepEqual(yaml.dns, { enable: true });
    assert.deepEqual(yaml.rules, [andRule, "DOMAIN-SUFFIX,example.com,DIRECT", "MATCH,DIRECT"]);
  }
  assert.equal(await (await request()).text(), original);
  const callsBeforeMissing = upstreamCalls;
  assert.equal((await request("?config=missing")).status, 404);
  assert.equal((await request("?config=")).status, 400);
  assert.equal((await request("?config=daily", "missing-user")).status, 404);
  assert.equal(upstreamCalls, callsBeforeMissing, "无效配置和用户须在请求转换器前报错");
  const caller = subscriptionRouter.createCaller({ apiToken: null });
  assert.equal(parse(await caller.getSubscriptionByKey({ key: "test-user", configId: config.id })).mode, "global");
  await assert.rejects(caller.getSubscriptionByKey({ key: "test-user", configId: "missing" }), { code: "NOT_FOUND" });

  for (const invalid of ["- [broken", "DOMAIN,example.com,DIRECT"]) {
    await clashConfigService.update(config.id, { rules: invalid });
    assert.equal((await request("?config=daily")).status, 500, "规则解析错误不能返回成功");
  }
  await clashConfigService.update(config.id, { rules: config.rules });
  for (const invalid of ["dns: [", "- invalid", "false", "rules: not-a-list"]) {
    await clashConfigService.update(config.id, { globalConfig: invalid });
    assert.equal((await request("?config=daily")).status, 500, "无效全局配置不能静默忽略");
  }
  await clashConfigService.update(config.id, { globalConfig: config.globalConfig });
  for (const invalid of ["dns: [", "", "false", "- invalid", "rules: not-a-list"]) {
    upstream = invalid;
    assert.equal((await request("?config=daily")).status, 500, "无效订阅不能合并成成功响应");
  }
  upstream = original;
  upstreamError = new Error("转换器请求失败");
  assert.equal((await request("?config=daily")).status, 500);
  console.log("订阅 Key/ID、AND 规则、缺失配置及解析/请求错误回归验证通过");
} finally {
  client.close();
}

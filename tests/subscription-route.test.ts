import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("订阅路由按 Key 合并，保留 AND 规则，并以失败响应暴露配置和合并错误", () => {
  // mock.module 仅作用于子进程，避免污染其他服务测试。
  const result = spawnSync("bun", ["--preload", "./tests/setup.mjs", "tests/fixtures/subscription-route.mjs"], { encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, `${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
});

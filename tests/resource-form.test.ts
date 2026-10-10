import assert from "node:assert/strict";
import { test } from "node:test";
import { generateSubscriptionKey, nodeFormSchema, userFormSchema } from "../lib/resource-form";

test("订阅密钥使用随机、适合链接的值，手动填写及已有值保持不变", () => {
  const first = generateSubscriptionKey();
  const second = generateSubscriptionKey();
  assert.match(first, /^[0-9a-f]{48}$/);
  assert.notEqual(first, second);
  const saved = userFormSchema.parse({ name: "  手机  ", subscriptionKey: "existing_key-123", subconverterId: null });
  assert.equal(saved.name, "手机");
  assert.equal(saved.subscriptionKey, "existing_key-123");
  assert.equal(userFormSchema.parse({ name: "旧用户", subscriptionKey: " legacy-key " }).subscriptionKey, " legacy-key ");
  assert.equal(userFormSchema.safeParse({ name: "  ", subscriptionKey: first }).success, false);
  assert.equal(userFormSchema.safeParse({ name: "用户", subscriptionKey: "  " }).success, false);
});

test("节点可选地址允许留空，接受完整 HTTP 地址并拒绝残缺地址", () => {
  const base = { name: " 节点 ", type: "custom", host: " example.com " };
  assert.equal(nodeFormSchema.parse({ ...base, accessUrl: "" }).host, "example.com");
  assert.equal(nodeFormSchema.parse({ ...base, accessUrl: " https://example.com:2053/panel " }).accessUrl, "https://example.com:2053/panel");
  for (const address of ["https://", "https://bad host", "ftp://example.com", "example.com"]) {
    assert.equal(nodeFormSchema.safeParse({ ...base, accessUrl: address }).success, false, `应拒绝地址：${address}`);
  }
  assert.equal(nodeFormSchema.safeParse({ ...base, name: " " }).success, false);
  assert.equal(nodeFormSchema.safeParse({ ...base, type: "" }).success, false);
});

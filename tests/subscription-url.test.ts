import assert from "node:assert/strict";
import { test } from "node:test";
import { getSubscriptionUrl } from "../lib/subscription-url";

test("手动密钥中的路径、查询及片段字符仍作为完整订阅密钥传递", () => {
  const key = "手机 / key?#%";
  const url = new URL(getSubscriptionUrl("https://example.com/", key));
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
  assert.equal(url.pathname.split("/").length, 3);
  assert.equal(decodeURIComponent(url.pathname.slice("/sub/".length)), key);
  assert.equal(getSubscriptionUrl("https://example.com", "abc123"), "https://example.com/sub/abc123");
  assert.equal(getSubscriptionUrl("", key), "");
});

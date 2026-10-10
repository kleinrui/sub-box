import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNodeClientImportItems, findNodeClientByUrl, importNodeClients, type NodeClientImportSource, parseNodeClientUrls } from "../lib/node-client-import";

function client(id: string, nodeId: string, url: string): NodeClientImportSource {
  return { id, nodeId, url, createdAt: "2026-10-10", updatedAt: "2026-10-10", users: [{ userId: "existing-user", enable: false, order: 7 }] };
}

test("导入地址去重，预览按所属节点和订阅地址匹配，不按用户匹配", () => {
  const parsed = parseNodeClientUrls(" vless://same \n\nvless://same\nvless://new\n");
  assert.deepEqual(parsed, { urls: ["vless://same", "vless://new"], duplicateCount: 1 });
  const clients = [client("wrong-node", "node-b", "vless://same"), client("same-user-other-url", "node-a", "vless://other"), client("match", "node-a", "vless://same")];
  assert.equal(findNodeClientByUrl(clients, "node-a", "vless://same")?.id, "match");
  assert.deepEqual(buildNodeClientImportItems(parsed.urls, clients, "node-a", "existing-user"), [
    { url: "vless://same", userId: "existing-user", enable: false, clientId: "match" },
    { url: "vless://new", userId: "existing-user", enable: true, clientId: undefined },
  ]);
});

test("已有客户端只保存所选用户的启用状态，不替换其他用户关联", async () => {
  const existing = client("shared", "node-a", "vless://shared");
  const calls: unknown[] = [];
  const result = await importNodeClients({
    nodeId: "node-a",
    clients: [existing],
    items: [{ url: existing.url, userId: "new-user", enable: false }],
    createClient: async () => {
      throw new Error("不应重复创建");
    },
    setUserClientOption: async (input) => calls.push(input),
  });
  assert.deepEqual(calls, [{ nodeClientId: "shared", userId: "new-user", data: { enable: false } }]);
  assert.deepEqual(existing.users, [{ userId: "existing-user", enable: false, order: 7 }]);
  assert.deepEqual(result, { succeeded: 1, created: 0, updated: 1, failed: [] });
});

test("旧地址首尾含空白时导入复用原客户端，并保留已有用户关联和排序", async () => {
  const existing = client("legacy", "node-a", " \tvless://legacy \n");
  const clients = [client("other-node", "node-b", "vless://legacy"), existing];
  const preview = buildNodeClientImportItems(parseNodeClientUrls("vless://legacy").urls, clients, "node-a", "existing-user");
  let creates = 0;
  const saved: unknown[] = [];
  const result = await importNodeClients({
    nodeId: "node-a",
    clients,
    items: [...preview, { url: " \tvless://legacy  ", userId: "new-user", enable: false }],
    createClient: async ({ nodeId, url }) => {
      creates += 1;
      return client("duplicate", nodeId, url);
    },
    setUserClientOption: async (input) => saved.push(input),
  });
  assert.equal(creates, 0, "历史地址的空白不能导致重复创建客户端");
  assert.deepEqual(saved, [
    { nodeClientId: "legacy", userId: "existing-user", data: { enable: false } },
    { nodeClientId: "legacy", userId: "new-user", data: { enable: false } },
  ]);
  assert.deepEqual(existing.users, [{ userId: "existing-user", enable: false, order: 7 }]);
  assert.deepEqual(result, { succeeded: 2, created: 0, updated: 2, failed: [] });
});

test("部分失败继续处理后续地址，保留已创建客户端供重试且不重复创建", async () => {
  const created: NodeClientImportSource[] = [];
  const result = await importNodeClients({
    nodeId: "node-a",
    clients: [],
    items: [
      { url: "vless://failed", userId: "user-a", enable: false },
      { url: "vless://good", userId: "user-a", enable: true },
    ],
    createClient: async ({ nodeId, url }) => {
      const newClient = client(`created-${created.length}`, nodeId, url);
      created.push(newClient);
      return newClient;
    },
    setUserClientOption: async ({ nodeClientId }) => {
      if (nodeClientId === "created-0") throw new Error("用户关联暂时失败");
    },
  });
  assert.equal(result.succeeded, 1);
  assert.equal(result.created, 2);
  assert.deepEqual(result.failed, [{ url: "vless://failed", userId: "user-a", enable: false, clientId: "created-0", error: "用户关联暂时失败" }]);
  const retryCalls: unknown[] = [];
  const retried = await importNodeClients({
    nodeId: "node-a",
    clients: created,
    items: result.failed,
    createClient: async () => {
      throw new Error("重试不应重复创建");
    },
    setUserClientOption: async (input) => retryCalls.push(input),
  });
  assert.deepEqual(retried, { succeeded: 1, created: 0, updated: 1, failed: [] });
  assert.deepEqual(retryCalls, [{ nodeClientId: "created-0", userId: "user-a", data: { enable: false } }]);
});

test("重复导入同一地址和用户不会重复创建或写入关联", async () => {
  let creates = 0;
  let associations = 0;
  const item = { url: "vless://same", userId: "user-a", enable: true };
  const result = await importNodeClients({
    nodeId: "node-a",
    clients: [],
    items: [item, item, { ...item, userId: "user-b", enable: false }],
    createClient: async ({ nodeId, url }) => {
      creates += 1;
      return client("single-client", nodeId, url);
    },
    setUserClientOption: async () => {
      associations += 1;
    },
  });
  assert.equal(creates, 1);
  assert.equal(associations, 2);
  assert.equal(result.succeeded, 2);
  assert.equal(result.failed.length, 0);
});

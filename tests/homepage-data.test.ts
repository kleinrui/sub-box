import assert from "node:assert/strict";
import { test } from "node:test";
import { getHomepageData } from "../lib/homepage-data";

const users = [
  { id: "alice", name: "Alice", subconverterId: "selected" },
  { id: "bob", name: "Bob", subconverterId: null },
  { id: "empty", name: "无关联用户", subconverterId: null },
];
const nodes = [
  { id: "node-a", name: "节点 A" },
  { id: "node-empty", name: "空节点" },
];
const clients = [
  {
    id: "shared",
    nodeId: "node-a",
    users: [
      { userId: "alice", enable: true },
      { userId: "bob", enable: false },
    ],
  },
  { id: "disabled", nodeId: "node-a", users: [{ userId: "alice", enable: false }] },
  { id: "unassigned", nodeId: "node-a", users: [] },
];
const subconverters = [{ id: "selected", url: "https://selected.example", isDefault: false }];

test("首页统计共享客户端时按各用户的启用状态计数，不把无关联与禁用混为一谈", () => {
  const result = getHomepageData({ users, nodes, clients, subconverters });
  assert.deepEqual(result.overview, { users: 3, nodes: 2, clients: 3 });
  assert.equal(result.isEmpty, false);
  assert.deepEqual(
    result.users.map(({ id, totalClientCount, enabledClientCount }) => ({ id, totalClientCount, enabledClientCount })),
    [
      { id: "alice", totalClientCount: 2, enabledClientCount: 1 },
      { id: "bob", totalClientCount: 1, enabledClientCount: 0 },
      { id: "empty", totalClientCount: 0, enabledClientCount: 0 },
    ]
  );
  assert.deepEqual(result.todos.usersWithoutClients, [{ id: "empty", name: "无关联用户" }]);
  assert.deepEqual(result.todos.usersWithoutEnabledClients, [{ id: "bob", name: "Bob" }]);
  assert.deepEqual(result.todos.nodesWithoutClients, [{ id: "node-empty", name: "空节点" }]);
});

test("未设置默认转换器只提醒没有可用指定转换器的用户", () => {
  const result = getHomepageData({ users: [...users, { id: "missing", name: "失效转换器用户", subconverterId: "deleted" }], nodes, clients, subconverters });
  assert.deepEqual(
    result.todos.usersNeedingDefaultSubconverter.map((user) => user.id),
    ["bob", "empty", "missing"]
  );
  assert.equal(result.users.find((user) => user.id === "alice")?.subconverterUrl, "https://selected.example");
  assert.equal(result.users.find((user) => user.id === "bob")?.subconverterUrl, null);
});

test("实际转换器与订阅生成规则一致：优先指定转换器，否则使用默认转换器", () => {
  const result = getHomepageData({
    users: [...users, { id: "missing", name: "失效转换器用户", subconverterId: "deleted" }],
    nodes,
    clients,
    subconverters: [...subconverters, { id: "default", url: "https://default.example", isDefault: true }],
  });
  assert.deepEqual(result.todos.usersNeedingDefaultSubconverter, []);
  assert.equal(result.users.find((user) => user.id === "alice")?.subconverterUrl, "https://selected.example");
  assert.equal(result.users.find((user) => user.id === "alice")?.subconverterIsDefault, false);
  for (const id of ["bob", "empty", "missing"]) {
    assert.equal(result.users.find((user) => user.id === id)?.subconverterUrl, "https://default.example");
    assert.equal(result.users.find((user) => user.id === id)?.subconverterIsDefault, true);
  }
});

test("待办结果不携带订阅密钥、客户端链接或其他原始记录字段", () => {
  const result = getHomepageData({
    users: users.map((user) => ({ ...user, subscriptionKey: "secret-subscription-key", createdAt: "secret-created-at" })),
    nodes: nodes.map((node) => ({ ...node, accessUrl: "secret-node-access-url" })),
    clients: clients.map((client) => ({ ...client, url: "secret-client-url" })),
    subconverters,
  });
  assert.ok(!JSON.stringify(result).includes("secret-"));
  for (const list of Object.values(result.todos)) {
    for (const item of list) assert.deepEqual(Object.keys(item).sort(), ["id", "name"]);
  }
});

test("空站点显示配置步骤依据核心记录为空，待办数量保持真实零", () => {
  const result = getHomepageData({ users: [], nodes: [], clients: [], subconverters: [] });
  assert.equal(result.isEmpty, true);
  assert.deepEqual(result.overview, { users: 0, nodes: 0, clients: 0 });
  assert.ok(Object.values(result.todos).every((list) => list.length === 0));
});

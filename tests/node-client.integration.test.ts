import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SUB_BOX_TEST_URL;

test("共享客户端关联可独立添加、更新和取消（仅本地运行）", { skip: !base }, async () => {
  assert.ok(base && ["localhost", "127.0.0.1"].includes(new URL(base).hostname), "测试仅允许本地站点");
  const login = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);

  async function call<T>(path: string, method: "GET" | "POST", input: unknown): Promise<T> {
    const payload = JSON.stringify({ json: input });
    const response = await fetch(`${base}/api/trpc/${path}${method === "GET" ? `?input=${encodeURIComponent(payload)}` : ""}`, {
      method,
      headers: { "Content-Type": "application/json", cookie: cookie as string },
      body: method === "POST" ? payload : undefined,
    });
    assert.equal(response.status, 200, path);
    const body = (await response.json()) as { result: { data: { json: T } } };
    return body.result.data.json;
  }

  type Option = { userId: string; enable: boolean; order: number };
  const stamp = `client-test-${crypto.randomUUID()}`;
  const userIds: string[] = [];
  let nodeId: string | undefined;
  try {
    for (const name of ["A", "B", "C"]) {
      const user = await call<{ id: string }>("user.create", "POST", { name: `${stamp}-${name}`, subscriptionKey: `${stamp}-${name}` });
      userIds.push(user.id);
    }
    const [userA, userB, userC] = userIds;
    assert.ok(userA && userB && userC);
    const node = await call<{ id: string }>("node.create", "POST", { name: stamp, type: "custom" });
    nodeId = node.id;
    const client = await call<{ id: string }>("nodeClient.create", "POST", { nodeId, url: `https://example.invalid/${stamp}` });
    const setOption = (userId: string, data?: { enable?: boolean; order?: number }) =>
      call<Option>("nodeClient.setUserClientOption", "POST", { nodeClientId: client.id, userId, data });
    const options = () => call<Option[]>("nodeClient.getUserClientOptions", "GET", client.id);

    await setOption(userA, { enable: false, order: 7 });
    await Promise.all([setOption(userB, { enable: true, order: 12 }), setOption(userC, { enable: false, order: 20 })]);
    assert.equal((await options()).length, 3, "追加关联不能移除其他用户");
    await setOption(userB, { enable: false });
    await setOption(userB);
    const afterUpdate = await options();
    assert.deepEqual(
      afterUpdate.map(({ userId, enable, order }) => ({ userId, enable, order })),
      [
        { userId: userA, enable: false, order: 7 },
        { userId: userB, enable: false, order: 12 },
        { userId: userC, enable: false, order: 20 },
      ],
      "只更新指定用户的显式字段，保留顺序和其他用户状态"
    );
    await call("nodeClient.removeUserClientOption", "POST", { nodeClientId: client.id, userId: userB });
    await call("nodeClient.removeUserClientOption", "POST", { nodeClientId: client.id, userId: userB });
    assert.deepEqual(
      (await options()).map((option) => option.userId),
      [userA, userC]
    );
    assert.equal((await call<{ id: string }>("nodeClient.getById", "GET", client.id)).id, client.id, "取消关联保留客户端");
    await call("nodeClient.delete", "POST", client.id);
    assert.equal(await call("nodeClient.getById", "GET", client.id), null);
    assert.deepEqual(await options(), [], "全局删除仍清理全部关联");
  } finally {
    if (nodeId) await call("node.delete", "POST", nodeId);
    for (const id of userIds) await call("user.delete", "POST", id);
  }
});

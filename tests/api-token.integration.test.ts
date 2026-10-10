import assert from "node:assert/strict";
import { test } from "node:test";
import { apiOperations } from "../server/api/api-documentation";

const base = process.env.SUB_BOX_TEST_URL;
test("API Token 权限、撤销和公开文档（仅本地运行）", { skip: !base }, async () => {
  assert.ok(base && ["localhost", "127.0.0.1"].includes(new URL(base).hostname), "测试仅允许本地站点");
  const docResponse = await fetch(`${base}/api/openapi.json`);
  assert.equal(docResponse.status, 200);
  const doc = (await docResponse.json()) as { openapi: string; paths: Record<string, { get?: { description: string }; post?: { description: string } }> };
  assert.match(doc.openapi, /^3\.1\./);
  assert.deepEqual(
    Object.keys(doc.paths).sort(),
    Object.keys(apiOperations)
      .map((name) => `/${name}`)
      .sort()
  );
  for (const path of Object.values(doc.paths) as { get?: { description: string }; post?: { description: string } }[]) {
    assert.ok((path.get ?? path.post)?.description);
  }
  const login = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200, "本地测试管理员登录成功");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "登录应返回会话 Cookie");
  const stamp = `api-test-${crypto.randomUUID()}`;
  const tokenIds: string[] = [];
  let nodeId: string | undefined;
  type Tokens = { id: string; name: string; revokedAt: string | null; lastUsedAt: string | null }[];
  const call = async <T = Record<string, string>>(
    path: string,
    method: string,
    input: unknown,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; data: T; error: { data: { code: string } } | undefined; cache: string | null }> => {
    const payload = input === undefined ? undefined : JSON.stringify({ json: input });
    const url = `${base}/api/trpc/${path}${method === "GET" && payload ? `?input=${encodeURIComponent(payload)}` : ""}`;
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json", ...headers }, body: method === "POST" ? payload : undefined });
    const body = (await response.json()) as { result?: { data?: { json: T } }; error?: { json: { data: { code: string } } } };
    return { status: response.status, data: body.result?.data?.json as T, error: body.error?.json, cache: response.headers.get("cache-control") };
  };
  try {
    assert.equal((await call("node.getAll", "GET", undefined)).status, 401);
    const created: Record<string, string> = {};
    for (const permission of ["read", "write"]) {
      const result: { status: number; cache: string | null; data: { token: string } } = await call<{ token: string }>(
        "apiToken.create",
        "POST",
        { name: `${stamp}-${permission}`, permission, expiresInDays: "7" },
        { cookie }
      );
      assert.equal(result.status, 200, "网页登录创建 Token");
      assert.equal(result.cache, "no-store");
      assert.match(result.data.token, /^sb_[a-f0-9]{64}$/);
      created[permission] = result.data.token;
    }
    const list = await call<Tokens>("apiToken.list", "GET", undefined, { cookie });
    const fixtures = list.data.filter((item: { name: string }) => item.name.startsWith(stamp));
    tokenIds.push(...fixtures.map((item: { id: string }) => item.id));
    assert.equal(fixtures.length, 2);
    assert.ok(
      fixtures.every((item: object) => !("token" in item) && !("tokenHash" in item)),
      "列表不能泄露凭据或哈希"
    );
    const read = { authorization: `Bearer ${created.read}` };
    const write = { authorization: `Bearer ${created.write}` };
    assert.equal((await call("node.getAll", "GET", undefined, read)).status, 200);
    assert.equal((await call("node.create", "POST", { name: stamp }, read)).status, 403);
    assert.equal((await call("node.create", "POST", { name: stamp }, { ...read, cookie })).status, 403, "Cookie 不提升只读权限");
    assert.equal((await call("node.getAll", "GET", undefined, { authorization: "Bearer invalid", cookie })).status, 401, "无效 Token 不降级为会话");
    for (const headers of [read, write, { ...write, cookie }]) {
      assert.equal((await call<Tokens>("apiToken.list", "GET", undefined, headers)).status, 403);
      assert.equal((await call("apiToken.create", "POST", { name: stamp, permission: "write", expiresInDays: "7" }, headers)).status, 403);
      assert.equal((await call("apiToken.delete", "POST", { id: tokenIds[0] }, headers)).status, 403);
      assert.equal((await call("auth.getUser", "GET", undefined, headers)).status, 403);
    }
    assert.equal((await call("export.importAll", "POST", {}, write)).status, 403, "未公开接口不接受 Token");
    const invalid = await call("node.create", "POST", {}, write);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.error?.data.code, "BAD_REQUEST");
    const node = await call("node.create", "POST", { name: stamp, type: "custom" }, write);
    assert.equal(node.status, 200);
    nodeId = node.data.id;
    assert.equal((await call("node.getById", "GET", nodeId, read)).data.name, stamp);
    assert.equal((await call("node.update", "POST", { id: nodeId, data: { name: `${stamp}-updated` } }, write)).status, 200);
    assert.equal((await call("node.getById", "GET", nodeId, read)).data.name, `${stamp}-updated`);
    assert.equal((await call("node.delete", "POST", nodeId, write)).status, 200);
    nodeId = undefined;
    const used = await call<Tokens>("apiToken.list", "GET", undefined, { cookie });
    assert.ok(used.data.filter((item: { name: string }) => item.name.startsWith(stamp)).every((item: { lastUsedAt: string | null }) => item.lastUsedAt));
    for (const id of tokenIds) assert.equal((await call("apiToken.revoke", "POST", { id }, { cookie })).status, 200);
    assert.equal((await call("node.getAll", "GET", undefined, read)).status, 401);
    assert.equal((await call("node.getAll", "GET", undefined, write)).status, 401);
    assert.equal((await call("node.getAll", "GET", undefined, { cookie })).status, 200, "原有网页登录仍可用");
  } finally {
    if (nodeId) await call("node.delete", "POST", nodeId, { cookie });
    const list = await call<Tokens>("apiToken.list", "GET", undefined, { cookie });
    for (const item of list.data ?? []) {
      if (item.name.startsWith(stamp)) await call("apiToken.delete", "POST", { id: item.id }, { cookie });
    }
  }
});

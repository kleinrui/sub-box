import assert from "node:assert/strict";
import { test } from "node:test";
import type { OpenAPIV3_1 } from "@trpc/openapi";
import { createWebMcpOperations } from "../lib/webmcp";
import document from "../public/openapi.json";
import { apiOperations } from "../server/api/api-documentation";

const operations = createWebMcpOperations(document as unknown as OpenAPIV3_1.Document);
const find = (path: string) => {
  const operation = operations.find((value) => value.path === path);
  assert.ok(operation);
  return operation;
};

test("工具仅暴露 API 白名单，所有 schema 独立可用且名称唯一", () => {
  assert.deepEqual(operations.map((value) => value.path).sort(), Object.keys(apiOperations).sort());
  assert.equal(new Set(operations.map((value) => value.name)).size, operations.length);
  for (const operation of operations) {
    assert.match(operation.name, /^[a-zA-Z0-9_]+$/);
    assert.equal(operation.inputSchema.type, "object");
    assert.ok(!JSON.stringify(operation.inputSchema).includes('"$ref"'));
    assert.ok(!/auth|apiToken|importAll/.test(operation.path));
    assert.equal(
      operation.readOnly,
      Boolean(document.paths[`/${operation.path}` as keyof typeof document.paths] && "get" in document.paths[`/${operation.path}` as keyof typeof document.paths])
    );
  }
});

test("无参数、字符串、对象和嵌套更新参数保持真实业务结构", () => {
  assert.equal(find("node.getAll").inputMode, "none");
  assert.deepEqual(find("node.getAll").inputSchema.properties, {});
  const get = find("node.getById");
  assert.equal(get.inputMode, "value");
  assert.equal(get.inputSchema.properties?.input?.type, "string");
  assert.deepEqual(get.inputSchema.required, ["input"]);
  const create = find("node.create");
  assert.equal(create.inputMode, "object");
  assert.ok(create.inputSchema.required?.includes("name"));
  assert.ok(create.inputSchema.properties?.name?.description);
  assert.ok(!create.inputSchema.properties?.json);
  const update = find("node.update");
  assert.ok(update.inputSchema.properties?.data?.properties?.name);
  assert.match(find("node.delete").description, /同时删除/);
  assert.match(find("nodeClient.setUserClientOptions").description, /未列出的现有关联会被删除/);
});

test("展开多级 schema 引用并拒绝缺失或循环引用", () => {
  const fixture = structuredClone(document) as unknown as OpenAPIV3_1.Document;
  fixture.components ??= {};
  fixture.components.schemas = { Alias: { $ref: "#/components/schemas/Name" }, Name: { type: "string", minLength: 1 } };
  const body = fixture.paths?.["/node.create"]?.post?.requestBody;
  assert.ok(body && !("$ref" in body));
  const media = body.content["application/json"];
  assert.ok(media);
  media.schema = { type: "object", properties: { json: { type: "object", properties: { name: { $ref: "#/components/schemas/Alias" } } } } };
  const input = createWebMcpOperations(fixture).find((value) => value.path === "node.create")?.inputSchema;
  assert.equal(input?.properties?.name?.type, "string");
  assert.equal(input?.properties?.name?.minLength, 1);
  fixture.components.schemas.Name = { $ref: "#/components/schemas/Alias" };
  assert.throws(() => createWebMcpOperations(fixture), /Unsupported schema reference/);
  delete fixture.components.schemas.Name;
  assert.throws(() => createWebMcpOperations(fixture), /Missing schema/);
});

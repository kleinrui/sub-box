import { mkdir, writeFile } from "node:fs/promises";
import { generateOpenAPIDocument, type OpenAPIV3_1 } from "@trpc/openapi";
import { apiFieldDescriptions, apiOperations } from "../server/api/api-documentation";

async function main() {
  // 类型入口不导入运行时 router，避免生成文档时初始化 D1 或登录服务。
  const document = await generateOpenAPIDocument("./server/api/openapi-router.ts", {
    exportName: "ApiRouter",
    title: "Sub Box 管理 API",
    version: "1.0.0",
    servers: [{ url: "/api/trpc" }],
  });
  document.info.description = `通过 HTTP 操作 Sub Box 的节点、用户、订阅和 Clash 配置。此文档公开，不含实际业务数据。所有列出的操作均要求 Authorization: Bearer <API Token>，从本地环境变量 SUB_BOX_API_TOKEN 读取凭据，不要写入聊天、URL 或日志。只读 Token 仅允许 GET；POST 均需读写 Token，包括订阅生成和配置合并。Token 在后台「AI 与 API」页面创建和撤销。\n\n协议：这是 tRPC + SuperJSON HTTP API，不是 REST。使用非批量请求（不要加 batch=1）。GET 参数只有一个 input，其值是 URL 编码后的 JSON，例如读取用户：/user.getById?input=%7B%22json%22%3A%22USER_ID%22%7D；无参数查询直接 GET /user.getAll。POST 使用 Content-Type: application/json，请求体为 {"json":业务参数}，例如修改用户：{"json":{"id":"USER_ID","data":{"name":"新名称"}}}。成功数据位于 result.data.json；错误位于 error.json，包含 message 和 data.code。不要把 tRPC 外层包装当作业务记录。所有业务日期均为 ISO 字符串，YAML 以 JSON 字符串返回。\n\n先查询记录并使用真实 ID，再执行修改。名称、ID、配置 key 和订阅密钥不可混用。客户端关联列表替换会删除未列出的关联。不要盲目重试创建操作；网络失败后先查询确认。401 表示凭据缺失、无效、过期或撤销，403 表示权限不足，400 表示参数错误，500 表示服务或外部转换失败。返回记录可能包含订阅凭据，应仅用于管理员授权的任务。`;
  document.components ??= {};
  document.components.securitySchemes = { bearerAuth: { type: "http", scheme: "bearer", description: "在 AI 与 API 页面创建的 sb_ 开头 API Token。" } };
  document.security = [{ bearerAuth: [] }];
  const wrap = (schema: OpenAPIV3_1.SchemaObject): OpenAPIV3_1.SchemaObject => ({
    type: "object",
    properties: { json: { ...schema, description: schema.description ?? "SuperJSON 包装内的业务值，按此 schema 读取或填写。" } },
    required: ["json"],
    description: "SuperJSON 包装；业务值放在 json 字段。",
  });
  function describe(schema: OpenAPIV3_1.SchemaObject) {
    for (const [key, property] of Object.entries(schema.properties ?? {})) {
      property.description ??= apiFieldDescriptions[key];
      describe(property);
    }
    if (schema.items) describe(schema.items);
    for (const item of [...(schema.oneOf ?? []), ...(schema.anyOf ?? []), ...(schema.allOf ?? [])]) describe(item);
  }
  const paths: OpenAPIV3_1.PathsObject = {};
  for (const [name, details] of Object.entries(apiOperations)) {
    const path = document.paths?.[`/${name}`];
    if (!path) throw new Error(`Missing generated operation: ${name}`);
    const method = path.get ? "get" : "post";
    const operation = path[method];
    if (!operation) throw new Error(`Missing operation method: ${name}`);
    operation.summary = details.summary;
    operation.description = `${details.description}\n${method === "get" ? "只读或读写 Token 均可调用。" : "需要读写 Token。"}`;
    if (operation.requestBody && !("$ref" in operation.requestBody)) {
      const media = operation.requestBody.content["application/json"] as { schema?: OpenAPIV3_1.SchemaObject } | undefined;
      if (media?.schema) {
        describe(media.schema);
        media.schema = wrap(media.schema);
      }
      operation.requestBody.description = "JSON 请求体；将业务参数放在 json 字段内。";
    }
    for (const parameter of operation.parameters ?? []) {
      if ("$ref" in parameter) continue;
      delete parameter.style;
      parameter.description = "将 {json: 业务参数} JSON 序列化后做 URL 编码，作为 input 查询参数。";
      const media = parameter.content?.["application/json"] as { schema?: OpenAPIV3_1.SchemaObject } | undefined;
      if (media?.schema) {
        describe(media.schema);
        media.schema.description = details.input ?? "业务查询参数。";
        media.schema = wrap(media.schema);
      }
    }
    const response = operation.responses?.["200"];
    if (response && !("$ref" in response)) {
      response.description = "操作成功；业务结果在 result.data.json，结构如下。";
      const schema = response.content?.["application/json"]?.schema;
      if (schema && !("$ref" in schema)) {
        describe(schema);
        const result = schema.properties?.result;
        if (result?.properties?.data) result.properties.data = wrap(result.properties.data);
        if (result) result.description = "tRPC 成功响应，业务结果位于 data.json。";
      }
    }
    paths[`/${name}`] = path;
  }
  document.paths = paths;
  const error = document.components.responses?.Error;
  if (error && !("$ref" in error)) {
    error.description = "请求失败；error.json.message 为原因，error.json.data.code 为 tRPC 错误码。";
    const schema = error.content?.["application/json"]?.schema;
    if (schema && !("$ref" in schema) && schema.properties?.error) {
      const errorData = schema.properties.error.properties?.data;
      if (errorData) errorData.description = "tRPC 错误详情，包括错误码、HTTP 状态和参数校验结果。";
      schema.properties.error = wrap(schema.properties.error);
    }
    if (schema && !("$ref" in schema)) describe(schema);
  }
  // 删除未公开接口的残余组件，只发布路径实际引用的 schema。
  const used = new Set<string>();
  function collect(value: unknown) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string" && child.startsWith("#/components/schemas/")) {
        const name = child.slice("#/components/schemas/".length);
        if (!used.has(name)) {
          used.add(name);
          collect(document.components?.schemas?.[name]);
        }
      } else collect(child);
    }
  }
  collect(paths);
  collect(document.components.responses);
  for (const [name, schema] of Object.entries(document.components.schemas ?? {})) {
    if (!used.has(name)) delete document.components.schemas?.[name];
    else describe(schema);
  }
  await mkdir("public", { recursive: true });
  await writeFile("public/openapi.json", `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Generated ${Object.keys(paths).length} documented API operations.`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

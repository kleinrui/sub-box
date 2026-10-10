import type { OpenAPIV3_1 } from "@trpc/openapi";
import { apiOperations } from "@/server/api/api-documentation";

type Schema = OpenAPIV3_1.SchemaObject;
export type WebMcpOperation = {
  name: string;
  path: string;
  description: string;
  inputSchema: Schema;
  inputMode: "none" | "object" | "value";
  readOnly: boolean;
};

/** 从已生成的 OpenAPI 提取业务参数，工具调用无需了解 tRPC/SuperJSON 包装。 */
export function createWebMcpOperations(document: OpenAPIV3_1.Document): WebMcpOperation[] {
  function resolve(schema: Schema, seen = new Set<string>()): Schema {
    if (schema.$ref) {
      const prefix = "#/components/schemas/";
      if (!schema.$ref.startsWith(prefix) || seen.has(schema.$ref)) throw new Error(`Unsupported schema reference: ${schema.$ref}`);
      const target = document.components?.schemas?.[schema.$ref.slice(prefix.length)];
      if (!target) throw new Error(`Missing schema: ${schema.$ref}`);
      const { $ref, ...siblings } = schema;
      const visited = new Set([...seen, $ref]);
      return { ...resolve(target, visited), ...resolve(siblings, visited) };
    }
    const result = { ...schema };
    if (schema.properties) result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, resolve(value, seen)]));
    if (schema.items) result.items = resolve(schema.items, seen);
    for (const key of ["anyOf", "oneOf", "allOf"] as const) if (schema[key]) result[key] = schema[key].map((value) => resolve(value, seen));
    if (typeof schema.additionalProperties === "object") result.additionalProperties = resolve(schema.additionalProperties, seen);
    return result;
  }
  return Object.entries(apiOperations).map<WebMcpOperation>(([path, details]) => {
    const item = document.paths?.[`/${path}`];
    const operation = item?.get ?? item?.post;
    if (!operation) throw new Error(`Missing operation: ${path}`);
    const body = operation.requestBody;
    const parameter = operation.parameters?.find((value) => !("$ref" in value) && value.name === "input");
    const wrapped =
      body && !("$ref" in body) ? body.content["application/json"]?.schema : parameter && !("$ref" in parameter) ? parameter.content?.["application/json"]?.schema : undefined;
    const input = wrapped ? resolve(wrapped).properties?.json : undefined;
    const inputMode = !input ? "none" : input.type === "object" ? "object" : "value";
    const inputSchema: Schema =
      inputMode === "object"
        ? { ...(input as Schema), description: "直接填写业务参数，无需 tRPC 包装。" }
        : {
            type: "object",
            properties: input ? { input: { ...input, description: details.input ?? input.description } } : {},
            ...(input ? { required: ["input"] } : {}),
            additionalProperties: false,
          };
    return {
      name: `sub_box_${path.replaceAll(".", "_")}`,
      path,
      description: `${details.summary}。${details.description} 使用当前管理员会话。返回业务数据；失败时返回 isError。`,
      inputSchema,
      inputMode,
      readOnly: Boolean(item?.get),
    };
  });
}

export type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Schema;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean; consequentialHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};
export type ModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal: AbortSignal }) => void | Promise<void>;
  unregisterTool?: (name: string) => void;
};

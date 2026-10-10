import { z } from "zod";
import type { ExportData } from "@/server/services/export-service";

const timestamps = {
  createdAt: z.string(),
  updatedAt: z.string(),
};

// 与导出记录保持一致；未知字段（如 secret、API Token）不会进入导入数据。
export const exportDataSchema: z.ZodType<ExportData> = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      subscriptionKey: z.string(),
      subconverterId: z.string().nullable(),
      ...timestamps,
    })
  ),
  nodes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      host: z.string().nullable(),
      accessUrl: z.string().nullable(),
      ...timestamps,
    })
  ),
  nodeClients: z.array(
    z.object({
      id: z.string(),
      nodeId: z.string(),
      url: z.string(),
      ...timestamps,
    })
  ),
  userClientOptions: z.array(
    z.object({
      userId: z.string(),
      nodeClientId: z.string(),
      enable: z.boolean(),
      order: z.number(),
      ...timestamps,
    })
  ),
  subconverters: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      options: z.string(),
      isDefault: z.boolean(),
      ...timestamps,
    })
  ),
  clashConfigs: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      globalConfig: z.string().nullable(),
      rules: z.string().nullable(),
      ...timestamps,
    })
  ),
});

const resourceLabels = {
  users: "用户",
  nodes: "节点",
  nodeClients: "节点客户端",
  userClientOptions: "用户客户端关联",
  subconverters: "订阅转换器",
  clashConfigs: "Clash 配置",
} satisfies Record<keyof ExportData, string>;

// 预览只返回数量，避免展示订阅密钥、节点链接等敏感值。
export function getImportPreview(data: ExportData) {
  return (Object.keys(resourceLabels) as (keyof ExportData)[]).map((key) => ({
    key,
    label: resourceLabels[key],
    count: data[key].length,
  }));
}

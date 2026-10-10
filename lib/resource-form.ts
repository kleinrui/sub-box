import { z } from "zod";

export const userFormSchema = z.object({
  name: z.string().trim().min(1, "请填写用户名"),
  // 保留已有密钥原值，避免编辑其他字段时改变原有订阅链接。
  subscriptionKey: z.string().refine((value) => value.trim().length > 0, "请填写订阅密钥"),
  subconverterId: z.string().nullable().optional(),
});

export function generateSubscriptionKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export const nodeFormSchema = z.object({
  name: z.string().trim().min(1, "请填写节点名称"),
  type: z.string().min(1, "请选择节点类型"),
  host: z.string().trim().optional(),
  accessUrl: z.string().trim().refine(isHttpUrl, "请填写以 http:// 或 https:// 开头的有效地址").optional(),
});

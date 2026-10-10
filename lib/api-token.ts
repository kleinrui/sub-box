import { z } from "zod";

export const createApiTokenSchema = z.object({
  name: z.string().trim().min(1, "请输入名称").max(80, "名称不能超过 80 字"),
  permission: z.enum(["read", "write"]),
  expiresInDays: z.enum(["7", "30", "90", "365"]),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;

export async function hashApiToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateApiToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `sb_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

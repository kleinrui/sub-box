import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { type CreateApiTokenInput, generateApiToken, hashApiToken } from "@/lib/api-token";
import type { Database } from "@/server/db";
import { apiTokens } from "@/server/db/schema";

export const apiTokenService = {
  async list(database: Database) {
    return database
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        prefix: apiTokens.prefix,
        permission: apiTokens.permission,
        createdAt: apiTokens.createdAt,
        expiresAt: apiTokens.expiresAt,
        lastUsedAt: apiTokens.lastUsedAt,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .orderBy(desc(apiTokens.createdAt));
  },
  async create(database: Database, input: CreateApiTokenInput) {
    const token = generateApiToken();
    const now = new Date();
    await database.insert(apiTokens).values({
      id: crypto.randomUUID(),
      name: input.name,
      tokenHash: await hashApiToken(token),
      prefix: token.slice(0, 11),
      permission: input.permission,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + Number(input.expiresInDays) * 86400000).toISOString(),
    });
    return { token };
  },
  async revoke(database: Database, id: string) {
    await database
      .update(apiTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(and(eq(apiTokens.id, id), isNull(apiTokens.revokedAt)));
    return { success: true };
  },
  async authenticate(database: Database, authorization: string) {
    const match = /^Bearer (sb_[a-f0-9]{64})$/i.exec(authorization);
    if (!match?.[1]) throw new TRPCError({ code: "UNAUTHORIZED", message: "无效的 API Token" });
    const now = new Date().toISOString();
    const [token] = await database
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.tokenHash, await hashApiToken(match[1])), isNull(apiTokens.revokedAt), gt(apiTokens.expiresAt, now)))
      .limit(1);
    if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "API Token 无效、已过期或已撤销" });
    await database.update(apiTokens).set({ lastUsedAt: now }).where(eq(apiTokens.id, token.id));
    return { id: token.id, permission: token.permission };
  },
};

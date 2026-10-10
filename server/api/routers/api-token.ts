import { z } from "zod";
import { createApiTokenSchema } from "@/lib/api-token";
import { createTRPCRouter, sessionProcedure } from "@/server/api/trpc";
import { apiTokenService } from "@/server/services/api-token-service";

export const apiTokenRouter = createTRPCRouter({
  list: sessionProcedure.query(({ ctx }) => apiTokenService.list(ctx.db)),
  create: sessionProcedure.input(createApiTokenSchema).mutation(({ ctx, input }) => apiTokenService.create(ctx.db, input)),
  revoke: sessionProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => apiTokenService.revoke(ctx.db, input.id)),
});

import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { getUser, isAuthenticated, login, logout } from "@/server/services/authentication-service";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // 从请求头中获取 IP
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || "unknown";

      const success = await login(input.username, input.password, ip);
      if (!success) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }
      return { success };
    }),

  logout: publicProcedure.mutation(async () => {
    await logout();
    return { success: true };
  }),

  getUser: publicProcedure.query(async () => {
    return await getUser();
  }),

  isAuthenticated: publicProcedure.query(async () => {
    return await isAuthenticated();
  }),
});

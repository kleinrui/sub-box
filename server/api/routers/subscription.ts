import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { clashConfigService } from "@/server/services/clash-config-service";
import { subscriptionService } from "@/server/services/subscription-service";
import { userService } from "@/server/services/user-service";

export const subscriptionRouter = createTRPCRouter({
  generateSubscription: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        subconverterId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await subscriptionService.generateSubscription({
        userId: input.userId,
        subconverterId: input.subconverterId,
      });
    }),

  // 公共API，通过订阅密钥获取订阅内容
  getSubscriptionByKey: publicProcedure
    .input(
      z.object({
        key: z.string(),
        format: z.string().optional().default("clash"),
        configId: z.string().min(1).optional(),
        configKey: z.string().min(1).optional(),
      })
    )
    .query(async ({ input }) => {
      // 1. 查找用户
      const user = await userService.findBySubscriptionKey(input.key);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // 先确认显式指定的配置存在，不能找不到配置仍返回未合并的订阅。
      let targetConfig = null;
      if (input.configKey !== undefined) {
        targetConfig = await clashConfigService.getByKey(input.configKey);
        // 兼容已经使用数据库 ID 的订阅 URL；优先按文档约定的 Key 查询。
        targetConfig ??= await clashConfigService.get(input.configKey);
      } else if (input.configId !== undefined) {
        targetConfig = await clashConfigService.get(input.configId);
      }
      if ((input.configKey !== undefined || input.configId !== undefined) && !targetConfig) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clash config not found" });
      }

      // 2. 生成订阅内容
      const originalYaml = await subscriptionService.generateSubscription({
        userId: user.id,
        subconverterId: user.subconverterId,
      });

      // 3. 检查是否需要合并配置
      return targetConfig ? await clashConfigService.mergeConfig(originalYaml, targetConfig) : originalYaml;
    }),
});

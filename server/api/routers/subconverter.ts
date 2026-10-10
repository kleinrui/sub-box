import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { subconverterService } from "@/server/services/subconverter-service";

// Schema定义
const subconverterSchema = z.object({
  id: z.string().optional(),
  url: z.string(),
  options: z.string(),
  isDefault: z.boolean().optional(),
});

const subconverterUpdateSchema = z.object({
  url: z.string().optional(),
  options: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const subconverterRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return await subconverterService.getAll();
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ input }) => {
    return await subconverterService.get(input);
  }),

  create: protectedProcedure.input(subconverterSchema).mutation(async ({ input }) => {
    return await subconverterService.create({
      url: input.url,
      options: input.options,
      isDefault: input.isDefault ?? false,
    });
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: subconverterUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      return await subconverterService.update(input.id, input.data);
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await subconverterService.delete(input);
    return { success: true };
  }),

  // 验证subconverter URL是否有效
  verifyUrl: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    try {
      const response = await fetch(`${input}/version`);
      if (!response.ok) {
        throw new Error("验证失败");
      }
      return await response.text();
    } catch (_error) {
      throw new Error("验证失败：无法连接到服务器");
    }
  }),
});

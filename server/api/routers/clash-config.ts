import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { clashConfigService } from "@/server/services/clash-config-service";

// Schema定义
const clashConfigSchema = z.object({
  id: z.string().optional(),
  key: z.string(),
  name: z.string(),
  globalConfig: z.string().nullable().optional(),
  rules: z.string().nullable().optional(),
});

const clashConfigUpdateSchema = z.object({
  key: z.string().optional(),
  name: z.string().optional(),
  globalConfig: z.string().nullable().optional(),
  rules: z.string().nullable().optional(),
});

export const clashConfigRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return await clashConfigService.getAll();
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ input }) => {
    return await clashConfigService.get(input);
  }),

  create: protectedProcedure.input(clashConfigSchema).mutation(async ({ input }) => {
    return await clashConfigService.create({
      key: input.key,
      name: input.name,
      globalConfig: input.globalConfig || null,
      rules: input.rules || null,
    });
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: clashConfigUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      return await clashConfigService.update(input.id, input.data);
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await clashConfigService.delete(input);
    return { success: true };
  }),

  mergeConfig: protectedProcedure
    .input(
      z.object({
        baseYaml: z.string(),
        configId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const config = await clashConfigService.get(input.configId);
      if (!config) {
        throw new Error(`Config with id ${input.configId} not found`);
      }
      return await clashConfigService.mergeConfig(input.baseYaml, config);
    }),
});

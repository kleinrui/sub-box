import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { nodeClientService } from "@/server/services/node-client-service";

// Schema定义
const nodeClientSchema = z.object({
  id: z.string().optional(),
  nodeId: z.string(),
  url: z.string(),
});

const nodeClientUpdateSchema = z.object({
  nodeId: z.string().optional(),
  url: z.string().optional(),
});

const userClientOptionSchema = z.object({
  userId: z.string(),
  nodeClientId: z.string(),
  enable: z.boolean().optional(),
  order: z.number().optional(),
});

const userClientOptionUpdateSchema = z.object({
  enable: z.boolean().optional(),
  order: z.number().optional(),
});

export const nodeClientRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return await nodeClientService.getAll();
  }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await nodeClientService.get(input);
    }),

  create: protectedProcedure
    .input(nodeClientSchema)
    .mutation(async ({ input }) => {
      return await nodeClientService.create({
        nodeId: input.nodeId,
        url: input.url,
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: nodeClientUpdateSchema,
    }))
    .mutation(async ({ input }) => {
      return await nodeClientService.update(input.id, input.data);
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      await nodeClientService.delete(input);
      return { success: true };
    }),

  getUserClientOptions: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await nodeClientService.getUserClientOptions(input);
    }),

  setUserClientOptions: protectedProcedure
    .input(z.object({
      nodeClientId: z.string(),
      userIds: z.array(z.string()),
      defaultOptions: z.object({
        enable: z.boolean().optional(),
        order: z.number().optional(),
      }).optional(),
      replace: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      await nodeClientService.setUserClientOptions(
        input.nodeClientId,
        input.userIds,
        input.defaultOptions,
        input.replace ?? false
      );
      return { success: true };
    }),

  updateUserClientOption: protectedProcedure
    .input(z.object({
      nodeClientId: z.string(),
      userId: z.string(),
      data: userClientOptionUpdateSchema,
    }))
    .mutation(async ({ input }) => {
      return await nodeClientService.updateUserClientOption(
        input.nodeClientId,
        input.userId,
        input.data
      );
    }),
  
  getNodeClientsWithUsers: protectedProcedure
    .query(async () => {
      return await nodeClientService.getNodeClientsWithUsers();
    }),

  getByUserId: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await nodeClientService.getByUserId(input);
    }),
}); 
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { nodeClientService } from "@/server/services/node-client-service";
import { nodeService } from "@/server/services/node-service";

// Schema定义
const nodeSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.string().default("custom"),
  host: z.string().optional().nullable(),
  accessUrl: z.string().optional().nullable(),
});

const nodeUpdateSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  host: z.string().optional().nullable(),
  accessUrl: z.string().optional().nullable(),
});

export const nodeRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return await nodeService.getAll();
  }),

  getAllWithClients: protectedProcedure.query(async () => {
    const nodes = await nodeService.getAll();
    const clients = await nodeClientService.getNodeClientsWithUsers();

    // Group clients by node id
    const clientsByNode = clients.reduce(
      (acc, client) => {
        const nodeId = client.nodeId;
        if (!acc[nodeId]) {
          acc[nodeId] = [];
        }
        acc[nodeId].push(client);
        return acc;
      },
      {} as Record<string, typeof clients>
    );

    return nodes.map((node) => ({
      ...node,
      items: clientsByNode[node.id] || [],
    }));
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ input }) => {
    return await nodeService.get(input);
  }),

  create: protectedProcedure.input(nodeSchema).mutation(async ({ input }) => {
    return await nodeService.create({
      name: input.name,
      type: input.type,
      host: input.host || null,
      accessUrl: input.accessUrl || null,
    });
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: nodeUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      return await nodeService.update(input.id, input.data);
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await nodeService.delete(input);
    return { success: true };
  }),
});

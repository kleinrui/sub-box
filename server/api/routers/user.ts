import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { userService } from "@/server/services/user-service";

// Schema定义
const userSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  subscriptionKey: z.string(),
  subconverterId: z.string().nullable().optional(),
});

const userUpdateSchema = z.object({
  name: z.string().optional(),
  subscriptionKey: z.string().optional(),
  subconverterId: z.string().nullable().optional(),
});

export const userRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return await userService.getAll();
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ input }) => {
    return await userService.get(input);
  }),

  create: protectedProcedure.input(userSchema).mutation(async ({ input }) => {
    return await userService.create({
      name: input.name,
      subscriptionKey: input.subscriptionKey,
      subconverterId: input.subconverterId || null,
    });
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: userUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      return await userService.update(input.id, input.data);
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await userService.delete(input);
    return { success: true };
  }),

  findBySubscriptionKey: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await userService.findBySubscriptionKey(input);
  }),
});

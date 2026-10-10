import { z } from "zod";
import { exportDataSchema } from "@/lib/export-data";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { exportService } from "@/server/services/export-service";

export const exportRouter = createTRPCRouter({
  exportAll: protectedProcedure.query(async () => {
    return await exportService.exportAll();
  }),

  importAll: protectedProcedure
    .input(
      z.object({
        data: exportDataSchema,
        options: z
          .object({
            skipExisting: z.boolean().default(true),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      await exportService.importAll(input.data, input.options || { skipExisting: true });
      return { success: true };
    }),
});

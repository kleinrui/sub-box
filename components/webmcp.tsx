"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createTRPCUntypedClient, httpLink, TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import superjson from "superjson";
import { createWebMcpOperations, type ModelContext } from "@/lib/webmcp";

export function WebMcp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refresh = useEffectEvent(() => {
    router.refresh();
    void queryClient.invalidateQueries();
  });
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext ?? (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool || window.top !== window) return;
    const controller = new AbortController();
    const registered: string[] = [];
    let disposed = false;
    const client = createTRPCUntypedClient({ links: [httpLink({ url: "/api/trpc", transformer: superjson })] });
    function cleanup() {
      for (const name of registered.splice(0)) context?.unregisterTool?.(name);
    }
    async function register() {
      const response = await fetch("/api/openapi.json", { signal: controller.signal });
      if (!response.ok) throw new Error("无法读取 WebMCP 操作定义");
      const operations = createWebMcpOperations(await response.json());
      for (const operation of operations) {
        if (disposed) return;
        await context?.registerTool(
          {
            name: operation.name,
            description: operation.description,
            inputSchema: operation.inputSchema,
            annotations: { readOnlyHint: operation.readOnly, untrustedContentHint: true, consequentialHint: !operation.readOnly },
            execute: async (args) => {
              if (disposed) throw new Error("页面已关闭，请重新打开管理页面。");
              const input = operation.inputMode === "none" ? undefined : operation.inputMode === "value" ? args.input : args;
              try {
                const result = await client[operation.readOnly ? "query" : "mutation"](operation.path, input);
                if (!operation.readOnly) {
                  refresh();
                }
                return { content: [{ type: "text", text: JSON.stringify(result ?? null) }] };
              } catch (error) {
                if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
                  disposed = true;
                  controller.abort();
                  cleanup();
                  refresh();
                }
                return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "操作失败" }] };
              }
            },
          },
          { signal: controller.signal }
        );
        registered.push(operation.name);
        if (disposed) cleanup();
      }
    }
    void register().catch((error) => {
      controller.abort();
      cleanup();
      if (!disposed) console.error("WebMCP 注册失败", error);
    });
    return () => {
      disposed = true;
      controller.abort();
      cleanup();
    };
  }, []);
  return null;
}

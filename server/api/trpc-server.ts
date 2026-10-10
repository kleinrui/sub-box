import "server-only";

import { QueryClient } from "@tanstack/react-query";
import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";

import { type AppRouter, createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

/**
 * 创建React Server Components的tRPC上下文
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

/**
 * 创建QueryClient
 */
const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
        },
      },
    })
);

/**
 * 创建tRPC调用器
 */
const caller = createCaller(createContext);

// 创建RSC水合助手
export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(caller, getQueryClient);

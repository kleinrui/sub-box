import { authRouter } from "@/server/api/routers/auth";
import { clashConfigRouter } from "@/server/api/routers/clash-config";
import { exportRouter } from "@/server/api/routers/export";
import { nodeRouter } from "@/server/api/routers/node";
import { nodeClientRouter } from "@/server/api/routers/node-client";
import { subconverterRouter } from "@/server/api/routers/subconverter";
import { subscriptionRouter } from "@/server/api/routers/subscription";
// 导入子路由器
import { userRouter } from "@/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * 这是主要的路由器实例，包含所有的API路由器
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  node: nodeRouter,
  nodeClient: nodeClientRouter,
  subconverter: subconverterRouter,
  clashConfig: clashConfigRouter,
  subscription: subscriptionRouter,
  auth: authRouter,
  export: exportRouter,
});

// 导出路由器类型
export type AppRouter = typeof appRouter;

// 导出调用工厂，用于服务器端调用
export const createCaller = createCallerFactory(appRouter);

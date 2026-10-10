import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";
import { createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const url = new URL(request.url);
    const configKey = url.searchParams.get("config");
    const headers = new Headers(request.headers);

    // 创建TRPC上下文和调用器
    const context = await createTRPCContext({ headers });
    const caller = createCaller(context);

    // 使用TRPC调用获取订阅内容
    const yaml = await caller.subscription.getSubscriptionByKey({
      key,
      configKey: configKey ?? undefined,
    });

    // 返回最终的YAML
    return new NextResponse(yaml, {
      headers: {
        "Content-Type": "text/yaml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Subscription generation failed:", error);
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: error instanceof TRPCError ? (error.code === "NOT_FOUND" ? 404 : error.code === "BAD_REQUEST" ? 400 : 500) : 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
}

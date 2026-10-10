"use client";

import { useEffect, useReducer, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { emptySubconverterVerification, type SubconverterVerification, subconverterVerificationReducer } from "@/lib/subconverter-verification";
import { api } from "@/utils/api";

export function useSubconverterVerification(url: string) {
  const [state, dispatch] = useReducer(subconverterVerificationReducer, url, emptySubconverterVerification);
  const sequence = useRef(0);
  const running = useRef(false);
  const latestUrl = useRef(url);
  latestUrl.current = url;
  const mutation = api.subconverter.verifyUrl.useMutation();

  useEffect(() => {
    sequence.current += 1;
    running.current = false;
    dispatch({ type: "change", url, requestId: sequence.current });
    return () => {
      sequence.current += 1;
      running.current = false;
    };
  }, [url]);

  async function verify() {
    if (running.current) return;
    running.current = true;
    const requestedUrl = latestUrl.current;
    const requestId = ++sequence.current;
    dispatch({ type: "start", url: requestedUrl, requestId });
    try {
      const version = await mutation.mutateAsync(requestedUrl.trim());
      if (requestId === sequence.current && requestedUrl === latestUrl.current) {
        dispatch({ type: "finish", url: requestedUrl, requestId, status: "success", message: version.trim() || "服务已响应" });
      }
    } catch {
      if (requestId === sequence.current && requestedUrl === latestUrl.current) {
        dispatch({ type: "finish", url: requestedUrl, requestId, status: "error", message: "无法连接转换器，请检查地址后重试。" });
      }
    } finally {
      if (requestId === sequence.current) running.current = false;
    }
  }

  // 在地址变化的这一帧就隐藏旧结果，不等待 effect 清理。
  const result = state.url === url ? state : emptySubconverterVerification(url);
  return { result, verify, isPending: result.status === "pending" };
}

export function SubconverterVerificationResult({ result }: { result: SubconverterVerification }) {
  if (result.status === "idle") return null;
  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-start gap-2 text-xs">
      <Badge variant={result.status === "success" ? "success" : result.status === "error" ? "destructive" : "secondary"}>
        {result.status === "success" ? "验证成功" : result.status === "error" ? "验证失败" : "验证中..."}
      </Badge>
      {result.message && <p className="max-h-20 max-w-md overflow-auto break-all whitespace-pre-wrap leading-5 text-muted-foreground">{result.message}</p>}
    </div>
  );
}

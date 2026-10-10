export interface SubconverterVerification {
  url: string;
  requestId: number;
  status: "idle" | "pending" | "success" | "error";
  message: string;
}

type VerificationAction =
  | { type: "change"; url: string; requestId: number }
  | { type: "start"; url: string; requestId: number }
  | { type: "finish"; url: string; requestId: number; status: "success" | "error"; message: string };

export function emptySubconverterVerification(url: string, requestId = 0): SubconverterVerification {
  return { url, requestId, status: "idle", message: "" };
}

export function subconverterVerificationReducer(state: SubconverterVerification, action: VerificationAction): SubconverterVerification {
  if (action.type === "change") return emptySubconverterVerification(action.url, action.requestId);
  if (action.type === "start") {
    if (action.url !== state.url) return state;
    return { ...state, requestId: action.requestId, status: "pending", message: "" };
  }
  // 地址改动后即使又改回原值，旧请求也不能恢复过期的验证结果。
  if (state.status !== "pending" || action.url !== state.url || action.requestId !== state.requestId) return state;
  return { ...state, status: action.status, message: action.message };
}

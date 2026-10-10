"use client";

import { type AnyApiReferenceConfiguration, ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function ScalarReference() {
  const router = useRouter();
  const configuration = useMemo<AnyApiReferenceConfiguration>(
    () => ({
      url: "/api/openapi.json",
      proxyUrl: "",
      persistAuth: false,
      telemetry: false,
      withDefaultFonts: false,
      agent: { disabled: true },
      mcp: { disabled: true },
      showDeveloperTools: "never",
      hideClientButton: true,
      authentication: { preferredSecurityScheme: "bearerAuth" },
      customFetch: async (input, init) => {
        // 测试 API Token 自身的权限，不借用管理员的登录 Cookie。
        const response = await fetch(input, { ...init, credentials: "omit" });
        const method = init?.method ?? (input instanceof Request ? input.method : "GET");
        if (method.toUpperCase() === "POST" && response.ok) router.refresh();
        return response;
      },
    }),
    [router]
  );
  return <ApiReferenceReact configuration={configuration} />;
}

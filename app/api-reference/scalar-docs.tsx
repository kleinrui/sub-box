"use client";

import dynamic from "next/dynamic";

// Scalar 的 React 组件包装了 Vue，只在浏览器加载。
export const ScalarDocs = dynamic(() => import("./scalar-reference"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted-foreground">正在加载 API 文档…</p>,
});

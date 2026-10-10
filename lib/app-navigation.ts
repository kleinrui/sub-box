export const appRouteLabels: Record<string, string> = {
  "/": "首页",
  "/users": "用户管理",
  "/nodes": "节点管理",
  "/subconverters": "订阅转换器",
  "/clash-configs": "Clash 配置",
  "/ai-api": "AI 与 API",
  "/export": "导入导出",
  "/api-reference": "API 文档",
};

export function isAppNavActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) || (href === "/ai-api" && pathname === "/api-reference");
}

export interface AppBreadcrumbItem {
  label: string;
  href?: string;
}

export function getAppBreadcrumbs(pathname: string, searchParams: URLSearchParams, detailName?: string): AppBreadcrumbItem[] {
  if (pathname === "/") return [{ label: appRouteLabels["/"] ?? "首页" }];
  const items: AppBreadcrumbItem[] = [{ label: "首页", href: "/" }];
  if (pathname === "/api-reference") {
    return [...items, { label: "AI 与 API", href: "/ai-api" }, { label: "API 文档" }];
  }
  const label = appRouteLabels[pathname] ?? "Sub Box";
  const detailParam = pathname === "/users" ? "user" : pathname === "/nodes" ? "node" : undefined;
  if (detailParam && searchParams.get(detailParam)) {
    const params = new URLSearchParams(searchParams);
    params.delete(detailParam);
    items.push({ label, href: `${pathname}${params.size ? `?${params}` : ""}` });
    items.push({ label: detailName || (detailParam === "user" ? "用户详情" : "节点详情") });
  } else {
    items.push({ label });
  }
  return items;
}

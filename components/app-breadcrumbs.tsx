"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { getAppBreadcrumbs } from "@/lib/app-navigation";
import { api } from "@/utils/api";

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = pathname === "/users" ? searchParams.get("user") : null;
  const nodeId = pathname === "/nodes" ? searchParams.get("node") : null;
  const userQuery = api.user.getById.useQuery(userId ?? "", { enabled: Boolean(userId) });
  const nodeQuery = api.node.getById.useQuery(nodeId ?? "", { enabled: Boolean(nodeId) });
  const items = getAppBreadcrumbs(pathname, new URLSearchParams(searchParams.toString()), userId ? userQuery.data?.name : nodeId ? nodeQuery.data?.name : undefined);

  return (
    <Breadcrumb aria-label="当前位置" className="min-w-0 flex-1">
      <BreadcrumbList className="flex-nowrap overflow-hidden whitespace-nowrap">
        {items.map((item, index) => (
          <Fragment key={item.href ?? "current"}>
            {index > 0 && <BreadcrumbSeparator className={index === 1 ? "hidden shrink-0 sm:block" : "shrink-0"} />}
            <BreadcrumbItem className={index === 0 && items.length > 1 ? "hidden shrink-0 sm:inline-flex" : "min-w-0"}>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="max-w-[9rem] truncate sm:max-w-xs" title={item.label}>
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

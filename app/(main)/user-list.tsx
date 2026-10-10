"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HomepageUserSummary } from "@/lib/homepage-data";
import { getSubscriptionUrl } from "@/lib/subscription-url";

export interface HomepageSubscriptionUser extends HomepageUserSummary {
  subscriptionKey: string;
}

interface UserListProps {
  users: HomepageSubscriptionUser[];
}

const INITIAL_USER_COUNT = 8;

export function UserList({ users }: UserListProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_USER_COUNT);
  const query = search.trim().toLocaleLowerCase();
  const matchedUsers = users.filter((user) => `${user.name} ${user.subconverterUrl ?? ""}`.toLocaleLowerCase().includes(query));
  const visibleUsers = matchedUsers.slice(0, visibleCount);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full min-w-0 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(INITIAL_USER_COUNT);
            }}
            placeholder="搜索用户名称或转换器 URL"
            aria-label="搜索用户名称或转换器 URL"
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground" role="status">
          {query ? `找到 ${matchedUsers.length} 位用户` : `共 ${users.length} 位用户`}
        </span>
      </div>

      {visibleUsers.length ? (
        <ul className="min-w-0 divide-y rounded-lg border">
          {visibleUsers.map((user) => (
            <li key={user.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1 basis-40 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/users?user=${encodeURIComponent(user.id)}`} className="min-w-0 font-medium text-primary break-words underline-offset-4 hover:underline">
                    {user.name}
                  </Link>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    启用 {user.enabledClientCount} / 共 {user.totalClientCount} 个客户端
                  </span>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="min-w-0 break-all">{user.subconverterUrl ?? "未配置转换器"}</span>
                  {user.subconverterIsDefault && <Badge variant="secondary">默认</Badge>}
                </div>
              </div>
              <CopyButton value={getSubscriptionUrl(baseUrl, user.subscriptionKey)} label="复制订阅" disabled={!baseUrl} className="shrink-0" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">{users.length ? "没有匹配的用户" : "暂无用户"}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{users.length ? "尝试其他名称或转换器地址。" : "添加用户并关联客户端后，可在这里快速复制订阅链接。"}</p>
          {query && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearch("")}>
              清空搜索
            </Button>
          )}
        </div>
      )}
      {matchedUsers.length > visibleUsers.length && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            已显示 {visibleUsers.length} / {matchedUsers.length} 位用户
          </span>
          <Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => count + INITIAL_USER_COUNT)}>
            显示更多
          </Button>
        </div>
      )}
    </div>
  );
}

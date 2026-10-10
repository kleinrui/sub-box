"use client";

import { ArrowLeft, Edit2, MoreHorizontal, Trash2 } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { DateTime } from "@/components/date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getSubscriptionUrl } from "@/lib/subscription-url";
import type { Node, NodeClient, User } from "@/types";
import type { UserListItem } from "./columns";
import { UserNodeClientTable } from "./user-node-client-table";

type ClientWithUsers = NodeClient & { users: { userId: string; enable: boolean; order: number }[] };

interface UserDetailProps {
  user: UserListItem;
  users: User[];
  items: ClientWithUsers[];
  nodes: Node[];
  nodesLoading: boolean;
  clientsError?: string;
  nodesError?: string;
  baseUrl: string;
  onBack: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onRetryClients: () => void;
  onRetryNodes: () => void;
  isPending?: boolean;
}

export function UserDetail({
  user,
  users,
  items,
  nodes,
  nodesLoading,
  clientsError,
  nodesError,
  baseUrl,
  onBack,
  onEdit,
  onDelete,
  onRetryClients,
  onRetryNodes,
  isPending,
}: UserDetailProps) {
  const subscriptionUrl = baseUrl ? getSubscriptionUrl(baseUrl, user.subscriptionKey) : "";

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="px-0" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-semibold break-words">{user.name}</h2>
          <p className="text-sm text-muted-foreground">管理此用户的客户端、订阅链接和基本信息。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(user)} disabled={isPending}>
            <Edit2 className="mr-2 h-4 w-4" />
            编辑用户
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isPending} aria-label="更多用户操作">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(user)}>
                <Trash2 />
                删除用户
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="user-subscription-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="user-subscription-title" className="font-semibold">
            订阅链接
          </h3>
          <CopyButton value={subscriptionUrl} label="复制订阅" disabled={!subscriptionUrl} variant="outline" />
        </div>
        {subscriptionUrl ? (
          <p className="rounded-md border bg-muted/30 p-3 text-sm font-mono break-all">{subscriptionUrl}</p>
        ) : (
          <p className="text-sm text-muted-foreground">正在准备订阅链接...</p>
        )}
        {user.clientsStatus === "ready" && user.enabledClientCount === 0 && (
          <p className="text-sm text-muted-foreground">当前没有启用的客户端。请添加或关联客户端并启用，再使用订阅链接。</p>
        )}
        {!user.subconverterUrl && <p className="text-sm text-muted-foreground">尚未配置可用的订阅转换器，请在基本信息中选择转换器，或在订阅转换器页面设置默认转换器。</p>}
      </section>

      <section className="space-y-3" aria-labelledby="user-clients-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="user-clients-title" className="font-semibold">
            客户端
          </h3>
          {user.clientsStatus === "ready" && (
            <span className="text-sm text-muted-foreground">
              启用 {user.enabledClientCount} / 共 {user.totalClientCount} 个
            </span>
          )}
        </div>
        {user.clientsStatus === "error" ? (
          <div role="alert" className="space-y-2 rounded-md border p-4">
            <p className="text-sm text-destructive">客户端加载失败：{clientsError}</p>
            <Button variant="outline" size="sm" onClick={onRetryClients}>
              重试
            </Button>
          </div>
        ) : user.clientsStatus === "loading" ? (
          <p role="status" className="text-sm text-muted-foreground">
            正在加载客户端...
          </p>
        ) : nodesError ? (
          <div role="alert" className="space-y-2 rounded-md border p-4">
            <p className="text-sm text-destructive">节点加载失败：{nodesError}</p>
            <Button variant="outline" size="sm" onClick={onRetryNodes}>
              重试
            </Button>
          </div>
        ) : nodesLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            正在加载节点...
          </p>
        ) : (
          <UserNodeClientTable userId={user.id} items={items} nodes={nodes} users={users} />
        )}
      </section>

      <section className="space-y-3 border-t pt-5" aria-labelledby="user-information-title">
        <h3 id="user-information-title" className="font-semibold">
          基本信息
        </h3>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-muted-foreground">名称</dt>
            <dd className="break-words">{user.name}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="break-all font-mono">{user.id}</dd>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <dt className="text-muted-foreground">订阅转换器</dt>
            <dd className="flex flex-wrap items-center gap-2 break-all">
              {user.subconverterUrl ?? "未配置转换器"}
              {user.subconverterIsDefault && <Badge variant="secondary">默认</Badge>}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">创建时间</dt>
            <dd>
              <DateTime date={user.createdAt} />
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">更新时间</dt>
            <dd>
              <DateTime date={user.updatedAt} />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

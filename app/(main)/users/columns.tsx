"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getSubscriptionUrl } from "@/lib/subscription-url";
import type { User } from "@/types";

export interface UserListItem extends User {
  enabledClientCount: number | null;
  totalClientCount: number | null;
  clientsStatus: "loading" | "error" | "ready";
  subconverterUrl: string | null;
  subconverterIsDefault: boolean;
}

interface CreateColumnsOptions {
  baseUrl: string;
  getUserHref: (user: User) => string;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  isPending?: boolean;
}

export function createColumns({ baseUrl, getUserHref, onEdit, onDelete, isPending }: CreateColumnsOptions): ColumnDef<UserListItem>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
      cell: ({ row }) => (
        <Link href={getUserHref(row.original)} scroll={false} className="font-medium text-primary underline-offset-4 hover:underline break-words">
          {row.original.name}
        </Link>
      ),
      meta: { title: "名称" },
      enableHiding: false,
    },
    {
      id: "clients",
      accessorFn: (user) => user.enabledClientCount,
      header: ({ column }) => <DataTableColumnHeader column={column} title="启用 / 总客户端" />,
      cell: ({ row }) =>
        row.original.clientsStatus === "ready" ? (
          <span className="tabular-nums">
            {row.original.enabledClientCount} / {row.original.totalClientCount}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{row.original.clientsStatus === "error" ? "加载失败" : "加载中..."}</span>
        ),
      meta: { title: "启用 / 总客户端" },
    },
    {
      id: "subconverter",
      accessorFn: (user) => user.subconverterUrl,
      header: ({ column }) => <DataTableColumnHeader column={column} title="订阅转换器" />,
      cell: ({ row }) =>
        row.original.subconverterUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-[24rem] break-all text-sm">{row.original.subconverterUrl}</span>
            {row.original.subconverterIsDefault && <Badge variant="secondary">默认</Badge>}
          </div>
        ) : (
          <span className="text-muted-foreground">未配置转换器</span>
        ),
      meta: { title: "订阅转换器" },
    },
    {
      id: "subscription",
      header: "订阅链接",
      cell: ({ row }) => <CopyButton value={baseUrl ? getSubscriptionUrl(baseUrl, row.original.subscriptionKey) : ""} label="复制订阅" disabled={!baseUrl} variant="outline" />,
      meta: { title: "订阅链接" },
      enableSorting: false,
    },
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => <IdBadge id={row.original.id} />,
      meta: { title: "ID" },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />,
      cell: ({ row }) => <DateTime date={row.original.createdAt} />,
      meta: { title: "创建时间" },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="更新时间" />,
      cell: ({ row }) => <DateTime date={row.original.updatedAt} />,
      meta: { title: "更新时间" },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isPending} aria-label={`更多操作：${row.original.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={getUserHref(row.original)} scroll={false}>
                查看详情
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(row.original)}>
              <Edit2 />
              编辑用户
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(row.original)}>
              <Trash2 />
              删除用户
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      meta: { title: "操作" },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Node, NodeClient } from "@/types";

export interface NodeWithItems extends Node {
  items: (NodeClient & { users: { userId: string; enable: boolean; order: number }[] })[];
}

export const nodeTypeLabels: Record<string, string> = {
  "3x-ui": "3X-UI",
  "external-subscription": "外部订阅",
  custom: "自定义",
};

export function getNodeTypeLabel(type: string) {
  return nodeTypeLabels[type] ?? type;
}

export function getNodeUserCount(node: NodeWithItems) {
  return new Set(node.items.flatMap((client) => client.users.map((option) => option.userId))).size;
}

interface NodeActionsProps {
  node: NodeWithItems;
  onEdit: (node: NodeWithItems) => void;
  onDelete: (node: NodeWithItems) => void;
}

function NodeActions({ node, onEdit, onDelete }: NodeActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => onEdit(node)}>
        <Edit2 className="h-4 w-4" />
        <span className="sr-only">编辑</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`节点 ${node.name} 的更多操作`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(node)}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除节点
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface CreateColumnsOptions {
  onEdit: (node: NodeWithItems) => void;
  onDelete: (node: NodeWithItems) => void;
  getDetailHref: (node: NodeWithItems) => string;
}

export function createColumns({ onEdit, onDelete, getDetailHref }: CreateColumnsOptions): ColumnDef<NodeWithItems, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
      cell: ({ row }) => (
        <Link
          href={getDetailHref(row.original)}
          className="block min-w-[7rem] max-w-64 break-words font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {row.original.name}
        </Link>
      ),
      enableHiding: false,
      meta: {
        title: "名称",
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{getNodeTypeLabel(row.original.type)}</span>,
      meta: {
        title: "类型",
      },
    },
    {
      accessorKey: "host",
      header: ({ column }) => <DataTableColumnHeader column={column} title="主机" />,
      cell: ({ row }) => <span className="block max-w-56 break-all text-muted-foreground">{row.original.host || "未设置"}</span>,
      meta: {
        title: "主机",
      },
    },
    {
      id: "clientCount",
      accessorFn: (node) => node.items.length,
      header: ({ column }) => <DataTableColumnHeader column={column} title="客户端" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.items.length}</span>,
      meta: { title: "客户端数量" },
    },
    {
      id: "userCount",
      accessorFn: getNodeUserCount,
      header: ({ column }) => <DataTableColumnHeader column={column} title="关联用户" />,
      cell: ({ row }) => <span className="tabular-nums">{getNodeUserCount(row.original)}</span>,
      meta: { title: "关联用户人数" },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => <NodeActions node={row.original} onEdit={onEdit} onDelete={onDelete} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => <IdBadge id={row.original.id} />,
      meta: { title: "ID" },
    },
    {
      accessorKey: "accessUrl",
      header: ({ column }) => <DataTableColumnHeader column={column} title="访问URL" />,
      cell: ({ row }) => <span className="block max-w-64 break-all text-muted-foreground">{row.original.accessUrl || "未设置"}</span>,
      meta: {
        title: "访问URL",
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />,
      cell: ({ row }) => <DateTime date={row.original.createdAt} />,
      meta: {
        title: "创建时间",
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="更新时间" />,
      cell: ({ row }) => <DateTime date={row.original.updatedAt} />,
      meta: {
        title: "更新时间",
      },
    },
  ];
}

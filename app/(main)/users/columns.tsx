"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Trash2 } from "lucide-react";

import { CollapseDisplay } from "@/components/collapse-display";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

interface UserActionsProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

function UserActions({ user, onEdit, onDelete }: UserActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => onEdit(user)}>
        <Edit2 className="h-4 w-4" />
        <span className="sr-only">编辑</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(user)}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">删除</span>
      </Button>
    </div>
  );
}

interface CreateColumnsOptions {
  baseUrl: string;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function createColumns({ baseUrl, onEdit, onDelete }: CreateColumnsOptions): ColumnDef<User>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => <IdBadge id={row.original.id} />,
      meta: {
        title: "ID",
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
      meta: {
        title: "名称",
      },
    },
    {
      accessorKey: "subscriptionKey",
      header: ({ column }) => <DataTableColumnHeader column={column} title="订阅链接" />,
      cell: ({ row }) => baseUrl && <CollapseDisplay url={`${baseUrl}/sub/${row.original.subscriptionKey}`} />,
      meta: {
        title: "订阅链接",
      },
    },
    {
      accessorKey: "subconverterId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="订阅转换器" />,
      cell: ({ row }) => (row.original.subconverterId ? <IdBadge id={row.original.subconverterId} /> : "-"),
      meta: {
        title: "订阅转换器",
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
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => <UserActions user={row.original} onEdit={onEdit} onDelete={onDelete} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
    },
  ];
}

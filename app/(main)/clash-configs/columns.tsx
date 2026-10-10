"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ClashConfig } from "@/types";

interface ClashConfigActionsProps {
  config: ClashConfig;
  onEdit: (config: ClashConfig) => void;
  onDelete: (config: ClashConfig) => void;
  isPending?: boolean;
}

function ClashConfigActions({ config, onEdit, onDelete, isPending }: ClashConfigActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => onEdit(config)} disabled={isPending}>
        <Edit2 className="h-4 w-4" />
        编辑
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending} aria-label={`更多操作：${config.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(config)}>
            <Trash2 className="h-4 w-4" />
            删除配置
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface CreateColumnsOptions {
  onEdit: (config: ClashConfig) => void;
  onDelete: (config: ClashConfig) => void;
  isPending?: boolean;
}

export function createColumns({ onEdit, onDelete, isPending }: CreateColumnsOptions): ColumnDef<ClashConfig, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
      cell: ({ row }) => <span className="block max-w-xs break-words font-medium">{row.original.name}</span>,
      meta: {
        title: "名称",
      },
      enableHiding: false,
    },
    {
      accessorKey: "key",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Key" />,
      cell: ({ row }) => <code className="block max-w-56 break-all text-xs select-all">{row.original.key}</code>,
      meta: {
        title: "Key",
      },
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
      meta: {
        title: "更新时间",
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => <ClashConfigActions config={row.original} onEdit={onEdit} onDelete={onDelete} isPending={isPending} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Trash2 } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Button } from "@/components/ui/button";
import type { ClashConfig } from "@/types";

interface ClashConfigActionsProps {
  config: ClashConfig;
  onEdit: (config: ClashConfig) => void;
  onDelete: (config: ClashConfig) => void;
}

function ClashConfigActions({ config, onEdit, onDelete }: ClashConfigActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => onEdit(config)}>
        <Edit2 className="h-4 w-4" />
        <span className="sr-only">编辑</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(config)}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">删除</span>
      </Button>
    </div>
  );
}

interface CreateColumnsOptions {
  onEdit: (config: ClashConfig) => void;
  onDelete: (config: ClashConfig) => void;
}

export function createColumns({ onEdit, onDelete }: CreateColumnsOptions): ColumnDef<ClashConfig, unknown>[] {
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
      cell: ({ row }) => <ClashConfigActions config={row.original} onEdit={onEdit} onDelete={onDelete} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
    },
  ];
}

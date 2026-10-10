"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Trash2 } from "lucide-react";

import { CollapseDisplay } from "@/components/collapse-display";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Button } from "@/components/ui/button";
import type { Subconverter } from "@/types";

interface SubconverterActionsProps {
  subconverter: Subconverter;
  onEdit: (subconverter: Subconverter) => void;
  onDelete: (subconverter: Subconverter) => void;
}

function SubconverterActions({ subconverter, onEdit, onDelete }: SubconverterActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => onEdit(subconverter)}>
        <Edit2 className="h-4 w-4" />
        <span className="sr-only">编辑</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(subconverter)}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">删除</span>
      </Button>
    </div>
  );
}

interface CreateColumnsOptions {
  onEdit: (subconverter: Subconverter) => void;
  onDelete: (subconverter: Subconverter) => void;
}

export function createColumns({ onEdit, onDelete }: CreateColumnsOptions): ColumnDef<Subconverter, unknown>[] {
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
      accessorKey: "url",
      header: ({ column }) => <DataTableColumnHeader column={column} title="URL" />,
      meta: {
        title: "URL",
      },
    },
    {
      accessorKey: "options",
      header: ({ column }) => <DataTableColumnHeader column={column} title="选项" />,
      cell: ({ row }) => <CollapseDisplay url={row.original.options} maxLength={50} />,
      meta: {
        title: "选项",
      },
    },
    {
      accessorKey: "isDefault",
      header: ({ column }) => <DataTableColumnHeader column={column} title="默认" />,
      cell: ({ row }) => (row.original.isDefault ? "是" : "否"),
      meta: {
        title: "默认",
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
      cell: ({ row }) => <SubconverterActions subconverter={row.original} onEdit={onEdit} onDelete={onDelete} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
    },
  ];
}

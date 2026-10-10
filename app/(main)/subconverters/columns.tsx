"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";

import { CollapseDisplay } from "@/components/collapse-display";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Subconverter } from "@/types";
import { SubconverterVerificationResult, useSubconverterVerification } from "./subconverter-verification";

interface SubconverterActionsProps {
  subconverter: Subconverter;
  onEdit: (subconverter: Subconverter) => void;
  onDelete: (subconverter: Subconverter) => void;
  isPending?: boolean;
}

function SubconverterActions({ subconverter, onEdit, onDelete, isPending }: SubconverterActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => onEdit(subconverter)} disabled={isPending}>
        <Edit2 className="h-4 w-4" />
        编辑
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending} aria-label={`更多操作：${subconverter.url}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(subconverter)}>
            <Trash2 className="h-4 w-4" />
            删除转换器
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SubconverterUrl({ url }: { url: string }) {
  const verification = useSubconverterVerification(url);
  return (
    <div className="min-w-[12rem] max-w-xl space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 max-w-md break-all font-medium">{url}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void verification.verify()} disabled={verification.isPending}>
          {verification.isPending ? "验证中..." : "验证连接"}
        </Button>
      </div>
      <SubconverterVerificationResult result={verification.result} />
    </div>
  );
}

interface CreateColumnsOptions {
  onEdit: (subconverter: Subconverter) => void;
  onDelete: (subconverter: Subconverter) => void;
  isPending?: boolean;
}

export function createColumns({ onEdit, onDelete, isPending }: CreateColumnsOptions): ColumnDef<Subconverter, unknown>[] {
  return [
    {
      accessorKey: "url",
      header: ({ column }) => <DataTableColumnHeader column={column} title="转换器地址" />,
      cell: ({ row }) => <SubconverterUrl url={row.original.url} />,
      meta: {
        title: "转换器地址",
      },
      enableHiding: false,
    },
    {
      accessorKey: "isDefault",
      header: ({ column }) => <DataTableColumnHeader column={column} title="默认" />,
      cell: ({ row }) => (row.original.isDefault ? <Badge variant="secondary">默认</Badge> : <span className="text-muted-foreground">—</span>),
      meta: { title: "默认" },
    },
    {
      accessorKey: "options",
      header: ({ column }) => <DataTableColumnHeader column={column} title="转换参数" />,
      cell: ({ row }) => <CollapseDisplay url={row.original.options} maxLength={50} />,
      meta: {
        title: "转换参数",
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
      cell: ({ row }) => <SubconverterActions subconverter={row.original} onEdit={onEdit} onDelete={onDelete} isPending={isPending} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

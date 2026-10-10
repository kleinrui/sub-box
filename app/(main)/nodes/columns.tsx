"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Trash2 } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Button } from "@/components/ui/button";
import type { Node, NodeClient } from "@/types";

interface NodeWithItems extends Node {
  items: (NodeClient & { users: { userId: string; enable: boolean; order: number }[] })[];
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
      <Button variant="ghost" size="icon" onClick={() => onDelete(node)}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">删除</span>
      </Button>
    </div>
  );
}

interface CreateColumnsOptions {
  onEdit: (node: NodeWithItems) => void;
  onDelete: (node: NodeWithItems) => void;
}

export function createColumns({ onEdit, onDelete }: CreateColumnsOptions): ColumnDef<NodeWithItems, unknown>[] {
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
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
      meta: {
        title: "类型",
      },
    },
    {
      accessorKey: "host",
      header: ({ column }) => <DataTableColumnHeader column={column} title="主机" />,
      cell: ({ row }) => row.original.host || "-",
      meta: {
        title: "主机",
      },
    },
    {
      accessorKey: "accessUrl",
      header: ({ column }) => <DataTableColumnHeader column={column} title="访问URL" />,
      cell: ({ row }) => row.original.accessUrl || "-",
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
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => <NodeActions node={row.original} onEdit={onEdit} onDelete={onDelete} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
    },
  ];
}

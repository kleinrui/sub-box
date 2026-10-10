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
import type { NodeClient, User } from "@/types";

interface NodeClientWithUsers extends NodeClient {
  users: { userId: string; enable: boolean; order: number }[];
}

interface NodeClientActionsProps {
  client: NodeClientWithUsers;
  onEdit: (client: NodeClientWithUsers) => void;
  onDelete: (client: NodeClientWithUsers) => void;
}

function NodeClientActions({ client, onEdit, onDelete }: NodeClientActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
        <Edit2 className="h-4 w-4" />
        <span className="sr-only">编辑</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="客户端更多操作">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(client)}>
            <Trash2 className="mr-2 h-4 w-4" />
            永久删除客户端
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface CreateColumnsOptions {
  onEdit: (client: NodeClientWithUsers) => void;
  onDelete: (client: NodeClientWithUsers) => void;
  users?: User[];
}

export function createColumns({ onEdit, onDelete, users = [] }: CreateColumnsOptions): ColumnDef<NodeClientWithUsers>[] {
  const userMap = new Map(users.map((user) => [user.id, user]));

  return [
    {
      accessorKey: "url",
      header: ({ column }) => <DataTableColumnHeader column={column} title="订阅地址" />,
      cell: ({ row }) => (
        <div className="min-w-[12rem] max-w-80 space-y-1">
          <CollapseDisplay url={row.original.url} maxLength={40} />
          <div className="text-xs text-muted-foreground">
            <IdBadge id={row.original.id} />
          </div>
        </div>
      ),
      meta: {
        title: "订阅地址",
      },
    },
    {
      id: "usersList",
      accessorFn: (row) => row.users,
      header: ({ column }) => <DataTableColumnHeader column={column} title="用户" />,
      cell: ({ row }) => (
        <div className="flex min-w-[8rem] max-w-72 flex-wrap gap-1">
          {row.original.users.length === 0 && <span className="text-sm text-muted-foreground">未关联用户</span>}
          {row.original.users.map((userOption) => {
            const user = userMap.get(userOption.userId);
            return (
              <Badge key={userOption.userId} variant={userOption.enable ? "default" : "outline"}>
                {user?.name || userOption.userId}
                {!userOption.enable && <span className="ml-1">(已禁用)</span>}
              </Badge>
            );
          })}
        </div>
      ),
      meta: {
        title: "用户",
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
      cell: ({ row }) => <NodeClientActions client={row.original} onEdit={onEdit} onDelete={onDelete} />,
      meta: {
        title: "操作",
      },
      enableHiding: false,
    },
  ];
}

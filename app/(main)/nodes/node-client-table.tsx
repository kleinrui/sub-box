"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { PopupSheet } from "@/components/popup-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Node, NodeClient, User } from "@/types";
import { api } from "@/utils/api";
import { createColumns } from "./node-client-columns";
import { NodeClientForm } from "./node-client-form";

interface NodeClientWithUsers extends NodeClient {
  users: { userId: string; enable: boolean; order: number }[];
}

interface NodeClientTableProps {
  userId?: string;
  nodeId?: string;
  node?: Node;
  nodes: Node[];
  items: NodeClientWithUsers[];
  users: User[];
}

export function NodeClientTable({ userId: _userId, nodeId, node: _node, nodes, items, users }: NodeClientTableProps) {
  const [editingItem, setEditingItem] = useState<NodeClientWithUsers | null>(null);
  const [deletingItem, setDeletingItem] = useState<NodeClientWithUsers | null>(null);

  // 使用TRPC mutation删除数据
  const deleteNodeClientMutation = api.nodeClient.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      setDeletingItem(null);
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  function onDelete(item: NodeClientWithUsers) {
    deleteNodeClientMutation.mutate(item.id);
  }

  const columns = createColumns({
    onEdit: (item) => setEditingItem(item),
    onDelete: (item) => setDeletingItem(item),
    users,
  });

  return (
    <>
      <DataTable columns={columns} data={items} />

      <PopupSheet open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)} title="编辑客户端">
        <NodeClientForm client={editingItem ?? undefined} nodes={nodes} onSuccess={() => setEditingItem(null)} nodeId={nodeId} />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除此客户端吗？此操作将影响所有使用该客户端的用户。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingItem) {
                  onDelete(deletingItem);
                }
              }}
              disabled={deleteNodeClientMutation.isPending}
            >
              {deleteNodeClientMutation.isPending ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { type Node, type NodeClient, type User } from "@/types";
import { createColumns } from "./columns";
import { NodeForm } from "./node-form";
import { NodeClientTable } from "./node-client-table";
import { api } from "@/utils/api";

interface NodeWithItems extends Node {
  items: (NodeClient & { users: { userId: string; enable: boolean; order: number }[] })[];
}

interface NodeTableProps {
  nodes: NodeWithItems[];
  users: User[];
}

export function NodeTable({ nodes, users }: NodeTableProps) {
  const [editingItem, setEditingItem] = useState<NodeWithItems | null>(null);
  const [deletingItem, setDeletingItem] = useState<NodeWithItems | null>(null);
  const router = useRouter();
  
  // 使用TRPC删除节点
  const deleteNodeMutation = api.node.delete.useMutation({
    onSuccess: () => {
      toast.success("节点删除成功");
      setDeletingItem(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  function onDelete(item: NodeWithItems) {
    deleteNodeMutation.mutate(item.id);
  }

  const columns = createColumns({
    onEdit: (node: NodeWithItems) => setEditingItem(node),
    onDelete: (node: NodeWithItems) => setDeletingItem(node),
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={nodes}
        expandedContent={(node) => (
          <NodeClientTable
            nodeId={node.id}
            node={node}
            nodes={[node]}
            items={node.items}
            users={users}
          />
        )}
        expandedTitle={(node) => `节点 ${node.name} 的客户端列表 (${node.items.length})`}
        enableColumnVisibility
        enableGlobalSearch
        getItemCount={(node) => node.items.length}
        defaultExpanded
      />

      <PopupSheet open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)} title="编辑节点">
        <NodeForm node={editingItem ?? undefined} onSubmitSuccess={() => setEditingItem(null)} />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除节点 {deletingItem?.name} 吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingItem) {
                  onDelete(deletingItem);
                }
              }}
              disabled={deleteNodeMutation.isPending}
            >
              {deleteNodeMutation.isPending ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

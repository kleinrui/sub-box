"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import type { Node, NodeClient, User } from "@/types";
import { api } from "@/utils/api";
import { BatchImportNodeClientDialog } from "./batch-import-node-client-dialog";
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

export function NodeClientTable({ userId, nodeId, node, nodes, items, users }: NodeClientTableProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const deleting = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<NodeClientWithUsers | null>(null);
  const [deletingItem, setDeletingItem] = useState<NodeClientWithUsers | null>(null);

  const currentNode = node ?? nodes.find((item) => item.id === nodeId);
  const currentNodeId = currentNode?.id ?? nodeId;
  const deleteNodeClientMutation = api.nodeClient.delete.useMutation();

  async function onDelete(item: NodeClientWithUsers) {
    if (deleting.current) return;
    deleting.current = true;
    setIsDeleting(true);
    try {
      await deleteNodeClientMutation.mutateAsync(item.id);
      await Promise.allSettled([utils.nodeClient.invalidate(), utils.node.getAllWithClients.invalidate()]);
      router.refresh();
      toast.success("客户端已删除，相关用户关联已移除");
      setDeletingItem(null);
    } catch (error) {
      toast.error(`删除失败：${error instanceof Error ? error.message : "请重试"}`);
    } finally {
      deleting.current = false;
      setIsDeleting(false);
    }
  }

  const columns = createColumns({
    onEdit: (item) => setEditingItem(item),
    onDelete: (item) => setDeletingItem(item),
    users,
  });
  const affectedUsers = [...new Set(deletingItem?.users.map((option) => option.userId) ?? [])];
  const affectedUserNames = affectedUsers.map((id) => users.find((user) => user.id === id)?.name ?? id).join("、");

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加客户端
          </Button>
          <BatchImportNodeClientDialog userId={userId} node={currentNode} nodes={nodes} users={users} />
        </div>
        {items.length ? (
          <DataTable columns={columns} data={items} />
        ) : (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            此节点还没有客户端。点击“添加客户端”填写订阅地址，或使用“批量导入”。
          </div>
        )}
      </div>

      <PopupSheet
        open={creating || Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setCreating(false);
            setEditingItem(null);
          }
        }}
        title={editingItem ? "编辑客户端" : "添加客户端"}
        description={currentNode ? `所属节点：${currentNode.name}` : undefined}
      >
        <NodeClientForm
          key={editingItem?.id ?? "create"}
          client={editingItem ?? undefined}
          nodes={nodes}
          nodeId={currentNodeId}
          onPendingChange={setSaving}
          onSuccess={() => {
            setCreating(false);
            setEditingItem(null);
          }}
        />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && !deleting.current && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>永久删除客户端</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {affectedUsers.length
                ? `此操作会永久删除该客户端，并移除 ${affectedUsers.length} 位用户的关联：${affectedUserNames}。这些用户的订阅将不再包含该客户端。此操作不可撤销。`
                : "此操作会永久删除该客户端。当前没有用户关联此客户端，此操作不可撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deletingItem) {
                  onDelete(deletingItem);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

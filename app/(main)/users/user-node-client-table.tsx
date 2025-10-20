"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { type Node as DbNode, type NodeClient, type User } from "@/types";
import { createColumns } from "./user-node-client-columns";
import { UserNodeClientForm } from "./user-node-client-form";
import { UserNodeClientOrderForm } from "./user-node-client-order-form";
import { api } from "@/utils/api";

interface UserNodeClientTableProps {
  userId: string;
  items: (NodeClient & { users: { userId: string; enable: boolean; order: number }[] })[];
  nodes: DbNode[];
  users: User[];
}

export function UserNodeClientTable({ userId, items, nodes, users }: UserNodeClientTableProps) {
  const [editingItem, setEditingItem] = useState<NodeClient & { users: { userId: string; enable: boolean; order: number }[] } | null>(null);
  const [deletingItem, setDeletingItem] = useState<NodeClient & { users: { userId: string; enable: boolean; order: number }[] } | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const router = useRouter();
  
  // 使用TRPC删除节点客户端
  const deleteNodeClientMutation = api.nodeClient.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      setDeletingItem(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  function onDelete(item: NodeClient & { users: { userId: string; enable: boolean; order: number }[] }) {
    deleteNodeClientMutation.mutate(item.id);
  }

  const columns = createColumns({
    userId,
    nodes,
    users,
    onEdit: setEditingItem,
    onDelete: setDeletingItem,
  });

  return (
    <>
      <div className="py-2">
        <div className="flex mb-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditingOrder(true)}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            编辑顺序
          </Button>
        </div>

        <DataTable 
          columns={columns} 
          data={items
            .sort((a, b) => {
              const aUser = a.users.find(u => u.userId === userId);
              const bUser = b.users.find(u => u.userId === userId);
              return (aUser?.order ?? 0) - (bUser?.order ?? 0);
            })
            // Map the items to include a virtual order for display
            .map((item, index) => ({
              ...item,
              users: item.users.map(u => 
                u.userId === userId 
                  ? { ...u, virtualOrder: index } 
                  : u
              )
            }))}
          defaultSorting={[]}
        />
      </div>

      <PopupSheet
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
          }
        }}
        title="编辑客户端"
      >
        <UserNodeClientForm
          userId={userId}
          nodes={nodes}
          users={users}
          item={editingItem ?? undefined}
          onSuccess={() => {
            setEditingItem(null);
          }}
        />
      </PopupSheet>

      <PopupSheet
        open={isEditingOrder}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditingOrder(false);
          }
        }}
        title="编辑顺序"
      >
        <UserNodeClientOrderForm
          userId={userId}
          items={items}
          nodes={nodes}
          onSuccess={() => {
            setIsEditingOrder(false);
          }}
        />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除此客户端吗？此操作不可撤销。</AlertDialogDescription>
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

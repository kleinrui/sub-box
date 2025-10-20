"use client";

import { useEffect, useState } from "react";
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
import { type Node, type NodeClient, type User, type Subconverter } from "@/types";
import { createColumns } from "./columns";
import { UserForm } from "./user-form";
import { UserNodeClientTable } from "./user-node-client-table";
import { api } from "@/utils/api";

interface UserTableProps {
  users: User[];
  subconverters: Subconverter[];
}

export function UserTable({ users, subconverters }: UserTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const router = useRouter();
  
  // 使用TRPC获取所需数据
  const { data: nodeClientsWithUsers = [] } = api.nodeClient.getNodeClientsWithUsers.useQuery();
  const { data: nodes = [] } = api.node.getAll.useQuery();
  
  // 使用TRPC删除用户
  const deleteUserMutation = api.user.delete.useMutation({
    onSuccess: () => {
      toast.success("用户删除成功");
      setDeletingUser(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  function onDelete(user: User) {
    deleteUserMutation.mutate(user.id);
  }

  // Group items by user id
  const itemsByUser = nodeClientsWithUsers.reduce(
    (acc, item) => {
      for (const userOption of item.users) {
        const userId = userOption.userId;
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(item);
      }
      return acc;
    },
    {} as Record<string, typeof nodeClientsWithUsers[number][]>
  );

  const columns = createColumns({
    baseUrl,
    onEdit: setEditingUser,
    onDelete: setDeletingUser
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        expandedContent={(user) => (
          <UserNodeClientTable userId={user.id} items={itemsByUser[user.id] || []} nodes={nodes} users={users} />
        )}
        expandedTitle={(user) => {
          const count = itemsByUser[user.id]?.length || 0;
          return `用户 ${user.name} 的客户端列表 (${count})`;
        }}
        enableColumnVisibility
        enableGlobalSearch
        getItemCount={(user) => itemsByUser[user.id]?.length || 0}
        defaultExpanded
      />

      <PopupSheet open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)} title="编辑用户">
        <UserForm user={editingUser ?? undefined} subconverters={subconverters} onSubmitSuccess={() => setEditingUser(null)} />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除用户 {deletingUser?.name} 吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingUser) {
                  onDelete(deletingUser);
                }
              }}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
import { type ClashConfig } from "@/types";
import { createColumns } from "./columns";
import { ClashConfigForm } from "./clash-config-form";
import { api } from "@/utils/api";

interface ClashConfigTableProps {
  configs: ClashConfig[];
}

export function ClashConfigTable({ configs }: ClashConfigTableProps) {
  const [editingItem, setEditingItem] = useState<ClashConfig | null>(null);
  const [deletingItem, setDeletingItem] = useState<ClashConfig | null>(null);
  const router = useRouter();

  // 使用TRPC mutation删除数据
  const deleteClashConfigMutation = api.clashConfig.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      setDeletingItem(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  function onDelete(item: ClashConfig) {
    deleteClashConfigMutation.mutate(item.id);
  }

  const columns = createColumns({
    onEdit: setEditingItem,
    onDelete: setDeletingItem,
  });

  return (
    <>
      <DataTable columns={columns} data={configs} />

      <PopupSheet open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)} title="编辑 Clash 配置">
        <ClashConfigForm config={editingItem ?? undefined} onSuccess={() => setEditingItem(null)} />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除配置 {deletingItem?.name} 吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingItem) {
                  onDelete(deletingItem);
                }
              }}
              disabled={deleteClashConfigMutation.isPending}
            >
              {deleteClashConfigMutation.isPending ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

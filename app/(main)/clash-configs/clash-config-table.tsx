"use client";

import { useRouter } from "next/navigation";
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
import type { ClashConfig } from "@/types";
import { api } from "@/utils/api";
import { ClashConfigForm } from "./clash-config-form";
import { createColumns } from "./columns";

interface ClashConfigTableProps {
  configs: ClashConfig[];
}

export function ClashConfigTable({ configs }: ClashConfigTableProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [editingItem, setEditingItem] = useState<ClashConfig | null>(null);
  const [deletingItem, setDeletingItem] = useState<ClashConfig | null>(null);

  // 使用TRPC mutation删除数据
  const deleteClashConfigMutation = api.clashConfig.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      void utils.clashConfig.invalidate();
      router.refresh();
      setDeletingItem(null);
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  function onDelete(item: ClashConfig) {
    if (deleteClashConfigMutation.isPending) return;
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

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && !deleteClashConfigMutation.isPending && setDeletingItem(null)}>
        <AlertDialogContent onEscapeKeyDown={(event) => deleteClashConfigMutation.isPending && event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Clash 配置</AlertDialogTitle>
            <AlertDialogDescription className="break-words">确定要删除配置「{deletingItem?.name}」吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteClashConfigMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
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

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
import { type Subconverter } from "@/types";
import { createColumns } from "./columns";
import { SubconverterForm } from "./subconverter-form";
import { api } from "@/utils/api";

interface SubconverterTableProps {
  subconverters: Subconverter[];
}

export function SubconverterTable({ subconverters }: SubconverterTableProps) {
  const [editingItem, setEditingItem] = useState<Subconverter | null>(null);
  const [deletingItem, setDeletingItem] = useState<Subconverter | null>(null);
  const router = useRouter();

  // 使用TRPC mutation删除数据
  const deleteSubconverterMutation = api.subconverter.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      setDeletingItem(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  function onDelete(item: Subconverter) {
    deleteSubconverterMutation.mutate(item.id);
  }

  const columns = createColumns({
    onEdit: setEditingItem,
    onDelete: setDeletingItem,
  });

  return (
    <>
      <DataTable 
        columns={columns} 
        data={subconverters} 
        enableColumnVisibility
        enableGlobalSearch
      />

      <PopupSheet open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)} title="编辑订阅转换器">
        <SubconverterForm subconverter={editingItem ?? undefined} onSuccess={() => setEditingItem(null)} />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除此订阅转换器吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingItem) {
                  onDelete(deletingItem);
                }
              }}
              disabled={deleteSubconverterMutation.isPending}
            >
              {deleteSubconverterMutation.isPending ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

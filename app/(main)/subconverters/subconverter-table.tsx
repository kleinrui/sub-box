"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import type { Subconverter } from "@/types";
import { api } from "@/utils/api";
import { createColumns } from "./columns";
import { CreateSubconverterDialog } from "./create-subconverter-dialog";
import { SubconverterForm } from "./subconverter-form";

interface SubconverterTableProps {
  subconverters: Subconverter[];
}

export function SubconverterTable({ subconverters }: SubconverterTableProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [editingItem, setEditingItem] = useState<Subconverter | null>(null);
  const [deletingItem, setDeletingItem] = useState<Subconverter | null>(null);

  // 使用TRPC mutation删除数据
  const deleteSubconverterMutation = api.subconverter.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      void utils.subconverter.invalidate();
      void utils.user.invalidate();
      router.refresh();
      setDeletingItem(null);
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  function onDelete(item: Subconverter) {
    if (deleteSubconverterMutation.isPending) return;
    deleteSubconverterMutation.mutate(item.id);
  }

  const columns = useMemo(
    () => createColumns({ onEdit: setEditingItem, onDelete: setDeletingItem, isPending: deleteSubconverterMutation.isPending }),
    [deleteSubconverterMutation.isPending]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={subconverters}
        enableColumnVisibility
        enableGlobalSearch
        enablePagination
        searchPlaceholder="搜索转换器地址"
        getSearchText={(subconverter) => subconverter.url}
        defaultColumnVisibility={{ id: false, options: false, createdAt: false, updatedAt: false }}
        storageKey="subconverters-table"
        emptyTitle="还没有订阅转换器"
        emptyDescription="添加转换服务地址并验证连接，再配置转换参数。"
        emptyAction={<CreateSubconverterDialog />}
      />

      <PopupSheet open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)} title="编辑订阅转换器">
        {editingItem && <SubconverterForm subconverter={editingItem} onSuccess={() => setEditingItem(null)} />}
      </PopupSheet>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && !deleteSubconverterMutation.isPending && setDeletingItem(null)}>
        <AlertDialogContent onEscapeKeyDown={(event) => deleteSubconverterMutation.isPending && event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>删除订阅转换器</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              确定要删除订阅转换器「{deletingItem?.url}」吗？指定使用它的用户将改为使用默认转换器；如未设置默认转换器，这些用户将无法生成订阅。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubconverterMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
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

"use client";

import { ArrowUpDown, Link2, Plus } from "lucide-react";
import Link from "next/link";
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
import type { Node as DbNode, NodeClient, User } from "@/types";
import { api } from "@/utils/api";
import { createColumns } from "./user-node-client-columns";
import { UserNodeClientForm } from "./user-node-client-form";
import { UserNodeClientOrderForm } from "./user-node-client-order-form";

type ClientWithUsers = NodeClient & { users: { userId: string; enable: boolean; order: number }[] };

interface UserNodeClientTableProps {
  userId: string;
  items: ClientWithUsers[];
  nodes: DbNode[];
  users: User[];
}

export function UserNodeClientTable({ userId, items, nodes, users }: UserNodeClientTableProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [clientForm, setClientForm] = useState<{ mode: "create" | "associate"; item?: ClientWithUsers } | null>(null);
  const [removingItem, setRemovingItem] = useState<ClientWithUsers | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isClientFormPending, setIsClientFormPending] = useState(false);
  const removingRef = useRef(false);

  async function refreshClients() {
    await Promise.allSettled([utils.nodeClient.invalidate(), utils.node.getAllWithClients.invalidate()]);
    router.refresh();
  }

  const removeUserClientOptionMutation = api.nodeClient.removeUserClientOption.useMutation({
    onSuccess: async () => {
      await refreshClients();
      toast.success("已取消当前用户的客户端关联");
      setRemovingItem(null);
    },
    onError: (error) => toast.error(`取消关联失败：${error.message}`),
    onSettled: () => {
      removingRef.current = false;
    },
  });

  function onRemove(item: ClientWithUsers) {
    if (removingRef.current) return;
    removingRef.current = true;
    removeUserClientOptionMutation.mutate({ nodeClientId: item.id, userId });
  }

  const columns = createColumns({
    userId,
    nodes,
    users,
    onEdit: (item) => setClientForm({ mode: "create", item }),
    onRemove: setRemovingItem,
    isPending: removeUserClientOptionMutation.isPending,
  });

  return (
    <>
      <div className="py-2">
        <div className="flex flex-wrap gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={() => setClientForm({ mode: "create" })} disabled={nodes.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            添加客户端
          </Button>
          <Button variant="outline" size="sm" onClick={() => setClientForm({ mode: "associate" })}>
            <Link2 className="mr-2 h-4 w-4" />
            关联已有客户端
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditingOrder(true)} disabled={items.length < 2}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            编辑顺序
          </Button>
        </div>
        {nodes.length === 0 && (
          <p className="mb-2 text-sm text-muted-foreground">
            暂无节点，请先在{" "}
            <Link href="/nodes" className="underline underline-offset-4">
              节点页面
            </Link>{" "}
            添加节点，再添加客户端。
          </p>
        )}

        <DataTable
          columns={columns}
          data={[...items]
            .sort((a, b) => {
              const aUser = a.users.find((user) => user.userId === userId);
              const bUser = b.users.find((user) => user.userId === userId);
              return (aUser?.order ?? 0) - (bUser?.order ?? 0);
            })
            .map((item, index) => ({
              ...item,
              users: item.users.map((user) => (user.userId === userId ? { ...user, virtualOrder: index } : user)),
            }))}
          defaultSorting={[]}
          enableColumnVisibility
          defaultColumnVisibility={{ id: false, updatedAt: false }}
        />
      </div>

      <PopupSheet
        open={Boolean(clientForm)}
        onOpenChange={(open) => !open && !isClientFormPending && setClientForm(null)}
        title={clientForm?.item ? "编辑客户端" : clientForm?.mode === "associate" ? "关联已有客户端" : "添加客户端"}
      >
        {clientForm && (
          <UserNodeClientForm
            key={clientForm.item?.id ?? clientForm.mode}
            userId={userId}
            nodes={nodes}
            users={users}
            item={clientForm.item}
            mode={clientForm.mode}
            onSuccess={() => setClientForm(null)}
            onPendingChange={setIsClientFormPending}
          />
        )}
      </PopupSheet>

      <PopupSheet open={isEditingOrder} onOpenChange={(open) => !open && setIsEditingOrder(false)} title="编辑顺序">
        {isEditingOrder && (
          <UserNodeClientOrderForm
            userId={userId}
            items={items}
            nodes={nodes}
            onSuccess={() => {
              setIsEditingOrder(false);
              void refreshClients();
            }}
          />
        )}
      </PopupSheet>

      <AlertDialog
        open={Boolean(removingItem)}
        onOpenChange={(open) => {
          if (!open && !removeUserClientOptionMutation.isPending) setRemovingItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消关联</AlertDialogTitle>
            <AlertDialogDescription>确定要取消此客户端与当前用户的关联吗？客户端会保留在节点中，其他用户仍可使用；之后可重新关联。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeUserClientOptionMutation.isPending}>返回</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (removingItem) onRemove(removingItem);
              }}
              disabled={removeUserClientOptionMutation.isPending}
            >
              {removeUserClientOptionMutation.isPending ? "取消关联中..." : "取消关联"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

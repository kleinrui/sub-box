"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subconverter, User } from "@/types";
import { api } from "@/utils/api";
import { createColumns, type UserListItem } from "./columns";
import { UserDetail } from "./user-detail";
import { UserForm } from "./user-form";

type PresenceFilter = "all" | "with" | "without";
const FILTERS_STORAGE_KEY = "sub-box:users:filters";
const isPresenceFilter = (value: unknown): value is PresenceFilter => value === "all" || value === "with" || value === "without";

interface UserTableProps {
  users: User[];
  subconverters: Subconverter[];
}

export function UserTable({ users, subconverters }: UserTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const selectedUserId = searchParams.get("user");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [clientFilter, setClientFilter] = useState<PresenceFilter>("all");
  const [enabledFilter, setEnabledFilter] = useState<PresenceFilter>("all");
  const [filtersReady, setFiltersReady] = useState(false);
  const deletingRef = useRef(false);
  const clientsQuery = api.nodeClient.getNodeClientsWithUsers.useQuery();
  const nodesQuery = api.node.getAll.useQuery(undefined, { enabled: Boolean(selectedUserId) });
  const clientsStatus = clientsQuery.isError ? "error" : clientsQuery.isPending ? "loading" : "ready";
  const clientsReady = clientsStatus === "ready";
  const editingUser = users.find((user) => user.id === editingUserId);
  const deletingUser = users.find((user) => user.id === deletingUserId);

  const listParams = new URLSearchParams(searchParams.toString());
  listParams.delete("user");
  const listHref = `${pathname}${listParams.size ? `?${listParams}` : ""}`;
  const getUserHref = (user: User) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("user", user.id);
    return `${pathname}?${params}`;
  };
  const returnToList = () => router.push(listHref, { scroll: false });

  const deleteUserMutation = api.user.delete.useMutation({
    onSuccess: async (_result, deletedUserId) => {
      await Promise.allSettled([utils.user.invalidate(), utils.node.invalidate(), utils.nodeClient.invalidate()]);
      toast.success("用户删除成功");
      setDeletingUserId(null);
      if (selectedUserId === deletedUserId) router.replace(listHref, { scroll: false });
      router.refresh();
    },
    onError: (error) => toast.error(`删除失败：${error.message}`),
    onSettled: () => {
      deletingRef.current = false;
    },
  });

  useEffect(() => {
    setBaseUrl(window.location.origin);
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(FILTERS_STORAGE_KEY) ?? "{}") as { clientFilter?: unknown; enabledFilter?: unknown };
      if (isPresenceFilter(saved.clientFilter)) setClientFilter(saved.clientFilter);
      if (isPresenceFilter(saved.enabledFilter)) setEnabledFilter(saved.enabledFilter);
    } catch {
      // 无法使用会话存储时，仍保留当前页面内的筛选状态。
    }
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    try {
      window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ clientFilter, enabledFilter }));
    } catch {
      // 存储不可用不影响列表筛选。
    }
  }, [clientFilter, enabledFilter, filtersReady]);

  const itemsByUser: Record<string, NonNullable<typeof clientsQuery.data>> = {};
  for (const client of clientsQuery.data ?? []) {
    for (const option of client.users) {
      const items = itemsByUser[option.userId] ?? [];
      items.push(client);
      itemsByUser[option.userId] = items;
    }
  }
  const defaultSubconverter = subconverters.find((subconverter) => subconverter.isDefault);
  const userItems: UserListItem[] = users.map((user) => {
    const clients = itemsByUser[user.id] ?? [];
    const subconverter = subconverters.find((item) => item.id === user.subconverterId) ?? defaultSubconverter;
    return {
      ...user,
      clientsStatus,
      enabledClientCount: clientsReady ? clients.filter((client) => client.users.find((option) => option.userId === user.id)?.enable).length : null,
      totalClientCount: clientsReady ? clients.length : null,
      subconverterUrl: subconverter?.url ?? null,
      subconverterIsDefault: subconverter?.isDefault ?? false,
    };
  });
  const selectedUser = userItems.find((user) => user.id === selectedUserId);
  const filteredUsers = userItems.filter((user) => {
    if (!clientsReady) return true;
    const hasClients = (user.totalClientCount ?? 0) > 0;
    const hasEnabledClients = (user.enabledClientCount ?? 0) > 0;
    return (clientFilter === "all" || hasClients === (clientFilter === "with")) && (enabledFilter === "all" || hasEnabledClients === (enabledFilter === "with"));
  });
  const columns = createColumns({
    baseUrl,
    getUserHref,
    onEdit: (user) => setEditingUserId(user.id),
    onDelete: (user) => setDeletingUserId(user.id),
    isPending: deleteUserMutation.isPending,
  });

  return (
    <>
      {selectedUserId ? (
        selectedUser ? (
          <UserDetail
            key={selectedUser.id}
            user={selectedUser}
            users={users}
            items={itemsByUser[selectedUser.id] ?? []}
            nodes={nodesQuery.data ?? []}
            nodesLoading={nodesQuery.isPending}
            clientsError={clientsQuery.error?.message}
            nodesError={nodesQuery.error?.message}
            baseUrl={baseUrl}
            onBack={returnToList}
            onEdit={(user) => setEditingUserId(user.id)}
            onDelete={(user) => setDeletingUserId(user.id)}
            onRetryClients={() => void clientsQuery.refetch()}
            onRetryNodes={() => void nodesQuery.refetch()}
            isPending={deleteUserMutation.isPending}
          />
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" className="px-0" onClick={returnToList}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回列表
            </Button>
            <p role="alert" className="text-sm text-muted-foreground">
              此用户不存在或已被删除。
            </p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {clientsQuery.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm text-destructive">客户端信息加载失败：{clientsQuery.error.message}</p>
                <p className="text-sm text-muted-foreground">客户端数量暂不可用，客户端筛选将在加载成功后恢复。</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void clientsQuery.refetch()} disabled={clientsQuery.isFetching}>
                {clientsQuery.isFetching ? "重试中..." : "重试"}
              </Button>
            </div>
          )}
          {clientsQuery.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              正在加载客户端数量...
            </p>
          )}
          {filtersReady ? (
            <DataTable
              columns={columns}
              data={filteredUsers}
              enableColumnVisibility
              enableGlobalSearch
              enablePagination
              searchPlaceholder="搜索用户名称或转换器 URL"
              getSearchText={(user) => `${user.name} ${user.subconverterUrl ?? ""}`}
              defaultColumnVisibility={{ id: false, createdAt: false, updatedAt: false }}
              defaultSorting={[{ id: "name", desc: false }]}
              storageKey="sub-box:users:table"
              paginationResetKey={`${clientFilter}:${enabledFilter}`}
              emptyTitle={users.length ? "没有符合条件的用户" : "暂无用户"}
              emptyDescription={users.length ? "尝试调整搜索或客户端筛选。" : "创建用户后，可为其添加或关联客户端。"}
              emptyAction={
                clientFilter !== "all" || enabledFilter !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setClientFilter("all");
                      setEnabledFilter("all");
                    }}
                  >
                    重置客户端筛选
                  </Button>
                ) : undefined
              }
              toolbar={
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={clientFilter} onValueChange={(value) => isPresenceFilter(value) && setClientFilter(value)} disabled={!clientsReady}>
                    <SelectTrigger className="h-8 w-[145px]" aria-label="按客户端筛选">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有客户端情况</SelectItem>
                      <SelectItem value="with">有客户端</SelectItem>
                      <SelectItem value="without">无客户端</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={enabledFilter} onValueChange={(value) => isPresenceFilter(value) && setEnabledFilter(value)} disabled={!clientsReady}>
                    <SelectTrigger className="h-8 w-[165px]" aria-label="按启用客户端筛选">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有启用情况</SelectItem>
                      <SelectItem value="with">有启用客户端</SelectItem>
                      <SelectItem value="without">无启用客户端</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              正在加载列表...
            </p>
          )}
        </div>
      )}

      <PopupSheet open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUserId(null)} title="编辑用户">
        {editingUser && <UserForm key={editingUser.id} user={editingUser} subconverters={subconverters} onSubmitSuccess={() => setEditingUserId(null)} />}
      </PopupSheet>

      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && !deleteUserMutation.isPending && setDeletingUserId(null)}>
        <AlertDialogContent onEscapeKeyDown={(event) => deleteUserMutation.isPending && event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>删除用户</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              确定要删除用户「{deletingUser?.name}」及其客户端关联吗？客户端会保留在节点中，其他用户仍可使用。用户删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!deletingUser || deletingRef.current) return;
                deletingRef.current = true;
                deleteUserMutation.mutate(deletingUser.id);
              }}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "删除中..." : "删除用户"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

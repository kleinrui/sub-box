"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { User } from "@/types";
import { api } from "@/utils/api";
import { createColumns, getNodeTypeLabel, getNodeUserCount, type NodeWithItems, nodeTypeLabels } from "./columns";
import { CreateNodeDialog } from "./create-node-dialog";
import { NodeDetail } from "./node-detail";
import { NodeForm } from "./node-form";

const FILTERS_STORAGE_KEY = "sub-box:nodes:filters";
const ALL_TYPES = "__all_types__";

interface NodeTableProps {
  nodes: NodeWithItems[];
  users: User[];
}

export function NodeTable({ nodes, users }: NodeTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState(ALL_TYPES);
  const [filtersReady, setFiltersReady] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleting = useRef(false);
  const selectedId = searchParams.get("node");
  const selectedNode = nodes.find((node) => node.id === selectedId);
  const editingNode = nodes.find((node) => node.id === editingId);
  const deletingNode = nodes.find((node) => node.id === deletingId);
  const filteredNodes = selectedType === ALL_TYPES ? nodes : nodes.filter((node) => node.type === selectedType);
  const types = [...new Set([...Object.keys(nodeTypeLabels), ...nodes.map((node) => node.type).filter((type) => type.trim().length > 0)])];

  useEffect(() => {
    if (filtersReady) return;
    try {
      const saved: unknown = JSON.parse(window.sessionStorage.getItem(FILTERS_STORAGE_KEY) ?? "{}");
      if (typeof saved === "object" && saved !== null && "selectedType" in saved && typeof saved.selectedType === "string") {
        const storedType = saved.selectedType;
        if (storedType.trim().length > 0 && (storedType === ALL_TYPES || Object.hasOwn(nodeTypeLabels, storedType) || nodes.some((node) => node.type === storedType))) {
          setSelectedType(storedType);
        }
      }
    } catch {
      // 存储不可用或旧数据无效时，仍可在当前页面筛选。
    }
    setFiltersReady(true);
  }, [filtersReady, nodes]);

  useEffect(() => {
    if (!filtersReady) return;
    try {
      window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ selectedType }));
    } catch {
      // 存储不可用不影响列表筛选。
    }
  }, [filtersReady, selectedType]);

  function getNodeHref(id?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("node", id);
    else params.delete("node");
    const query = params.toString();
    return query ? `/nodes?${query}` : "/nodes";
  }

  function returnToList() {
    router.push(getNodeHref());
  }

  const deleteNodeMutation = api.node.delete.useMutation();

  async function onDelete(item: NodeWithItems) {
    if (deleting.current) return;
    deleting.current = true;
    setIsDeleting(true);
    try {
      await deleteNodeMutation.mutateAsync(item.id);
      await Promise.allSettled([utils.node.invalidate(), utils.nodeClient.invalidate()]);
      toast.success("节点删除成功");
      router.refresh();
      if (selectedId === item.id) returnToList();
      setDeletingId(null);
    } catch (error) {
      toast.error(`删除失败：${error instanceof Error ? error.message : "请重试"}`);
    } finally {
      deleting.current = false;
      setIsDeleting(false);
    }
  }

  const columns = createColumns({
    onEdit: (node) => setEditingId(node.id),
    onDelete: (node) => setDeletingId(node.id),
    getDetailHref: (node) => getNodeHref(node.id),
  });

  return (
    <>
      <div className={selectedId ? "hidden" : "min-w-0"}>
        {filtersReady ? (
          <DataTable
            columns={columns}
            data={filteredNodes}
            enableColumnVisibility
            enableGlobalSearch
            enablePagination
            paginationResetKey={selectedType}
            searchPlaceholder="搜索名称、主机或类型"
            getSearchText={(node) => `${node.name} ${node.host ?? ""} ${getNodeTypeLabel(node.type)}`}
            defaultColumnVisibility={{ id: false, accessUrl: false, createdAt: false, updatedAt: false }}
            storageKey="nodes-table"
            toolbar={
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 w-full sm:w-40" aria-label="按节点类型筛选">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES}>全部类型</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getNodeTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            emptyTitle={nodes.length ? "没有找到节点" : "还没有节点"}
            emptyDescription={nodes.length ? "调整名称、主机或类型条件后再试。" : "添加节点后，可以继续管理其客户端和用户关联。"}
            emptyAction={
              selectedType !== ALL_TYPES ? (
                <Button variant="outline" size="sm" onClick={() => setSelectedType(ALL_TYPES)}>
                  重置类型筛选
                </Button>
              ) : nodes.length === 0 ? (
                <CreateNodeDialog />
              ) : undefined
            }
          />
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            正在加载列表...
          </p>
        )}
      </div>
      {selectedId &&
        (selectedNode ? (
          <NodeDetail
            key={selectedNode.id}
            node={selectedNode}
            users={users}
            onBack={returnToList}
            onEdit={() => setEditingId(selectedNode.id)}
            onDelete={() => setDeletingId(selectedNode.id)}
          />
        ) : (
          <section className="space-y-4 rounded-lg border p-5">
            <h2 className="text-lg font-medium">找不到该节点</h2>
            <p className="text-sm text-muted-foreground">该节点不存在，返回列表查看当前节点。</p>
            <Button variant="outline" onClick={returnToList}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回节点列表
            </Button>
          </section>
        ))}

      <PopupSheet open={Boolean(editingNode)} onOpenChange={(open) => !open && setEditingId(null)} title="编辑节点">
        <NodeForm key={editingNode?.id ?? "edit"} node={editingNode} onSubmitSuccess={() => setEditingId(null)} />
      </PopupSheet>

      <AlertDialog open={Boolean(deletingNode)} onOpenChange={(open) => !open && !deleting.current && setDeletingId(null)}>
        <AlertDialogContent onEscapeKeyDown={(event) => isDeleting && event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>删除节点</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              确定要删除节点「{deletingNode?.name}」及其下的 {deletingNode?.items.length ?? 0} 个客户端吗？这会移除 {deletingNode ? getNodeUserCount(deletingNode) : 0}{" "}
              位用户的相关客户端关联。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deletingNode) {
                  onDelete(deletingNode);
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

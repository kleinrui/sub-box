"use client";

import { ArrowLeft, Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { CollapseDisplay } from "@/components/collapse-display";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@/types";
import { getNodeTypeLabel, getNodeUserCount, type NodeWithItems } from "./columns";
import { NodeClientTable } from "./node-client-table";

interface NodeDetailProps {
  node: NodeWithItems;
  users: User[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NodeDetail({ node, users, onBack, onEdit, onDelete }: NodeDetailProps) {
  return (
    <section className="min-w-0 space-y-5" aria-label="节点详情">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回节点列表
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48 space-y-2">
          <h2 className="break-words text-xl font-semibold">{node.name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{getNodeTypeLabel(node.type)}</Badge>
            <span className="break-all">{node.host || "未设置主机"}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="mr-2 h-4 w-4" />
            编辑节点
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="节点更多操作">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                删除节点
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border px-4 py-3">
          <dt className="text-sm text-muted-foreground">客户端数量</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{node.items.length}</dd>
        </div>
        <div className="rounded-lg border px-4 py-3">
          <dt className="text-sm text-muted-foreground">关联用户人数</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{getNodeUserCount(node)}</dd>
        </div>
      </dl>
      <Tabs defaultValue="clients" className="min-w-0">
        <TabsList>
          <TabsTrigger value="clients">客户端</TabsTrigger>
          <TabsTrigger value="info">基本信息</TabsTrigger>
        </TabsList>
        <TabsContent value="clients" className="min-w-0 space-y-3 pt-3">
          <p className="text-sm text-muted-foreground">管理此节点的订阅地址及用户关联。</p>
          <div className="min-w-0 max-w-full overflow-x-auto">
            <NodeClientTable nodeId={node.id} node={node} nodes={[node]} items={node.items} users={users} />
          </div>
        </TabsContent>
        <TabsContent value="info" className="min-w-0 pt-3">
          <dl className="grid min-w-0 gap-5 rounded-lg border p-4 sm:grid-cols-2 sm:p-5">
            <div className="min-w-0 space-y-1">
              <dt className="text-sm text-muted-foreground">名称</dt>
              <dd className="break-words">{node.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">类型</dt>
              <dd>{getNodeTypeLabel(node.type)}</dd>
            </div>
            <div className="min-w-0 space-y-1">
              <dt className="text-sm text-muted-foreground">主机</dt>
              <dd className="break-all">{node.host || "未设置"}</dd>
            </div>
            <div className="min-w-0 space-y-1">
              <dt className="text-sm text-muted-foreground">ID</dt>
              <dd>
                <IdBadge id={node.id} />
              </dd>
            </div>
            <div className="min-w-0 space-y-1 sm:col-span-2">
              <dt className="text-sm text-muted-foreground">访问URL</dt>
              <dd>{node.accessUrl ? <CollapseDisplay url={node.accessUrl} maxLength={80} /> : "未设置"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">创建时间</dt>
              <dd>
                <DateTime date={node.createdAt} />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">更新时间</dt>
              <dd>
                <DateTime date={node.updatedAt} />
              </dd>
            </div>
          </dl>
        </TabsContent>
      </Tabs>
    </section>
  );
}

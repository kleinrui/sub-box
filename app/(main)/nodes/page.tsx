import { Suspense } from "react";
import { api } from "@/server/api/trpc-server";
import { CreateNodeDialog } from "./create-node-dialog";
import { NodeTable } from "./node-table";

export default async function NodesPage() {
  const [nodes, users] = await Promise.all([api.node.getAllWithClients(), api.user.getAll()]);

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">节点管理</h1>
          <p className="text-sm text-muted-foreground">共 {nodes.length} 个节点，集中管理客户端及其用户关联。</p>
        </div>
        <CreateNodeDialog />
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">正在加载节点...</p>}>
        <NodeTable nodes={nodes} users={users} />
      </Suspense>
    </div>
  );
}

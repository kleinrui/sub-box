import { Suspense } from "react";
import { PageHeading } from "@/components/page-heading";
import { api } from "@/server/api/trpc-server";
import { CreateNodeDialog } from "./create-node-dialog";
import { NodeTable } from "./node-table";

export default async function NodesPage() {
  const [nodes, users] = await Promise.all([api.node.getAllWithClients(), api.user.getAll()]);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeading title="节点管理" count={nodes.length} description="集中管理客户端及其用户关联。" actions={<CreateNodeDialog />} />
      <Suspense fallback={<p className="text-sm text-muted-foreground">正在加载节点...</p>}>
        <NodeTable nodes={nodes} users={users} />
      </Suspense>
    </div>
  );
}

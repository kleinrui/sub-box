import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, HydrateClient } from "@/server/api/trpc-server";
import { CreateNodeDialog } from "./create-node-dialog";
import { NodeTable } from "./node-table";

export default async function NodesPage() {
  const nodes = await api.node.getAllWithClients();
  const users = await api.user.getAll();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <div className="flex items-center gap-4">
          <CardTitle>节点管理 ({nodes.length})</CardTitle>
          <HydrateClient>
            <CreateNodeDialog />
          </HydrateClient>
        </div>
      </CardHeader>
      <CardContent>
        <HydrateClient>
          <NodeTable nodes={nodes} users={users} />
        </HydrateClient>
      </CardContent>
    </Card>
  );
}

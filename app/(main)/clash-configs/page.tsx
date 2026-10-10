import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, HydrateClient } from "@/server/api/trpc-server";
import { ClashConfigTable } from "./clash-config-table";
import { CreateClashConfigDialog } from "./create-clash-config-dialog";

export default async function ClashConfigsPage() {
  const configs = await api.clashConfig.getAll();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <div className="flex items-center gap-4">
          <CardTitle>Clash 配置 ({configs.length})</CardTitle>
          <HydrateClient>
            <CreateClashConfigDialog />
          </HydrateClient>
        </div>
      </CardHeader>
      <CardContent>
        <HydrateClient>
          <ClashConfigTable configs={configs} />
        </HydrateClient>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, HydrateClient } from "@/server/api/trpc-server";
import { CreateSubconverterDialog } from "./create-subconverter-dialog";
import { SubconverterTable } from "./subconverter-table";

export default async function SubconvertersPage() {
  const subconverters = await api.subconverter.getAll();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <div className="flex items-center gap-4">
          <CardTitle>订阅转换器 ({subconverters.length})</CardTitle>
          <HydrateClient>
            <CreateSubconverterDialog />
          </HydrateClient>
        </div>
      </CardHeader>
      <CardContent>
        <HydrateClient>
          <SubconverterTable subconverters={subconverters} />
        </HydrateClient>
      </CardContent>
    </Card>
  );
}

import { PageHeading } from "@/components/page-heading";
import { api } from "@/server/api/trpc-server";
import { CreateSubconverterDialog } from "./create-subconverter-dialog";
import { SubconverterTable } from "./subconverter-table";

export default async function SubconvertersPage() {
  const subconverters = await api.subconverter.getAll();

  return (
    <div className="min-w-0 space-y-6">
      <PageHeading title="订阅转换器" count={subconverters.length} description="管理订阅转换服务、连接验证和转换参数。" actions={<CreateSubconverterDialog />} />
      <SubconverterTable subconverters={subconverters} />
    </div>
  );
}

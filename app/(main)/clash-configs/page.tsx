import { PageHeading } from "@/components/page-heading";
import { api } from "@/server/api/trpc-server";
import { ClashConfigTable } from "./clash-config-table";
import { CreateClashConfigDialog } from "./create-clash-config-dialog";

export default async function ClashConfigsPage() {
  const configs = await api.clashConfig.getAll();

  return (
    <div className="min-w-0 space-y-6">
      <PageHeading title="Clash 配置" count={configs.length} description="管理订阅合并时使用的全局配置和规则。" actions={<CreateClashConfigDialog />} />
      <ClashConfigTable configs={configs} />
    </div>
  );
}

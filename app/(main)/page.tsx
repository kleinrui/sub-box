import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/server/api/trpc-server";
import { UserList } from "./user-list";

export default async function Home() {
  const users = await api.user.getAll();
  const nodes = await api.node.getAll();
  const subconverters = await api.subconverter.getAll();
  const clashConfigs = await api.clashConfig.getAll();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>总用户数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>总节点数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nodes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>转换器数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{subconverters.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>配置数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{clashConfigs.length}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList users={users} />
        </CardContent>
      </Card>
    </div>
  );
}

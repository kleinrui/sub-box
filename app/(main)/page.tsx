import { ArrowUpRight, Link2, Network, Users } from "lucide-react";
import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { getHomepageData } from "@/lib/homepage-data";
import { api } from "@/server/api/trpc-server";
import { HomepageSetup, HomepageTodoGroup } from "./homepage-todos";
import { CreateNodeDialog } from "./nodes/create-node-dialog";
import { UserList } from "./user-list";
import { CreateUserDialog } from "./users/create-user-dialog";

export default async function Home() {
  const [users, nodes, clients, subconverters] = await Promise.all([api.user.getAll(), api.node.getAll(), api.nodeClient.getNodeClientsWithUsers(), api.subconverter.getAll()]);
  const homepage = getHomepageData({ users, nodes, clients, subconverters });
  const subscriptionKeys = new Map(users.map((user) => [user.id, user.subscriptionKey]));
  const subscriptionUsers = homepage.users.map((user) => ({ ...user, subscriptionKey: subscriptionKeys.get(user.id) ?? "" }));
  const hasTodos = Object.values(homepage.todos).some((items) => items.length > 0);
  const overview = [
    { title: "用户", count: homepage.overview.users, href: "/users", Icon: Users },
    { title: "节点", count: homepage.overview.nodes, href: "/nodes", Icon: Network },
    { title: "客户端", count: homepage.overview.clients, href: "/nodes", Icon: Link2 },
  ];

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
      <PageHeading
        title="首页"
        description="查看配置待办，快速复制用户订阅。"
        actions={
          <>
            <CreateNodeDialog />
            <CreateUserDialog subconverters={subconverters} />
          </>
        }
      />
      <section aria-label="概览" className="grid min-w-0 grid-cols-3 gap-3">
        {overview.map(({ title, count, href, Icon }) => (
          <Link
            key={title}
            href={href}
            className="min-w-0 rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:p-4"
            aria-label={`${title} ${count} 个，前往${href === "/users" ? "用户" : "节点"}管理`}
          >
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{title}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Icon className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
              <span className="min-w-0 break-all text-xl font-semibold tabular-nums sm:text-2xl">{count}</span>
            </div>
          </Link>
        ))}
      </section>

      {homepage.isEmpty ? (
        <HomepageSetup />
      ) : (
        <section className="space-y-4" aria-labelledby="homepage-todos-title">
          <div className="space-y-1">
            <h2 id="homepage-todos-title" className="text-lg font-semibold">
              配置待办
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">根据现有节点、客户端关联和转换器配置整理。</p>
          </div>
          {hasTodos ? (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <HomepageTodoGroup
                title="尚未关联客户端的用户"
                description="为这些用户添加或关联客户端，以准备订阅。"
                items={homepage.todos.usersWithoutClients}
                destination="users"
              />
              <HomepageTodoGroup
                title="尚未启用客户端的用户"
                description="已有关联客户端，但全部处于禁用状态。"
                items={homepage.todos.usersWithoutEnabledClients}
                destination="users"
              />
              <HomepageTodoGroup title="尚无客户端的节点" description="进入节点详情，添加客户端或批量导入链接。" items={homepage.todos.nodesWithoutClients} destination="nodes" />
              <HomepageTodoGroup
                title="需要默认转换器的用户"
                description="这些用户未指定可用转换器，且当前没有默认转换器。"
                items={homepage.todos.usersNeedingDefaultSubconverter}
                destination="users"
                action={{ href: "/subconverters", label: "配置转换器" }}
              />
            </div>
          ) : (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">暂无配置待办。可在下方搜索用户并复制订阅链接。</p>
          )}
        </section>
      )}

      <section className="min-w-0 space-y-4" aria-labelledby="homepage-users-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="homepage-users-title" className="text-lg font-semibold">
            用户订阅
          </h2>
          <Link href="/users" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
            管理用户
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <UserList users={subscriptionUsers} />
      </section>
    </div>
  );
}

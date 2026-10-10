import type { Node, Subconverter, User } from "@/types";

interface HomepageClient {
  id: string;
  nodeId: string;
  users: { userId: string; enable: boolean }[];
}

interface HomepageDataInput {
  users: Pick<User, "id" | "name" | "subconverterId">[];
  nodes: Pick<Node, "id" | "name">[];
  clients: HomepageClient[];
  subconverters: Pick<Subconverter, "id" | "url" | "isDefault">[];
}

export interface HomepageItem {
  id: string;
  name: string;
}

export interface HomepageUserSummary extends HomepageItem {
  enabledClientCount: number;
  totalClientCount: number;
  subconverterUrl: string | null;
  subconverterIsDefault: boolean;
}

export function getHomepageData({ users, nodes, clients, subconverters }: HomepageDataInput) {
  const clientCounts = new Map<string, { enabled: number; total: number }>();
  const nodesWithClients = new Set<string>();
  for (const client of clients) {
    nodesWithClients.add(client.nodeId);
    for (const option of client.users) {
      const count = clientCounts.get(option.userId) ?? { enabled: 0, total: 0 };
      count.total += 1;
      if (option.enable) count.enabled += 1;
      clientCounts.set(option.userId, count);
    }
  }

  const subconvertersById = new Map(subconverters.map((subconverter) => [subconverter.id, subconverter]));
  const defaultSubconverter = subconverters.find((subconverter) => subconverter.isDefault);
  const userSummaries: HomepageUserSummary[] = users.map((user) => {
    const counts = clientCounts.get(user.id);
    const subconverter = subconvertersById.get(user.subconverterId ?? "") ?? defaultSubconverter;
    return {
      id: user.id,
      name: user.name,
      enabledClientCount: counts?.enabled ?? 0,
      totalClientCount: counts?.total ?? 0,
      subconverterUrl: subconverter?.url ?? null,
      subconverterIsDefault: subconverter?.isDefault ?? false,
    };
  });
  const toItem = ({ id, name }: HomepageItem): HomepageItem => ({ id, name });

  return {
    overview: { users: users.length, nodes: nodes.length, clients: clients.length },
    isEmpty: users.length === 0 && nodes.length === 0 && clients.length === 0,
    users: userSummaries,
    // 待办只保留定位所需的 ID 和名称，不携带订阅密钥或客户端 URL。
    todos: {
      usersWithoutClients: userSummaries.filter((user) => user.totalClientCount === 0).map(toItem),
      usersWithoutEnabledClients: userSummaries.filter((user) => user.totalClientCount > 0 && user.enabledClientCount === 0).map(toItem),
      nodesWithoutClients: nodes.filter((node) => !nodesWithClients.has(node.id)).map(toItem),
      usersNeedingDefaultSubconverter: defaultSubconverter ? [] : users.filter((user) => !subconvertersById.has(user.subconverterId ?? "")).map(toItem),
    },
  };
}

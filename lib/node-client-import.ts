import type { NodeClient } from "@/types";

export interface NodeClientImportItem {
  url: string;
  userId: string;
  enable: boolean;
  clientId?: string;
  error?: string;
}

export interface NodeClientImportSource extends NodeClient {
  users: { userId: string; enable: boolean; order: number }[];
}

export function parseNodeClientUrls(value: string) {
  const lines = value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean);
  const urls = [...new Set(lines)];
  return { urls, duplicateCount: lines.length - urls.length };
}

export function findNodeClientByUrl(clients: NodeClientImportSource[], nodeId: string, url: string) {
  const trimmedUrl = url.trim();
  return clients.find((client) => client.nodeId === nodeId && client.url.trim() === trimmedUrl);
}

export function buildNodeClientImportItems(urls: string[], clients: NodeClientImportSource[], nodeId: string, userId = ""): NodeClientImportItem[] {
  return urls.map((url) => {
    const existing = findNodeClientByUrl(clients, nodeId, url);
    return { url, userId, enable: existing?.users.find((user) => user.userId === userId)?.enable ?? true, clientId: existing?.id };
  });
}

interface ImportNodeClientsOptions {
  nodeId: string;
  items: NodeClientImportItem[];
  clients: NodeClientImportSource[];
  createClient: (input: { nodeId: string; url: string }) => Promise<NodeClient>;
  setUserClientOption: (input: { nodeClientId: string; userId: string; data: { enable: boolean } }) => Promise<unknown>;
}

export async function importNodeClients({ nodeId, items, clients, createClient, setUserClientOption }: ImportNodeClientsOptions) {
  const knownClients = [...clients];
  const failed: NodeClientImportItem[] = [];
  let succeeded = 0;
  let created = 0;
  let updated = 0;
  const processed = new Set<string>();

  for (const item of items) {
    const key = JSON.stringify([item.url, item.userId]);
    if (processed.has(key)) continue;
    processed.add(key);
    let clientId: string | undefined;
    try {
      const existing = findNodeClientByUrl(knownClients, nodeId, item.url);
      let client = existing;
      if (!client) {
        const createdClient = await createClient({ nodeId, url: item.url });
        client = { ...createdClient, users: [] };
        knownClients.push(client);
        created += 1;
      }
      clientId = client.id;
      await setUserClientOption({ nodeClientId: clientId, userId: item.userId, data: { enable: item.enable } });
      succeeded += 1;
      if (existing) updated += 1;
    } catch (error) {
      failed.push({ ...item, clientId, error: error instanceof Error ? error.message : "导入失败，请重试" });
    }
  }

  return { succeeded, created, updated, failed };
}

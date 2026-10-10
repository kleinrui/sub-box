import "server-only";

import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { ClashConfig, Node, NodeClient, Subconverter, User, UserClientOption } from "@/types";
import { type Database, db } from "../db";
import { clashConfigs, nodeClients, nodes, subconverters, userClientOptions, users } from "../db/schema";
import { clashConfigService } from "./clash-config-service";
import { nodeClientService } from "./node-client-service";
import { nodeService } from "./node-service";
import { subconverterService } from "./subconverter-service";
import { userService } from "./user-service";

export type ExportData = {
  users: User[];
  nodes: Node[];
  nodeClients: NodeClient[];
  userClientOptions: UserClientOption[];
  subconverters: Subconverter[];
  clashConfigs: ClashConfig[];
};

export type ImportOptions = {
  skipExisting: boolean;
};

class ExportService {
  private dbPromise: Promise<Database>;

  constructor() {
    this.dbPromise = db();
  }

  private async getDb() {
    return await this.dbPromise;
  }

  async exportAll(): Promise<ExportData> {
    const db = await this.getDb();
    const [usersData, nodesData, nodeClientsData, userClientOptionsData, subconvertersData, clashConfigsData] = await Promise.all([
      userService.getAll(),
      nodeService.getAll(),
      nodeClientService.getAll(),
      db.select().from(userClientOptions),
      subconverterService.getAll(),
      clashConfigService.getAll(),
    ]);

    return {
      users: usersData,
      nodes: nodesData,
      nodeClients: nodeClientsData,
      userClientOptions: userClientOptionsData,
      subconverters: subconvertersData,
      clashConfigs: clashConfigsData,
    };
  }

  async importAll(data: ExportData, options: ImportOptions): Promise<void> {
    const db = await this.getDb();
    const batchStatements: BatchItem<"sqlite">[] = [];

    // 收集所有导入语句
    for (const subconverter of data.subconverters) {
      if (options.skipExisting) {
        const existing = await subconverterService.get(subconverter.id);
        if (existing) continue;
      }
      batchStatements.push(db.insert(subconverters).values(subconverter));
    }

    for (const config of data.clashConfigs) {
      if (options.skipExisting) {
        const existing = await clashConfigService.get(config.id);
        if (existing) continue;
      }
      batchStatements.push(db.insert(clashConfigs).values(config));
    }

    for (const node of data.nodes) {
      if (options.skipExisting) {
        const existing = await nodeService.get(node.id);
        if (existing) continue;
      }
      batchStatements.push(db.insert(nodes).values(node));
    }

    for (const user of data.users) {
      if (options.skipExisting) {
        const existing = await userService.get(user.id);
        if (existing) continue;
      }
      batchStatements.push(db.insert(users).values(user));
    }

    for (const client of data.nodeClients) {
      if (options.skipExisting) {
        const existing = await nodeClientService.get(client.id);
        if (existing) continue;
      }
      batchStatements.push(db.insert(nodeClients).values(client));
    }

    for (const option of data.userClientOptions) {
      if (options.skipExisting) {
        // 对于关联表，我们需要检查组合键
        const existingOptions = await db
          .select()
          .from(userClientOptions)
          .where(and(eq(userClientOptions.userId, option.userId), eq(userClientOptions.nodeClientId, option.nodeClientId)));
        if (existingOptions.length > 0) continue;
      }
      batchStatements.push(db.insert(userClientOptions).values(option));
    }

    // 执行批处理
    if (batchStatements.length > 0) {
      await db.batch(batchStatements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    }
  }
}

export const exportService = new ExportService();

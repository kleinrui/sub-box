import "server-only";

import crypto from "crypto";
import { and, eq, not, inArray } from "drizzle-orm";
import { type BatchItem } from "drizzle-orm/batch";

import { type NodeClient, type UserClientOption } from "@/types";
import { db, type Database } from "../db";
import { nodeClients, userClientOptions } from "../db/schema";

class NodeClientService {
  private dbPromise: Promise<Database>;

  constructor() {
    this.dbPromise = db();
  }

  private async getDb() {
    return await this.dbPromise;
  }

  async getAll(): Promise<NodeClient[]> {
    const db = await this.getDb();
    return db.select().from(nodeClients);
  }

  async get(id: string): Promise<NodeClient | null> {
    const db = await this.getDb();
    const results = await db.select().from(nodeClients).where(eq(nodeClients.id, id)).limit(1);
    return results[0] || null;
  }

  async create(data: Omit<NodeClient, "id" | "createdAt" | "updatedAt">): Promise<NodeClient> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(nodeClients).values(item).returning();
    if (!results[0]) {
      throw new Error("Failed to create node client");
    }
    return results[0];
  }

  async update(id: string, data: Partial<Omit<NodeClient, "id" | "createdAt" | "updatedAt">>): Promise<NodeClient> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    const results = await db.update(nodeClients).set(updateData).where(eq(nodeClients.id, id)).returning();

    if (!results[0]) {
      throw new Error(`Node client with id ${id} not found`);
    }

    return results[0];
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    const batchStatements: BatchItem<"sqlite">[] = [
      // Delete all user client options
      db.delete(userClientOptions).where(eq(userClientOptions.nodeClientId, id)),
      // Delete the node client
      db.delete(nodeClients).where(eq(nodeClients.id, id))
    ];

    if (batchStatements.length > 0) {
      await db.batch(batchStatements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    }
  }

  async getUserClientOptions(nodeClientId: string): Promise<UserClientOption[]> {
    const db = await this.getDb();
    return db
      .select()
      .from(userClientOptions)
      .where(eq(userClientOptions.nodeClientId, nodeClientId))
      .orderBy(userClientOptions.order);
  }

  async setUserClientOptions(
    nodeClientId: string,
    userIds: string[],
    defaultOptions: Partial<Omit<UserClientOption, "userId" | "nodeClientId" | "createdAt" | "updatedAt">> = {},
    replaceExisting = false
  ): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    // Replace mode: if replaceExisting is true
    if (replaceExisting) {
      if (userIds.length === 0) {
        await db.delete(userClientOptions).where(eq(userClientOptions.nodeClientId, nodeClientId));
        return;
      }

      // Delete existing options that are not in the new list
      await db
        .delete(userClientOptions)
        .where(
          and(
            eq(userClientOptions.nodeClientId, nodeClientId),
            not(inArray(userClientOptions.userId, userIds))
          )
        );
    }

    // Get existing options for this node client to determine which users already have records
    const existingOptionsForClient = await this.getUserClientOptions(nodeClientId);
    const existingUserIds = new Set(existingOptionsForClient.map(o => o.userId));

    // Determine which users need new options
    const newUserIds = userIds.filter(userId => !existingUserIds.has(userId));

    if (newUserIds.length > 0) {
      // Fetch all options for these users to compute next order per user
      const allOptionsForNewUsers = await db
        .select()
        .from(userClientOptions)
        .where(inArray(userClientOptions.userId, newUserIds));

      const maxOrderByUser = new Map<string, number>();
      for (const userId of newUserIds) {
        maxOrderByUser.set(userId, -1);
      }
      for (const opt of allOptionsForNewUsers) {
        const currentMax = maxOrderByUser.get(opt.userId) ?? -1;
        if (opt.order > currentMax) {
          maxOrderByUser.set(opt.userId, opt.order);
        }
      }

      const newOptions = newUserIds.map((userId) => ({
        userId,
        nodeClientId,
        enable: defaultOptions.enable ?? true,
        order: defaultOptions.order ?? (maxOrderByUser.get(userId)! + 1),
        createdAt: now,
        updatedAt: now,
      }));

      await db.insert(userClientOptions).values(newOptions);
    }
  }

  async updateUserClientOption(
    nodeClientId: string,
    userId: string,
    data: Partial<Omit<UserClientOption, "userId" | "nodeClientId" | "createdAt" | "updatedAt">>
  ): Promise<UserClientOption> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    const results = await db
      .update(userClientOptions)
      .set(updateData)
      .where(
        and(
          eq(userClientOptions.nodeClientId, nodeClientId),
          eq(userClientOptions.userId, userId)
        )
      )
      .returning();

    if (!results[0]) {
      throw new Error(`User client option not found`);
    }

    return results[0];
  }

  async getNodeClientsWithUsers(): Promise<(NodeClient & { users: { userId: string; enable: boolean; order: number }[] })[]> {
    const db = await this.getDb();
    const clients = await this.getAll();
    const options = await db.select().from(userClientOptions);

    return clients.map(client => ({
      ...client,
      users: options
        .filter(opt => opt.nodeClientId === client.id)
        .map(opt => ({
          userId: opt.userId,
          enable: opt.enable,
          order: opt.order,
        }))
        .sort((a, b) => a.order - b.order),
    }));
  }

  async getByUserId(userId: string): Promise<(NodeClient & { enable: boolean; order: number })[]> {
    const db = await this.getDb();
    const options = await db
      .select()
      .from(userClientOptions)
      .where(eq(userClientOptions.userId, userId))
      .orderBy(userClientOptions.order);

    const clientIds = options.map(opt => opt.nodeClientId);
    if (clientIds.length === 0) {
      return [];
    }
    const clients = await db
      .select()
      .from(nodeClients)
      .where(inArray(nodeClients.id, clientIds));

    return clients.map(client => {
      const option = options.find(opt => opt.nodeClientId === client.id);
      return {
        ...client,
        enable: option?.enable ?? false,
        order: option?.order ?? 0,
      };
    });
  }
}

export const nodeClientService = new NodeClientService();

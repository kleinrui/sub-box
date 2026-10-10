import "server-only";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { Node } from "@/types";
import { type Database, db } from "../db";
import { nodeClients, nodes, userClientOptions } from "../db/schema";

class NodeService {
  private dbPromise: Promise<Database>;

  constructor() {
    this.dbPromise = db();
  }

  private async getDb() {
    return await this.dbPromise;
  }

  async getAll(): Promise<Node[]> {
    const db = await this.getDb();
    return db.select().from(nodes);
  }

  async get(id: string): Promise<Node | null> {
    const db = await this.getDb();
    const results = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);
    return results[0] || null;
  }

  async create(data: Omit<Node, "id" | "createdAt" | "updatedAt">): Promise<Node> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(nodes).values(item).returning();
    if (!results[0]) {
      throw new Error("Failed to create node");
    }
    return results[0];
  }

  async update(id: string, data: Partial<Omit<Node, "id" | "createdAt" | "updatedAt">>): Promise<Node> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    const results = await db.update(nodes).set(updateData).where(eq(nodes.id, id)).returning();

    if (!results[0]) {
      throw new Error(`Node with id ${id} not found`);
    }

    return results[0];
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    // Get all node clients first
    const clients = await db.select().from(nodeClients).where(eq(nodeClients.nodeId, id));

    // Delete in order: user_client_options -> node_clients -> node
    const batchStatements: BatchItem<"sqlite">[] = [
      // Delete all user client options for each client
      ...clients.map((client) => db.delete(userClientOptions).where(eq(userClientOptions.nodeClientId, client.id))),
      // Delete all node clients
      db.delete(nodeClients).where(eq(nodeClients.nodeId, id)),
      // Delete the node
      db.delete(nodes).where(eq(nodes.id, id)),
    ];

    if (batchStatements.length > 0) {
      await db.batch(batchStatements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    }
  }
}

export const nodeService = new NodeService();

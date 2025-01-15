import "server-only";

import crypto from "crypto";
import { and, eq } from "drizzle-orm";

import { type NodeClient } from "@/types";
import db from "../db";
import { nodeClients } from "../db/schema";

class NodeClientService {
  async getAll(): Promise<NodeClient[]> {
    return db.select().from(nodeClients);
  }

  async get(id: string): Promise<NodeClient | null> {
    const results = await db.select().from(nodeClients).where(eq(nodeClients.id, id)).limit(1);
    return results[0] || null;
  }

  async create(data: Omit<NodeClient, "id" | "createdAt" | "updatedAt">): Promise<NodeClient> {
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
    await db.delete(nodeClients).where(eq(nodeClients.id, id));
  }

  async findByNodeAndUser(nodeId: string, userId: string): Promise<NodeClient | null> {
    const results = await db
      .select()
      .from(nodeClients)
      .where(and(eq(nodeClients.nodeId, nodeId), eq(nodeClients.userId, userId)))
      .limit(1);
    return results[0] || null;
  }

  async createOrUpdate(
    nodeId: string,
    userId: string,
    data: Omit<NodeClient, "id" | "nodeId" | "userId" | "createdAt" | "updatedAt">
  ): Promise<NodeClient> {
    const existing = await this.findByNodeAndUser(nodeId, userId);
    if (existing) {
      return this.update(existing.id, data);
    } else {
      return this.create({ ...data, nodeId, userId });
    }
  }
}

export const nodeClientService = new NodeClientService();

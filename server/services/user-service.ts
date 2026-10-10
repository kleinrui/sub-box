import "server-only";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { User } from "@/types";
import { type Database, db } from "../db";
import { userClientOptions, users } from "../db/schema";

class UserService {
  private dbPromise: Promise<Database>;

  constructor() {
    this.dbPromise = db();
  }

  private async getDb() {
    return await this.dbPromise;
  }

  async getAll(): Promise<User[]> {
    const db = await this.getDb();
    return db.select().from(users);
  }

  async get(id: string): Promise<User | null> {
    const db = await this.getDb();
    const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return results[0] || null;
  }

  async create(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(users).values(item).returning();
    if (!results[0]) {
      throw new Error("Failed to create user");
    }
    return results[0];
  }

  async update(id: string, data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): Promise<User> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    const results = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

    if (!results[0]) {
      throw new Error(`User with id ${id} not found`);
    }

    return results[0];
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    const batchStatements: BatchItem<"sqlite">[] = [
      // Delete all user client options
      db.delete(userClientOptions).where(eq(userClientOptions.userId, id)),
      // Delete the user
      db.delete(users).where(eq(users.id, id)),
    ];

    if (batchStatements.length > 0) {
      await db.batch(batchStatements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    }
  }

  async findBySubscriptionKey(subscriptionKey: string): Promise<User | null> {
    const db = await this.getDb();
    const results = await db.select().from(users).where(eq(users.subscriptionKey, subscriptionKey)).limit(1);
    return results[0] || null;
  }
}

export const userService = new UserService();

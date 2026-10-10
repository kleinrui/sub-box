import "server-only";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import type { Subconverter, SubconverterRow } from "@/types";
import { type Database, db } from "../db";
import { subconverters, users } from "../db/schema";

function rowToSubconverter(row: SubconverterRow): Subconverter {
  return {
    ...row,
  };
}

class SubconverterService {
  private dbPromise: Promise<Database>;

  constructor() {
    this.dbPromise = db();
  }

  private async getDb() {
    return await this.dbPromise;
  }

  async getAll(): Promise<Subconverter[]> {
    const db = await this.getDb();
    const results = await db.select().from(subconverters);
    return results.map(rowToSubconverter);
  }

  async get(id: string): Promise<Subconverter | null> {
    const db = await this.getDb();
    const results = await db.select().from(subconverters).where(eq(subconverters.id, id)).limit(1);

    return results[0] ? rowToSubconverter(results[0]) : null;
  }

  async create(data: Omit<Subconverter, "id" | "createdAt" | "updatedAt">): Promise<Subconverter> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(subconverters).values(item).returning();
    if (!results[0]) {
      throw new Error("Failed to create subconverter");
    }
    return rowToSubconverter(results[0]);
  }

  async update(id: string, data: Partial<Omit<Subconverter, "id" | "createdAt" | "updatedAt">>): Promise<Subconverter> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    const results = await db.update(subconverters).set(updateData).where(eq(subconverters.id, id)).returning();

    if (!results[0]) {
      throw new Error(`Subconverter with id ${id} not found`);
    }

    return rowToSubconverter(results[0]);
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.batch([
      // Set subconverterId to null for all users using this subconverter
      db.update(users).set({ subconverterId: null }).where(eq(users.subconverterId, id)),
      // Delete the subconverter
      db.delete(subconverters).where(eq(subconverters.id, id)),
    ]);
  }
}

export const subconverterService = new SubconverterService();

import "server-only";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { parseClashRulesYaml } from "@/lib/clash-rules";
import type { ClashConfig } from "@/types";
import { type Database, db } from "../db";
import { clashConfigs } from "../db/schema";

// Define type for Clash configuration object
type ClashYamlConfig = {
  rules?: unknown[];
  [key: string]: unknown;
};

class ClashConfigService {
  private dbPromise: Promise<Database>;

  constructor() {
    this.dbPromise = db();
  }

  private async getDb() {
    return await this.dbPromise;
  }

  async getAll(): Promise<ClashConfig[]> {
    const db = await this.getDb();
    return db.select().from(clashConfigs);
  }

  async get(id: string): Promise<ClashConfig | null> {
    const db = await this.getDb();
    const results = await db.select().from(clashConfigs).where(eq(clashConfigs.id, id)).limit(1);
    return results[0] || null;
  }

  async create(data: Omit<ClashConfig, "id" | "createdAt" | "updatedAt">): Promise<ClashConfig> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(clashConfigs).values(item).returning();
    if (!results[0]) {
      throw new Error("Failed to create subscription source");
    }
    return results[0];
  }

  async update(id: string, data: Partial<Omit<ClashConfig, "id" | "createdAt" | "updatedAt">>): Promise<ClashConfig> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    const results = await db.update(clashConfigs).set(updateData).where(eq(clashConfigs.id, id)).returning();

    if (!results[0]) {
      throw new Error(`Config with id ${id} not found`);
    }

    return results[0];
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(clashConfigs).where(eq(clashConfigs.id, id));
  }

  async mergeConfig(baseYaml: string, config: ClashConfig): Promise<string> {
    let finalConfig: ClashYamlConfig = parseYaml(baseYaml);

    // Step 1: Merge global config if exists
    if (config.globalConfig) {
      const globalConfig: ClashYamlConfig = parseYaml(config.globalConfig);

      // Create a new object with the order from globalConfig first
      const orderedConfig: ClashYamlConfig = {};

      // First, add all keys from globalConfig
      for (const key in globalConfig) {
        orderedConfig[key] = globalConfig[key];
      }

      // Then, add remaining keys from finalConfig that don't exist in globalConfig
      for (const key in finalConfig) {
        if (!(key in orderedConfig)) {
          orderedConfig[key] = finalConfig[key];
        }
      }

      finalConfig = orderedConfig;
    }

    // Step 2: Prepend rules if exists
    if (config.rules?.trim()) {
      const newRules = parseClashRulesYaml(config.rules);

      if (newRules.length > 0) {
        if (!finalConfig.rules) {
          finalConfig.rules = [];
        }

        finalConfig.rules = [...newRules, ...finalConfig.rules];
      }
    }

    return stringifyYaml(finalConfig);
  }
}

export const clashConfigService = new ClashConfigService();

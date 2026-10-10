import { relations } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Notice for cursor AI:
// after change the schema, you need to run the following commands:
// run `bun db:generate` to generate migration file
// run `bun d1:migrate:local` to migrate the schema

// User table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subscriptionKey: text("subscription_key").notNull().unique(),
  subconverterId: text("subconverter_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// User relations
export const usersRelations = relations(users, ({ one }) => ({
  subconverter: one(subconverters, {
    fields: [users.subconverterId],
    references: [subconverters.id],
  }),
}));

// Subconverter table
export const subconverters = sqliteTable("subconverters", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  options: text("options").notNull(), // URL query string format
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Clash Config table
export const clashConfigs = sqliteTable("clash_configs", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  globalConfig: text("global_config"), // YAML string
  rules: text("rules"), // YAML list
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Node table
export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("custom"), // 3x-ui, external-subscription, custom
  host: text("host"),
  accessUrl: text("access_url"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Node Client table
export const nodeClients = sqliteTable("node_clients", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  url: text("url").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Node Client relations
export const nodeClientsRelations = relations(nodeClients, ({ one }) => ({
  node: one(nodes, {
    fields: [nodeClients.nodeId],
    references: [nodes.id],
  }),
}));

// User Client Options table
export const userClientOptions = sqliteTable(
  "user_client_options",
  {
    userId: text("user_id").notNull(),
    nodeClientId: text("node_client_id").notNull(),
    enable: integer("enable", { mode: "boolean" }).notNull().default(true),
    order: integer("order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.nodeClientId),
  })
);

// User Client Options relations
export const userClientOptionsRelations = relations(userClientOptions, ({ one }) => ({
  user: one(users, {
    fields: [userClientOptions.userId],
    references: [users.id],
  }),
  nodeClient: one(nodeClients, {
    fields: [userClientOptions.nodeClientId],
    references: [nodeClients.id],
  }),
}));

// API Token：只保存 SHA-256 哈希，完整凭据只在创建时返回。
export const apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  permission: text("permission", { enum: ["read", "write"] }).notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
});

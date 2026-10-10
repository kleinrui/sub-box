import type { InferSelectModel } from "drizzle-orm";

import type { clashConfigs, nodeClients, nodes, subconverters, userClientOptions, users } from "@/server/db/schema";

// User Model
export type User = InferSelectModel<typeof users>;

// Subconverter Model
export type SubconverterRow = InferSelectModel<typeof subconverters>;
export interface Subconverter extends Omit<SubconverterRow, "options"> {
  options: string;
}

// Clash Config Model
export type ClashConfig = InferSelectModel<typeof clashConfigs>;

// Node Model
export type Node = InferSelectModel<typeof nodes>;

// Node Client Model
export type NodeClient = InferSelectModel<typeof nodeClients>;

export type UserClientOption = InferSelectModel<typeof userClientOptions>;

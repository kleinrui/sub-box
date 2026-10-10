import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";

import { env } from "@/env";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  client?: D1Database;
};

export let client: D1Database | undefined;

export const db = async () => {
  /**
   * Don't call getRequestContext() at the top level
   */
  client = globalForDb.client ?? (await getCloudflareContext({ async: true })).env.DB;
  if (env.NODE_ENV !== "production") globalForDb.client = client;
  return drizzle(client, { schema });
};

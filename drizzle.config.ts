import type { Config } from "drizzle-kit";

import { env } from "@/env";

if (
  (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_D1_DATABASE_ID || !env.CLOUDFLARE_TOKEN) &&
  (process.argv.includes("studio") || process.argv.includes("push") || process.argv.includes("migrate") || process.argv.includes("check"))
) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_TOKEN are required to run drizzle-kit studio|migrations|push|check commands");
}

/**
 * It's not necessary to have valid the CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_TOKEN
 * to generate migrations
 */

export default {
  schema: "./server/db/schema.ts",
  verbose: true,
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: env.CLOUDFLARE_ACCOUNT_ID ?? "sk_invalid",
    databaseId: env.CLOUDFLARE_D1_DATABASE_ID ?? "sk_invalid",
    token: env.CLOUDFLARE_TOKEN ?? "sk_invalid",
  },
  tablesFilter: [`t3-cloudflare_*`],
} satisfies Config;

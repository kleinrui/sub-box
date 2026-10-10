import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/*
 * Using process.env instead of getRequestContext().env because this validation is shared between next and drizzle-kit config
 */

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    LOCAL_DB_PATH: z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_D1_DATABASE_ID: z.string().optional(),
    CLOUDFLARE_TOKEN: z.string().optional(),
    DEPLOY_TARGET: z.enum(["cloudflare", "docker"]),

    ADMIN_USERNAME: z.string(),
    ADMIN_PASSWORD: z.string(),
    JWT_SECRET: z.string(),
    SESSION_TAG: z.string(),
    SESSION_DURATION: z.coerce.number().int().positive().default(2592000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    LOCAL_DB_PATH: process.env.LOCAL_DB_PATH,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_D1_DATABASE_ID: process.env.CLOUDFLARE_D1_DATABASE_ID,
    CLOUDFLARE_TOKEN: process.env.CLOUDFLARE_TOKEN,
    DEPLOY_TARGET: process.env.DEPLOY_TARGET,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_TAG: process.env.SESSION_TAG,
    SESSION_DURATION: process.env.SESSION_DURATION,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

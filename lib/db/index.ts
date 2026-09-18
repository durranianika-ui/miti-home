import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import { Pool as NodePgPool } from "pg";
import * as schema from "./schema.ts";

const connectionString = process.env.DATABASE_URL ?? "";

/**
 * Neon's WebSocket pool (production/preview) supports transactions but can only
 * reach Neon endpoints. A plain local Postgres (docker, embedded-postgres, CI)
 * is reached through node-postgres instead. Both expose the same Drizzle API.
 */
function isLocalPostgres(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function createDb() {
  if (isLocalPostgres(connectionString)) {
    const pool = new NodePgPool({ connectionString, max: 10 });
    return drizzleNodePostgres(pool, { schema }) as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
  }

  const pool = new NeonPool({ connectionString });
  return drizzleNeon(pool, { schema });
}

export const db = createDb();

// Export all schema for easy access
export * from "./schema.ts";

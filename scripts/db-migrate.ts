/**
 * Applies the SQL migrations in ./drizzle to DATABASE_URL.
 * Works for Neon (WebSocket pool) and plain/local Postgres (node-postgres).
 *   npm run db:migrate
 */
import "dotenv/config";
import path from "node:path";
import { migrate as migrateNodePostgres } from "drizzle-orm/node-postgres/migrator";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { db } from "../lib/db/index.ts";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const host = new URL(process.env.DATABASE_URL).hostname;
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  console.log(`Applying migrations from ${migrationsFolder} to ${host}…`);

  if (isLocal) {
    await migrateNodePostgres(db as never, { migrationsFolder });
  } else {
    await migrateNeon(db, { migrationsFolder });
  }

  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

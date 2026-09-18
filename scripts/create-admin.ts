/**
 * Creates (or promotes) a Miti Home admin account.
 *
 *   npm run admin:create -- --email owner@mitihome.ae --name "Owner" --password "a-long-passphrase"
 *   npm run admin:create -- --email existing@customer.com          # promote an existing account
 *
 * Passwords are hashed by Better Auth; nothing is logged.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.ts";
import { db } from "../lib/db/index.ts";
import { user } from "../lib/db/schema.ts";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Miti Home Admin";
  const password = arg("password");

  if (!email) throw new Error("Pass --email");

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!existing) {
    if (!password || password.length < 12) {
      throw new Error("New admin accounts need --password with at least 12 characters");
    }
    await auth.api.signUpEmail({ body: { email, password, name } });
  }

  await db.update(user).set({ role: "admin", updatedAt: new Date() }).where(eq(user.email, email));
  console.log(`✓ ${email} is an admin${existing ? " (promoted existing account)" : " (new account)"}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Could not create admin:", error instanceof Error ? error.message : error);
  process.exit(1);
});

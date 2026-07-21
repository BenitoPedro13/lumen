import { createHash, randomBytes } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema.ts";

/**
 * Backfill script for multi-user migration.
 *
 * This script:
 * 1. Creates an initial user (Benito) with a generated token
 * 2. Creates a default "Mine" private space for that user
 * 3. Creates a "Legacy" shared space for backfilled data
 * 4. Backfills all pre-migration entries into the Legacy space
 * 5. Prints the generated token so you can configure it
 *
 * Run this AFTER: pnpm --filter @lumen/db db:migrate (to create the new tables)
 * Run this BEFORE: any new entries are logged
 */

async function backfill() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("🚀 Starting multi-user backfill...\n");

  try {
    // Generate token
    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    console.log("📝 Creating user 'Benito'...");
    const [user] = await db
      .insert(schema.users)
      .values({
        name: "Benito",
        tokenHash,
        ntfyTopic: process.env.NTFY_TOPIC || null,
      })
      .returning();

    console.log(`✅ User created: id=${user.id}`);

    // Create default private space
    console.log("📝 Creating default 'Mine' private space...");
    const [defaultSpace] = await db
      .insert(schema.spaces)
      .values({
        name: "Mine",
        kind: "journal",
        createdBy: user.id,
        inviteCode: null,
      })
      .returning();

    console.log(`✅ Default space created: id=${defaultSpace.id}`);

    // Create membership for default space
    await db
      .insert(schema.spaceMembers)
      .values({
        spaceId: defaultSpace.id,
        userId: user.id,
        isDefault: true,
      });

    console.log("📝 Creating 'Legacy' shared space for backfilled data...");
    const inviteCode = randomBytes(12)
      .toString("hex")
      .split("")
      .map((c) => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[parseInt(c, 16) % 62])
      .join("");

    const [legacySpace] = await db
      .insert(schema.spaces)
      .values({
        name: "Legacy",
        kind: "journal",
        createdBy: user.id,
        inviteCode,
      })
      .returning();

    console.log(`✅ Legacy space created: id=${legacySpace.id}, code=${inviteCode}`);

    // Create membership for legacy space
    await db
      .insert(schema.spaceMembers)
      .values({
        spaceId: legacySpace.id,
        userId: user.id,
        isDefault: false,
      });

    // Backfill existing entries to Legacy space
    console.log("📝 Backfilling existing entries...");
    await db.execute(`
      UPDATE entries
      SET space_id = ${legacySpace.id},
          created_by = ${user.id},
          kind = 'log'
      WHERE space_id IS NULL
    `);

    console.log(`✅ Backfilled entries`);

    console.log("\n🎉 Backfill complete!\n");
    console.log("=".repeat(60));
    console.log("YOUR GENERATED TOKEN (save this somewhere safe):");
    console.log("=".repeat(60));
    console.log(token);
    console.log("=".repeat(60));
    console.log("\nUser setup:");
    console.log(`  - User ID: ${user.id}`);
    console.log(`  - User name: Benito`);
    console.log(`  - Default space: ${defaultSpace.id} (Mine)`);
    console.log(`  - Legacy space: ${legacySpace.id} (for backfilled entries)`);
    console.log("\nNext steps:");
    console.log("  1. Store the token above somewhere safe");
    console.log("  2. Add to your .env: LUMEN_API_TOKEN=<token>");
  } catch (err) {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  }
}

backfill();

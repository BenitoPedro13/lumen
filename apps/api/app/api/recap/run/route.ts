import { and, desc, entries, eq, gte, inArray, lt, recapLog, sql } from "@lumen/db";

import { isAuthorizedCron } from "@/lib/auth";
import { db } from "@/lib/db";
import { recap } from "@/lib/llm";
import { pushNotification } from "@/lib/ntfy";
import { onThisDayCallbacks } from "@/lib/on-this-day";
import { currentStats } from "@/lib/stats";
import { spaces, spaceMembers, users } from "@lumen/db";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Vercel Cron hits this with GET, not POST — see apps/api/vercel.ts and
// docs/architecture/overview.md §6.3/§9. Errors are logged, not surfaced, same as
// /log and /ask: there's no one listening for a 500 here either.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get all users with ntfy topics configured
    const allUsers = await db.select().from(users).where(sql`${users.ntfyTopic} IS NOT NULL`);

    // Process each user's recap separately so one failure doesn't block others
    for (const user of allUsers) {
      try {
        // Get user's journal spaces (private + shared journals they're part of)
        const userJournalSpaces = await db
          .select({ id: spaces.id })
          .from(spaceMembers)
          .innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
          .where(and(eq(spaceMembers.userId, user.id), eq(spaces.kind, "journal")));

        if (userJournalSpaces.length === 0) {
          continue; // Skip users with no journal spaces
        }

        const spaceIds = userJournalSpaces.map((s) => s.id);

        const weekStart = new Date(Date.now() - SEVEN_DAYS_MS);
        const priorWeekStart = new Date(Date.now() - 2 * SEVEN_DAYS_MS);

        const [rows, [priorWeekCountRow], stats, callbacks] = await Promise.all([
          db
            .select()
            .from(entries)
            .where(and(inArray(entries.spaceId, spaceIds), gte(entries.occurredAt, weekStart)))
            .orderBy(desc(entries.occurredAt)),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(entries)
            .where(
              and(
                inArray(entries.spaceId, spaceIds),
                gte(entries.occurredAt, priorWeekStart),
                lt(entries.occurredAt, weekStart),
              ),
            ),
          currentStats(user.id),
          onThisDayCallbacks(spaceIds),
        ]);
        const priorWeekCount = priorWeekCountRow?.count ?? 0;

        const categoryCounts = rows.reduce<Record<string, number>>((acc, row) => {
          acc[row.category] = (acc[row.category] ?? 0) + 1;
          return acc;
        }, {});

        const statsContext = [
          `${rows.length} entries this week (${priorWeekCount} the week before).`,
          `Current logging streak: ${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}.`,
          Object.keys(categoryCounts).length
            ? `Categories this week: ${Object.entries(categoryCounts)
                .map(([category, count]) => `${category} x${count}`)
                .join(", ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        const result = await recap(
          rows.map((row) => ({
            occurredAt: row.occurredAt,
            category: row.category,
            summary: row.summary,
          })),
          statsContext,
          callbacks,
        );

        // Persist recap log
        await db.insert(recapLog).values({
          userId: user.id,
          kind: "weekly",
          text: result.recap,
        });

        await pushNotification(result.recap, "Weekly recap", user.ntfyTopic!);
      } catch (userErr) {
        console.error(`Recap failed for user ${user.id}:`, userErr);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("GET /api/recap/run failed", err);
    return Response.json({ ok: true });
  }
}

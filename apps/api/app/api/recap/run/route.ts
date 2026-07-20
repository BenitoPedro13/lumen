import { and, desc, entries, gte, lt, sql } from "@lumen/db";

import { isAuthorizedCron } from "@/lib/auth";
import { db } from "@/lib/db";
import { recap } from "@/lib/llm";
import { pushRecap } from "@/lib/ntfy";
import { currentStats } from "@/lib/stats";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Vercel Cron hits this with GET, not POST — see apps/api/vercel.ts and
// docs/architecture/overview.md §6.3/§9. Errors are logged, not surfaced, same as
// /log and /ask: there's no one listening for a 500 here either.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const weekStart = new Date(Date.now() - SEVEN_DAYS_MS);
    const priorWeekStart = new Date(Date.now() - 2 * SEVEN_DAYS_MS);

    const [rows, [priorWeekCountRow], stats] = await Promise.all([
      db
        .select()
        .from(entries)
        .where(gte(entries.occurredAt, weekStart))
        .orderBy(desc(entries.occurredAt)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(entries)
        .where(and(gte(entries.occurredAt, priorWeekStart), lt(entries.occurredAt, weekStart))),
      currentStats(),
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
    );

    await pushRecap(result.recap);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("GET /api/recap/run failed", err);
    return Response.json({ ok: true });
  }
}

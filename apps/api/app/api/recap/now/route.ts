import { and, desc, entries, eq, gte, inArray, spaceMembers, spaces } from "@lumen/db";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { recap } from "@/lib/llm";
import { onThisDayCallbacks } from "@/lib/on-this-day";
import { weeklyTaskLeaderboard } from "@/lib/spaces";
import { currentStats } from "@/lib/stats";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// On-demand version of GET /api/recap/run's weekly recap — same logic, spoken
// back immediately via Siri instead of waiting for Sunday's push, and not
// persisted to recap_log (ephemeral, same as /ask's answers).
export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ recap: "I couldn't verify that request." });
  }

  try {
    const userJournalSpaces = await db
      .select({ id: spaces.id })
      .from(spaceMembers)
      .innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
      .where(and(eq(spaceMembers.userId, user.id), eq(spaces.kind, "journal")));

    if (userJournalSpaces.length === 0) {
      return Response.json({ recap: "You don't have any journal spaces set up yet." });
    }

    const spaceIds = userJournalSpaces.map((s) => s.id);
    const weekStart = new Date(Date.now() - SEVEN_DAYS_MS);

    const sharedTaskSpaces = await db
      .select({ id: spaces.id, name: spaces.name })
      .from(spaceMembers)
      .innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
      .where(and(eq(spaceMembers.userId, user.id), eq(spaces.kind, "tasks")));

    const [rows, stats, callbacks, taskLeaderboards] = await Promise.all([
      db
        .select()
        .from(entries)
        .where(and(inArray(entries.spaceId, spaceIds), gte(entries.occurredAt, weekStart)))
        .orderBy(desc(entries.occurredAt)),
      currentStats(user.id),
      onThisDayCallbacks(spaceIds),
      Promise.all(
        sharedTaskSpaces.map(async (space) => ({
          name: space.name,
          leaderboard: await weeklyTaskLeaderboard(space.id, weekStart),
        })),
      ),
    ]);

    const categoryCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.category] = (acc[row.category] ?? 0) + 1;
      return acc;
    }, {});

    const statsContext = [
      `${rows.length} entries this week.`,
      `Current logging streak: ${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}.`,
      Object.keys(categoryCounts).length
        ? `Categories this week: ${Object.entries(categoryCounts)
            .map(([category, count]) => `${category} x${count}`)
            .join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const taskContext = taskLeaderboards
      .filter((t) => t.leaderboard.length > 0)
      .map(
        (t) =>
          `"${t.name}": ${t.leaderboard.map((entry) => `${entry.userName} completed ${entry.points} points`).join(", ")}.`,
      )
      .join(" ");

    const result = await recap(
      rows.map((row) => ({ occurredAt: row.occurredAt, category: row.category, summary: row.summary })),
      statsContext,
      callbacks,
      taskContext || undefined,
    );

    return Response.json({ recap: result.recap });
  } catch (err) {
    console.error("POST /api/recap/now failed", err);
    return Response.json({ recap: "Something went wrong pulling that recap together — try again in a bit." });
  }
}

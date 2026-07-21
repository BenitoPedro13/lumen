import { and, desc, entries, eq, inArray, recapLog, sql } from "@lumen/db";

import { isAuthorizedCron } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkInNudge, dailyNote } from "@/lib/llm";
import { pushNotification } from "@/lib/ntfy";
import { spaces, spaceMembers, users } from "@lumen/db";

// A one-shot check-in window, not "> 48h" unbounded — with a daily cron this
// fires exactly once per silence stretch instead of nagging every day she
// stays quiet. See docs/architecture/roadmap.md §1 "proactive nudges".
const SILENCE_MIN_HOURS = 48;
const SILENCE_MAX_HOURS = 72;

// Runs daily (Mon-Sat — Sunday is covered by the weekly recap instead, see
// apps/api/vercel.ts) via Vercel Cron, same GET + CRON_SECRET auth as
// /api/recap/run. Sends at most one notification: a light daily note if
// anything was logged today, otherwise a gentle check-in nudge if she's gone
// quiet for a couple of days, otherwise nothing at all.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get all users with ntfy topics configured
    const allUsers = await db.select().from(users).where(sql`${users.ntfyTopic} IS NOT NULL`);

    // Process each user's daily note separately
    for (const user of allUsers) {
      try {
        // Get user's journal spaces
        const userJournalSpaces = await db
          .select({ id: spaces.id })
          .from(spaceMembers)
          .innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
          .where(and(eq(spaceMembers.userId, user.id), eq(spaces.kind, "journal")));

        if (userJournalSpaces.length === 0) {
          continue;
        }

        const spaceIds = userJournalSpaces.map((s) => s.id);

        // Compare local calendar dates in Postgres, same pattern as lib/stats.ts
        const todayRows = await db
          .select()
          .from(entries)
          .where(
            and(
              inArray(entries.spaceId, spaceIds),
              sql`(${entries.occurredAt} at time zone 'Europe/Amsterdam')::date = (now() at time zone 'Europe/Amsterdam')::date`,
            ),
          )
          .orderBy(desc(entries.occurredAt));

        if (todayRows.length > 0) {
          const result = await dailyNote(
            todayRows.map((row) => ({
              occurredAt: row.occurredAt,
              category: row.category,
              summary: row.summary,
            })),
          );

          // Persist daily note
          await db.insert(recapLog).values({
            userId: user.id,
            kind: "daily",
            text: result.note,
          });

          await pushNotification(result.note, "Daily note", user.ntfyTopic!);
          continue;
        }

        // Check for silence
        const [mostRecent] = await db
          .select()
          .from(entries)
          .where(inArray(entries.spaceId, spaceIds))
          .orderBy(desc(entries.createdAt))
          .limit(1);

        const hoursSinceLastLog = mostRecent
          ? (Date.now() - mostRecent.createdAt.getTime()) / (60 * 60 * 1000)
          : Infinity;

        if (hoursSinceLastLog >= SILENCE_MIN_HOURS && hoursSinceLastLog < SILENCE_MAX_HOURS) {
          const recentRows = await db
            .select()
            .from(entries)
            .where(inArray(entries.spaceId, spaceIds))
            .orderBy(desc(entries.createdAt))
            .limit(10);

          const result = await checkInNudge(
            recentRows.map((row) => ({
              occurredAt: row.occurredAt,
              category: row.category,
              summary: row.summary,
            })),
          );

          // Persist check-in nudge
          await db.insert(recapLog).values({
            userId: user.id,
            kind: "nudge",
            text: result.text,
          });

          await pushNotification(result.text, "Checking in", user.ntfyTopic!);
        }
      } catch (userErr) {
        console.error(`Daily note failed for user ${user.id}:`, userErr);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("GET /api/recap/daily failed", err);
    return Response.json({ ok: true });
  }
}

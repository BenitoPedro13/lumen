import { and, desc, entries, eq, sql } from "@lumen/db";
import { z } from "zod";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { extract, extractTask, resolveSpace } from "@/lib/llm";
import { userSpaces } from "@/lib/spaces";
import { milestoneHints, statsForNewEntry } from "@/lib/stats";

const LogBody = z.object({ text: z.string().min(1) });

// How recent the last log has to be for a new dictation to even be
// considered a correction to it, rather than an unrelated new log — see
// docs/architecture/roadmap.md §1 "correction flow".
const CORRECTION_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ confirmation: "I couldn't verify that request." });
  }

  const parsed = LogBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ confirmation: "I didn't catch anything to log there." });
  }

  try {
    const spaces = await userSpaces(user.id);
    if (spaces.length === 0) {
      return Response.json({ confirmation: "You don't have any spaces set up yet." });
    }

    const space = await resolveSpace(parsed.data.text, spaces);

    if (space.kind === "journal") {
      return await handleJournalLog(user.id, space.id, parsed.data.text);
    } else if (space.kind === "tasks") {
      return await handleTaskLog(user.id, space.id, parsed.data.text);
    } else {
      return Response.json({ confirmation: "Unknown space kind." });
    }
  } catch (err) {
    console.error("POST /api/log failed", err);
    return Response.json({ confirmation: "Something went wrong logging that — try again in a bit." });
  }
}

async function handleJournalLog(userId: number, spaceId: number, text: string): Promise<Response> {
  const [stats, [mostRecent]] = await Promise.all([
    statsForNewEntry(userId),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.createdBy, userId), eq(entries.spaceId, spaceId), eq(entries.kind, "log")))
      .orderBy(desc(entries.createdAt))
      .limit(1),
  ]);

  const withinCorrectionWindow =
    mostRecent !== undefined && Date.now() - mostRecent.createdAt.getTime() < CORRECTION_WINDOW_MS;

  const hints = withinCorrectionWindow ? [] : milestoneHints(stats);

  const extraction = await extract(
    text,
    hints,
    withinCorrectionWindow ? { rawText: mostRecent.rawText, summary: mostRecent.summary } : undefined,
  );

  if (extraction.is_correction && withinCorrectionWindow) {
    await db
      .update(entries)
      .set({
        occurredAt: new Date(extraction.occurred_at),
        rawText: `${mostRecent.rawText} (corrected: ${text})`,
        category: extraction.category,
        summary: extraction.summary,
        data: extraction.data,
      })
      .where(eq(entries.id, mostRecent.id));
  } else {
    await db.insert(entries).values({
      spaceId,
      createdBy: userId,
      kind: "log",
      occurredAt: new Date(extraction.occurred_at),
      rawText: text,
      category: extraction.category,
      summary: extraction.summary,
      data: extraction.data,
    });
  }

  return Response.json({ confirmation: extraction.confirmation });
}

async function handleTaskLog(userId: number, spaceId: number, text: string): Promise<Response> {
  // Fetch open tasks in this space for context
  const openTasks = await db
    .select({
      id: entries.id,
      title: entries.summary,
    })
    .from(entries)
    .where(and(eq(entries.spaceId, spaceId), eq(entries.kind, "task"), sql`${entries.data}->'done' != 'true'`));

  const action = await extractTask(text, openTasks);

  if (action.action === "add") {
    await db.insert(entries).values({
      spaceId,
      createdBy: userId,
      kind: "task",
      occurredAt: new Date(action.dueAt || new Date().toISOString()),
      rawText: text,
      category: "task",
      summary: action.title,
      data: {
        done: false,
        points: action.points,
        dueAt: action.dueAt,
      },
    });
  } else if (action.action === "complete") {
    // Validate that the matched entry is actually in the open tasks list
    if (action.matchedEntryId !== null) {
      const taskExists = openTasks.some((t) => t.id === action.matchedEntryId);
      if (!taskExists) {
        return Response.json({ confirmation: "I couldn't find that task." });
      }

      await db
        .update(entries)
        .set({
          data: {
            done: true,
            completedBy: userId,
            completedAt: new Date().toISOString(),
          },
        })
        .where(eq(entries.id, action.matchedEntryId));
    } else {
      return Response.json({ confirmation: "I couldn't find that task." });
    }
  }

  return Response.json({ confirmation: action.confirmation });
}

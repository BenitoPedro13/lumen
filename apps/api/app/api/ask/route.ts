import { and, desc, entries, eq, gte, inArray, lte, sql, users } from "@lumen/db";
import { z } from "zod";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { answer, resolveSpace, scopeQuery } from "@/lib/llm";
import { userSpaces } from "@/lib/spaces";

const AskBody = z.object({ question: z.string().min(1) });

export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ answer: "I couldn't verify that request." });
  }

  const parsed = AskBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ answer: "I didn't catch a question there." });
  }

  try {
    const spaces = await userSpaces(user.id);
    if (spaces.length === 0) {
      return Response.json({ answer: "You don't have any spaces set up yet." });
    }

    const space = await resolveSpace(parsed.data.question, spaces);

    if (space.kind === "journal") {
      return await handleJournalAsk(user.id, space.id, parsed.data.question);
    } else if (space.kind === "tasks") {
      return await handleTaskAsk(user.id, space.id, parsed.data.question);
    } else {
      return Response.json({ answer: "Unknown space kind." });
    }
  } catch (err) {
    console.error("POST /api/ask failed", err);
    return Response.json({ answer: "Something went wrong answering that — try again in a bit." });
  }
}

async function handleJournalAsk(userId: number, spaceId: number, question: string): Promise<Response> {
  const scope = await scopeQuery(question);

  const conditions = [eq(entries.spaceId, spaceId)];
  if (scope.from) conditions.push(gte(entries.occurredAt, new Date(scope.from)));
  if (scope.to) conditions.push(lte(entries.occurredAt, new Date(scope.to)));

  const rows = await db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(desc(entries.occurredAt))
    .limit(200);

  const result = await answer(
    question,
    rows.map((row) => ({
      occurredAt: row.occurredAt,
      category: row.category,
      summary: row.summary,
    })),
  );
  return Response.json({ answer: result.answer });
}

async function handleTaskAsk(userId: number, spaceId: number, question: string): Promise<Response> {
  // Fetch tasks in this space (done and open) for context and leaderboard
  const taskRows = await db
    .select({
      id: entries.id,
      title: entries.summary,
      points: sql<number>`(${entries.data}->>'points')::int`,
      done: sql<boolean>`(${entries.data}->>'done')::boolean`,
      completedBy: sql<number | null>`(${entries.data}->>'completedBy')::bigint`,
    })
    .from(entries)
    .where(and(eq(entries.spaceId, spaceId), eq(entries.kind, "task")))
    .orderBy(desc(entries.occurredAt));

  // Compute leaderboard (sum points by completedBy for done tasks)
  const leaderboard: Record<number, number> = {};
  const userNames: Record<number, string> = {};

  for (const task of taskRows) {
    if (task.done && task.completedBy !== null) {
      leaderboard[task.completedBy] = (leaderboard[task.completedBy] ?? 0) + (task.points ?? 0);
    }
  }

  // Fetch user names for leaderboard display
  if (Object.keys(leaderboard).length > 0) {
    const leaderboardUserIds = Object.keys(leaderboard).map(Number);
    const userRows = await db.select().from(users).where(inArray(users.id, leaderboardUserIds));

    for (const user of userRows) {
      userNames[user.id] = user.name;
    }
  }

  const leaderboardText = Object.entries(leaderboard)
    .sort(([, a], [, b]) => b - a)
    .map(([uid, points]) => `${userNames[Number(uid)] || "Unknown"}: ${points}`)
    .join(", ");

  const taskContext =
    taskRows.length > 0
      ? `Tasks in this space: ${taskRows.map((t) => `"${t.title}" (${t.done ? "done" : "open"}, ${t.points} points)`).join("; ")}.`
      : "No tasks in this space yet.";

  const leaderboardContext = leaderboardText ? `Current leaderboard: ${leaderboardText}` : "";
  const extraContext = [taskContext, leaderboardContext].filter(Boolean).join(" ");

  const result = await answer(question, [], extraContext);
  return Response.json({ answer: result.answer });
}

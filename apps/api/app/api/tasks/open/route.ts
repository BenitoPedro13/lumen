import { z } from "zod";

import { and, desc, entries, eq } from "@lumen/db";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { answer, resolveSpace } from "@/lib/llm";
import { userSpaces } from "@/lib/spaces";

const OpenTasksBody = z.object({ text: z.string().default("") });

// A fast, structured "what's left" read-out for task spaces — same
// underlying answer() LLM call /ask uses for language matching, but skipping
// /ask's date-scoping step and reasoning over the raw entries table, since
// which tasks are open is already known deterministically.
export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ answer: "I couldn't verify that request." });
  }

  const parsed = OpenTasksBody.safeParse(await request.json().catch(() => ({ text: "" })));
  const text = parsed.success ? parsed.data.text : "";

  try {
    const allSpaces = await userSpaces(user.id);
    const taskSpaces = allSpaces.filter((s) => s.kind === "tasks");

    if (taskSpaces.length === 0) {
      return Response.json({ answer: "You don't have any task spaces set up yet." });
    }

    const space = await resolveSpace(text || "tasks", taskSpaces);

    const openTasks = await db
      .select()
      .from(entries)
      .where(and(eq(entries.spaceId, space.id), eq(entries.kind, "task"), eq(entries.category, "task")))
      .orderBy(desc(entries.createdAt));

    const stillOpen = openTasks.filter((t) => !(t.data as Record<string, any>)?.done);

    const taskContext =
      stillOpen.length > 0
        ? `Open tasks in "${space.name}": ${stillOpen
            .map((t) => {
              const dueAt = (t.data as Record<string, any>)?.dueAt;
              return `"${t.summary}"${dueAt ? ` (due ${dueAt})` : ""}`;
            })
            .join("; ")}.`
        : `There are no open tasks in "${space.name}" right now.`;

    const result = await answer(text || "What's left on my list?", [], taskContext);
    return Response.json({ answer: result.answer });
  } catch (err) {
    console.error("POST /api/tasks/open failed", err);
    return Response.json({ answer: "Something went wrong checking that list — try again in a bit." });
  }
}

import { and, desc, entries, eq, gte, lte } from "@lumen/db";
import { z } from "zod";

import { isAuthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { answer, scopeQuery } from "@/lib/llm";

const AskBody = z.object({ question: z.string().min(1) });

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ answer: "I couldn't verify that request." });
  }

  const parsed = AskBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ answer: "I didn't catch a question there." });
  }

  try {
    const scope = await scopeQuery(parsed.data.question);

    const conditions = [];
    if (scope.category) conditions.push(eq(entries.category, scope.category));
    if (scope.from) conditions.push(gte(entries.occurredAt, new Date(scope.from)));
    if (scope.to) conditions.push(lte(entries.occurredAt, new Date(scope.to)));

    const rows = await db
      .select()
      .from(entries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(entries.occurredAt))
      .limit(200);

    const result = await answer(
      parsed.data.question,
      rows.map((row) => ({
        occurredAt: row.occurredAt,
        category: row.category,
        summary: row.summary,
      })),
    );
    return Response.json({ answer: result.answer });
  } catch (err) {
    console.error("POST /api/ask failed", err);
    return Response.json({ answer: "Something went wrong answering that — try again in a bit." });
  }
}

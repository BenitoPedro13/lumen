import { entries } from "@lumen/db";
import { z } from "zod";

import { isAuthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { extract } from "@/lib/llm";

const LogBody = z.object({ text: z.string().min(1) });

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ confirmation: "I couldn't verify that request." });
  }

  const parsed = LogBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ confirmation: "I didn't catch anything to log there." });
  }

  try {
    const extraction = await extract(parsed.data.text);
    await db.insert(entries).values({
      occurredAt: new Date(extraction.occurred_at),
      rawText: parsed.data.text,
      category: extraction.category,
      summary: extraction.summary,
      data: extraction.data,
    });
    return Response.json({ confirmation: extraction.confirmation });
  } catch (err) {
    console.error("POST /api/log failed", err);
    return Response.json({ confirmation: "Something went wrong logging that — try again in a bit." });
  }
}

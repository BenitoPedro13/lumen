import { desc, entries, eq } from "@lumen/db";
import { z } from "zod";

import { isAuthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { extract } from "@/lib/llm";
import { milestoneHints, statsForNewEntry } from "@/lib/stats";

const LogBody = z.object({ text: z.string().min(1) });

// How recent the last log has to be for a new dictation to even be
// considered a correction to it, rather than an unrelated new log — see
// docs/architecture/roadmap.md §1 "correction flow".
const CORRECTION_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ confirmation: "I couldn't verify that request." });
  }

  const parsed = LogBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ confirmation: "I didn't catch anything to log there." });
  }

  try {
    const [stats, [mostRecent]] = await Promise.all([
      statsForNewEntry(),
      db.select().from(entries).orderBy(desc(entries.createdAt)).limit(1),
    ]);

    const withinCorrectionWindow =
      mostRecent !== undefined && Date.now() - mostRecent.createdAt.getTime() < CORRECTION_WINDOW_MS;

    // Skip milestone hints whenever a correction is plausible — statsForNewEntry()
    // predicts the count/streak assuming a fresh insert, which would be wrong if
    // this turns out to be an update to mostRecent instead. Rare miss, but never
    // a false "10th entry!" during what's actually an edit.
    const hints = withinCorrectionWindow ? [] : milestoneHints(stats);

    const extraction = await extract(
      parsed.data.text,
      hints,
      withinCorrectionWindow ? { rawText: mostRecent.rawText, summary: mostRecent.summary } : undefined,
    );

    if (extraction.is_correction && withinCorrectionWindow) {
      await db
        .update(entries)
        .set({
          occurredAt: new Date(extraction.occurred_at),
          rawText: `${mostRecent.rawText} (corrected: ${parsed.data.text})`,
          category: extraction.category,
          summary: extraction.summary,
          data: extraction.data,
        })
        .where(eq(entries.id, mostRecent.id));
    } else {
      await db.insert(entries).values({
        occurredAt: new Date(extraction.occurred_at),
        rawText: parsed.data.text,
        category: extraction.category,
        summary: extraction.summary,
        data: extraction.data,
      });
    }

    return Response.json({ confirmation: extraction.confirmation });
  } catch (err) {
    console.error("POST /api/log failed", err);
    return Response.json({ confirmation: "Something went wrong logging that — try again in a bit." });
  }
}

import { desc, entries, gte } from "@lumen/db";

import { isAuthorizedCron } from "@/lib/auth";
import { db } from "@/lib/db";
import { recap } from "@/lib/llm";
import { pushRecap } from "@/lib/ntfy";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Vercel Cron hits this with GET, not POST — see apps/api/vercel.ts and
// docs/architecture/overview.md §6.3/§9. Errors are logged, not surfaced, same as
// /log and /ask: there's no one listening for a 500 here either.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(entries)
      .where(gte(entries.occurredAt, new Date(Date.now() - SEVEN_DAYS_MS)))
      .orderBy(desc(entries.occurredAt));

    const result = await recap(
      rows.map((row) => ({
        occurredAt: row.occurredAt,
        category: row.category,
        summary: row.summary,
      })),
    );

    await pushRecap(result.recap);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("GET /api/recap/run failed", err);
    return Response.json({ ok: true });
  }
}

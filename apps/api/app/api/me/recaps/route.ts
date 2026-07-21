import { desc, eq, recapLog, sql } from "@lumen/db";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";

const RECAPS_PER_PAGE = 20;

export async function GET(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
  const offset = page * RECAPS_PER_PAGE;

  try {
    const rows = await db
      .select()
      .from(recapLog)
      .where(eq(recapLog.userId, user.id))
      .orderBy(desc(recapLog.sentAt))
      .limit(RECAPS_PER_PAGE)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(recapLog)
      .where(eq(recapLog.userId, user.id));

    return Response.json({
      recaps: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        text: row.text,
        sentAt: row.sentAt,
      })),
      pagination: {
        page,
        pageSize: RECAPS_PER_PAGE,
        total: count,
        hasMore: offset + RECAPS_PER_PAGE < count,
      },
    });
  } catch (err) {
    console.error("GET /api/me/recaps failed", err);
    return Response.json({ error: "Failed to fetch recaps" }, { status: 500 });
  }
}

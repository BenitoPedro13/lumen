import { and, desc, entries as entriesTable, eq, sql, spaceMembers } from "@lumen/db";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskLeaderboard } from "@/lib/spaces";

const ENTRIES_PER_PAGE = 50;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const spaceId = Number(id);

  if (isNaN(spaceId)) {
    return Response.json({ error: "Invalid space ID" }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
  const offset = page * ENTRIES_PER_PAGE;

  try {
    // Verify user is a member
    const [membership] = await db
      .select()
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, user.id)));

    if (!membership) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch paginated entries
    const rows = await db
      .select()
      .from(entriesTable)
      .where(eq(entriesTable.spaceId, spaceId))
      .orderBy(desc(entriesTable.occurredAt))
      .limit(ENTRIES_PER_PAGE)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(entriesTable)
      .where(eq(entriesTable.spaceId, spaceId));

    // For task spaces, compute leaderboard
    const leaderboard = rows.some((r) => r.kind === "task") ? await taskLeaderboard(spaceId) : [];

    return Response.json({
      entries: rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt,
        category: row.category,
        summary: row.summary,
        data: row.data,
        createdBy: row.createdBy,
        kind: row.kind,
      })),
      leaderboard,
      pagination: {
        page,
        pageSize: ENTRIES_PER_PAGE,
        total: count,
        hasMore: offset + ENTRIES_PER_PAGE < count,
      },
    });
  } catch (err) {
    console.error("GET /api/spaces/:id/entries failed", err);
    return Response.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

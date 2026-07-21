import { z } from "zod";

import { and, entries as entriesTable, eq, spaceMembers } from "@lumen/db";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toggleReaction } from "@/lib/spaces";

// Fixed set — keeps this a lightweight social nudge, not a free-text input.
const ReactBody = z.object({ emoji: z.enum(["🎉", "👍"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, entryId } = await params;
  const spaceId = Number(id);
  const entryIdNum = Number(entryId);

  if (isNaN(spaceId) || isNaN(entryIdNum)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const parsed = ReactBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const [membership] = await db
      .select()
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, user.id)));

    if (!membership) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    const [entry] = await db
      .select({ spaceId: entriesTable.spaceId })
      .from(entriesTable)
      .where(eq(entriesTable.id, entryIdNum));

    if (!entry || entry.spaceId !== spaceId) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    const reactions = await toggleReaction(entryIdNum, user.id, parsed.data.emoji);

    return Response.json({ reactions });
  } catch (err) {
    console.error("POST /api/spaces/:id/entries/:entryId/react failed", err);
    return Response.json({ error: "Failed to react" }, { status: 500 });
  }
}

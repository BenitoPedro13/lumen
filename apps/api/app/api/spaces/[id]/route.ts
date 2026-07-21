import { and, desc, eq, spaceMembers, spaces, users } from "@lumen/db";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSpaceStats } from "@/lib/spaces";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const spaceId = Number(id);

  if (isNaN(spaceId)) {
    return Response.json({ error: "Invalid space ID" }, { status: 400 });
  }

  try {
    // Verify user is a member of this space
    const [membership] = await db
      .select()
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, user.id)));

    if (!membership) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // Get space details
    const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId));

    if (!space) {
      return Response.json({ error: "Space not found" }, { status: 404 });
    }

    // Get members with names
    const members = await db
      .select({
        userId: spaceMembers.userId,
        userName: users.name,
        joinedAt: spaceMembers.joinedAt,
        isDefault: spaceMembers.isDefault,
      })
      .from(spaceMembers)
      .innerJoin(users, eq(spaceMembers.userId, users.id))
      .where(eq(spaceMembers.spaceId, spaceId))
      .orderBy(desc(spaceMembers.joinedAt));

    const gamification =
      space.kind === "tasks" && members.length > 1
        ? await taskSpaceStats(spaceId, members.map((m) => m.userId))
        : null;

    return Response.json({
      id: space.id,
      name: space.name,
      kind: space.kind,
      createdBy: space.createdBy,
      inviteCode: space.inviteCode,
      members,
      sharedStreak: gamification?.sharedStreak ?? 0,
      combinedPoints: gamification?.combinedPoints ?? 0,
      badges: gamification?.badges ?? [],
    });
  } catch (err) {
    console.error("GET /api/spaces/:id failed", err);
    return Response.json({ error: "Failed to fetch space" }, { status: 500 });
  }
}

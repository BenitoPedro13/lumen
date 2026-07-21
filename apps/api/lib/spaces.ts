import { randomBytes } from "crypto";

import { and, eq, isNull, signupInvites, spaceMembers, spaces, users } from "@lumen/db";

import { db } from "@/lib/db";

export interface UserSpace {
  id: number;
  name: string;
  kind: "journal" | "tasks";
  isDefault: boolean;
}

export interface SpaceWithCode extends UserSpace {
  inviteCode: string;
}

function generateInviteCode(): string {
  // Base62 (alphanumeric) invite code — 12 bytes = 96 bits of entropy, ~19 base62 chars
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(12);
  let code = "";
  for (const byte of bytes) {
    code += chars[byte % 62];
  }
  return code;
}

export async function userSpaces(userId: number): Promise<UserSpace[]> {
  const rows = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      kind: spaces.kind,
      isDefault: spaceMembers.isDefault,
    })
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
    .where(eq(spaceMembers.userId, userId));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as "journal" | "tasks",
    isDefault: row.isDefault,
  }));
}

export async function createSpace(
  userId: number,
  name: string,
  kind: "journal" | "tasks" = "journal",
): Promise<SpaceWithCode> {
  const inviteCode = generateInviteCode();

  const [space] = await db
    .insert(spaces)
    .values({
      name,
      kind,
      createdBy: userId,
      inviteCode, // All non-default spaces get invite codes
    })
    .returning();

  await db.insert(spaceMembers).values({
    spaceId: space.id,
    userId,
    isDefault: false,
  });

  return {
    id: space.id,
    name: space.name,
    kind: space.kind as "journal" | "tasks",
    isDefault: false,
    inviteCode: space.inviteCode || inviteCode,
  };
}

export async function joinSpace(userId: number, inviteCode: string): Promise<UserSpace | null> {
  const [space] = await db.select().from(spaces).where(eq(spaces.inviteCode, inviteCode));

  if (!space) return null;

  // Upsert: if already a member, do nothing; otherwise insert
  await db
    .insert(spaceMembers)
    .values({
      spaceId: space.id,
      userId,
      isDefault: false,
    })
    .onConflictDoNothing();

  return {
    id: space.id,
    name: space.name,
    kind: space.kind as "journal" | "tasks",
    isDefault: false,
  };
}

export async function rotateInviteCode(userId: number, spaceId: number): Promise<string | null> {
  // Verify user is a member of this space
  const [membership] = await db
    .select()
    .from(spaceMembers)
    .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, userId)));

  if (!membership) return null;

  const newCode = generateInviteCode();
  await db.update(spaces).set({ inviteCode: newCode }).where(eq(spaces.id, spaceId));

  return newCode;
}

export async function ensureDefaultSpace(userId: number, spaceName: string = "Mine"): Promise<number> {
  const inviteCode = generateInviteCode();
  const [space] = await db
    .insert(spaces)
    .values({
      name: spaceName,
      kind: "journal",
      createdBy: userId,
      inviteCode: null, // Private spaces don't have invite codes
    })
    .returning();

  await db.insert(spaceMembers).values({
    spaceId: space.id,
    userId,
    isDefault: true,
  });

  return space.id;
}

export async function createSignupInvite(userId: number): Promise<string> {
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(signupInvites).values({
    code,
    createdBy: userId,
    expiresAt,
  });

  return code;
}

export interface SignupInviteValidation {
  valid: boolean;
  reason?: string;
}

export async function validateSignupInvite(code: string): Promise<SignupInviteValidation> {
  const [invite] = await db.select().from(signupInvites).where(eq(signupInvites.code, code));

  if (!invite) {
    return { valid: false, reason: "Invite code not found" };
  }

  if (invite.usedBy !== null) {
    return { valid: false, reason: "Invite code already used" };
  }

  if (new Date() > invite.expiresAt) {
    return { valid: false, reason: "Invite code expired" };
  }

  return { valid: true };
}

export async function redeemSignupInvite(code: string, userId: number): Promise<boolean> {
  const result = await db
    .update(signupInvites)
    .set({ usedBy: userId, redeemedAt: new Date() })
    .where(and(eq(signupInvites.code, code), isNull(signupInvites.usedBy)))
    .returning();

  return result.length > 0;
}

export interface TaskLeaderboardEntry {
  userId: number;
  userName: string;
  points: number;
}

export async function taskLeaderboard(spaceId: number): Promise<TaskLeaderboardEntry[]> {
  // This is a simplified version — a real implementation would use SQL aggregation
  // For now, we fetch all tasks and compute leaderboard in JS
  const { inArray, sql, entries: entriesTable } = await import("@lumen/db");

  const taskRows = await db
    .select({
      id: entriesTable.id,
      createdBy: entriesTable.createdBy,
      data: entriesTable.data,
    })
    .from(entriesTable)
    .where(and(eq(entriesTable.spaceId, spaceId), eq(entriesTable.kind, "task")));

  const leaderboard: Record<number, { userId: number; points: number }> = {};

  for (const task of taskRows) {
    const data = task.data as Record<string, any>;
    if (data.done && data.completedBy) {
      const uid = Number(data.completedBy);
      if (!leaderboard[uid]) {
        leaderboard[uid] = { userId: uid, points: 0 };
      }
      leaderboard[uid].points += (data.points ?? 0);
    }
  }

  // Fetch user names
  const userIds = Object.keys(leaderboard).map(Number);
  if (userIds.length === 0) return [];

  const userRows = await db.select().from(users).where(inArray(users.id, userIds));
  const userMap = new Map(userRows.map((u) => [u.id, u.name]));

  return Object.values(leaderboard)
    .map((entry) => ({
      userId: entry.userId,
      userName: userMap.get(entry.userId) || "Unknown",
      points: entry.points,
    }))
    .sort((a, b) => b.points - a.points);
}

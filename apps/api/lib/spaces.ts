import { randomBytes } from "crypto";

import { and, eq, inArray, isNull, signupInvites, spaceMembers, spaces, users } from "@lumen/db";

import { db } from "@/lib/db";
import { addDays, localDateString, streakEndingAt } from "@/lib/stats";

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

// Weekly-scoped variant of taskLeaderboard, for the recap's "weekly MVP" callout —
// same completed-points aggregation, just filtered to completions since `since`.
export async function weeklyTaskLeaderboard(spaceId: number, since: Date): Promise<TaskLeaderboardEntry[]> {
  const { entries: entriesTable } = await import("@lumen/db");

  const taskRows = await db
    .select({ createdBy: entriesTable.createdBy, data: entriesTable.data })
    .from(entriesTable)
    .where(and(eq(entriesTable.spaceId, spaceId), eq(entriesTable.kind, "task")));

  const leaderboard: Record<number, { userId: number; points: number }> = {};

  for (const task of taskRows) {
    const data = task.data as Record<string, any>;
    if (!data.done || !data.completedBy || !data.completedAt) continue;
    if (new Date(data.completedAt) < since) continue;

    const uid = Number(data.completedBy);
    if (!leaderboard[uid]) leaderboard[uid] = { userId: uid, points: 0 };
    leaderboard[uid].points += data.points ?? 0;
  }

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

// Duolingo-style shared streak: a calendar day only counts if EVERY member of
// the space created at least one entry (task or log) in it that day. One
// missed member breaks the day for everyone, same as one missed lesson breaks
// a Duolingo shared streak. Only meaningful for spaces with 2+ members.
export async function sharedSpaceStreak(spaceId: number, memberIds: number[]): Promise<number> {
  if (memberIds.length < 2) return 0;

  const { entries: entriesTable } = await import("@lumen/db");

  const rows = await db
    .select({ createdBy: entriesTable.createdBy, createdAt: entriesTable.createdAt })
    .from(entriesTable)
    .where(and(eq(entriesTable.spaceId, spaceId), inArray(entriesTable.createdBy, memberIds)));

  const membersByDay = new Map<string, Set<number>>();
  for (const row of rows) {
    if (row.createdBy === null) continue;
    const day = localDateString(row.createdAt);
    if (!membersByDay.has(day)) membersByDay.set(day, new Set());
    membersByDay.get(day)!.add(Number(row.createdBy));
  }

  const fullDays = new Set(
    [...membersByDay.entries()]
      .filter(([, uids]) => memberIds.every((id) => uids.has(id)))
      .map(([day]) => day),
  );

  const today = localDateString(new Date());
  const endDate = fullDays.has(today) ? today : addDays(today, -1);
  return streakEndingAt(fullDays, endDate);
}

export interface SpaceBadge {
  id: string;
  label: string;
}

const SHARED_STREAK_BADGES = [3, 7, 14, 30, 60, 100, 365];
const COMBINED_POINTS_BADGES = [50, 100, 250, 500, 1000, 2500];

// Purely computed from current totals — no separate table, same "derive it,
// don't store it" approach as lib/stats.ts's milestoneHints.
export function spaceBadges(sharedStreak: number, combinedPoints: number, tasksCompleted: number): SpaceBadge[] {
  const badges: SpaceBadge[] = [];

  if (tasksCompleted >= 1) badges.push({ id: "first_task", label: "🎯 First task completed" });

  for (const n of SHARED_STREAK_BADGES) {
    if (sharedStreak >= n) badges.push({ id: `streak_${n}`, label: `🔥 ${n}-day streak` });
  }
  for (const n of COMBINED_POINTS_BADGES) {
    if (combinedPoints >= n) badges.push({ id: `points_${n}`, label: `⭐ ${n} points together` });
  }

  return badges;
}

export interface TaskSpaceStats {
  leaderboard: TaskLeaderboardEntry[];
  combinedPoints: number;
  tasksCompleted: number;
  sharedStreak: number;
  badges: SpaceBadge[];
}

// Bundles everything the space detail page needs for a task space's
// gamification panel into one call.
export async function taskSpaceStats(spaceId: number, memberIds: number[]): Promise<TaskSpaceStats> {
  const [leaderboard, sharedStreak] = await Promise.all([
    taskLeaderboard(spaceId),
    sharedSpaceStreak(spaceId, memberIds),
  ]);

  const combinedPoints = leaderboard.reduce((sum, entry) => sum + entry.points, 0);
  const tasksCompleted = leaderboard.length > 0 || combinedPoints > 0 ? await countCompletedTasks(spaceId) : 0;

  return {
    leaderboard,
    combinedPoints,
    tasksCompleted,
    sharedStreak,
    badges: spaceBadges(sharedStreak, combinedPoints, tasksCompleted),
  };
}

async function countCompletedTasks(spaceId: number): Promise<number> {
  const { entries: entriesTable, sql } = await import("@lumen/db");
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entriesTable)
    .where(and(eq(entriesTable.spaceId, spaceId), eq(entriesTable.kind, "task"), sql`${entriesTable.data}->>'done' = 'true'`));
  return row?.count ?? 0;
}

// Toggles a reaction from `userId` on an entry — stored inline in the entry's
// jsonb `data` bag (see docs/architecture/overview.md §5) rather than a new
// table, same "don't migrate for this" approach as everything else in `data`.
export async function toggleReaction(
  entryId: number,
  userId: number,
  emoji: string,
): Promise<{ emoji: string; userId: number }[] | null> {
  const { entries: entriesTable } = await import("@lumen/db");

  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, entryId));
  if (!entry) return null;

  const data = (entry.data as Record<string, any>) || {};
  const reactions: { emoji: string; userId: number }[] = Array.isArray(data.reactions) ? data.reactions : [];

  const existingIndex = reactions.findIndex((r) => r.userId === userId && r.emoji === emoji);
  const nextReactions =
    existingIndex >= 0
      ? reactions.filter((_, i) => i !== existingIndex)
      : [...reactions, { emoji, userId }];

  await db
    .update(entriesTable)
    .set({ data: { ...data, reactions: nextReactions } })
    .where(eq(entriesTable.id, entryId));

  return nextReactions;
}

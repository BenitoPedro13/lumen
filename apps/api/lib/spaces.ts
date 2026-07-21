import { randomBytes } from "crypto";

import { and, eq, spaceMembers, spaces } from "@lumen/db";

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

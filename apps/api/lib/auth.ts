import { createHash } from "crypto";

import { eq, users } from "@lumen/db";

import { db } from "@/lib/db";

export interface AuthedUser {
  id: number;
  name: string;
  tokenHash: string;
  ntfyTopic: string | null;
}

export async function resolveUser(request: Request): Promise<AuthedUser | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [user] = await db.select().from(users).where(eq(users.tokenHash, tokenHash));

  return user || null;
}

export function isAuthorizedAdmin(request: Request): boolean {
  return bearerMatches(request, process.env.ADMIN_SECRET);
}

// Vercel Cron invokes the configured path with `Authorization: Bearer $CRON_SECRET`
// automatically once CRON_SECRET is set as a project env var — no shared LUMEN_API_TOKEN
// involved, since Shortcuts never calls this endpoint directly.
export function isAuthorizedCron(request: Request): boolean {
  return bearerMatches(request, process.env.CRON_SECRET);
}

function getBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
}

function bearerMatches(request: Request, expected: string | undefined): boolean {
  const token = getBearerToken(request);
  return Boolean(expected) && token === expected;
}

import { entries, eq, sql } from "@lumen/db";

import { db } from "@/lib/db";

// Same zone as lib/llm.ts nowContext() — see docs/architecture/overview.md §10
// decision 2. Streak "days" are her calendar days, not UTC days.
const TIMEZONE = "Europe/Amsterdam";

export interface LogStats {
  totalCount: number;
  currentStreak: number;
}

function localDateString(date: Date): string {
  // en-CA formats as YYYY-MM-DD, which is what we want for both display and
  // for treating these as plain sortable/comparable calendar-date strings.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
}

// Pure calendar-date arithmetic — deliberately not a `Date` constructed from
// the YYYY-MM-DD string plus local/UTC time math, which would risk drifting
// a day depending on the process's own timezone (Vercel Functions run in
// UTC) rather than hers.
function addDays(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function streakEndingAt(days: Set<string>, endDate: string): number {
  let streak = 0;
  let cursor = endDate;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// created_at (when she actually spoke to Siri), not occurred_at (when the
// logged thing happened) — a streak is meant to track the habit of using
// Lumen, not a calendar of events.
async function loggedLocalDays(userId: number): Promise<Set<string>> {
  const rows = await db
    .select({
      day: sql<string>`distinct (${entries.createdAt} at time zone ${TIMEZONE})::date`,
    })
    .from(entries)
    .where(eq(entries.createdBy, userId));
  return new Set(rows.map((row) => row.day));
}

async function totalEntryCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entries)
    .where(eq(entries.createdBy, userId));
  return row?.count ?? 0;
}

// Stats as they'll be immediately after the entry currently being logged is
// inserted — called before the insert, so it predicts rather than reads.
export async function statsForNewEntry(userId: number): Promise<LogStats> {
  const [days, count] = await Promise.all([loggedLocalDays(userId), totalEntryCount(userId)]);
  const today = localDateString(new Date());
  days.add(today);
  return { totalCount: count + 1, currentStreak: streakEndingAt(days, today) };
}

// Stats as they stand right now, for the weekly recap — no predicted insert.
export async function currentStats(userId: number): Promise<LogStats> {
  const [days, count] = await Promise.all([loggedLocalDays(userId), totalEntryCount(userId)]);
  const today = localDateString(new Date());
  // Streak counts through today only if she's already logged something
  // today; otherwise it reads through yesterday, which is correct — the
  // streak isn't broken until a full local day passes with no entry.
  const endDate = days.has(today) ? today : addDays(today, -1);
  return { totalCount: count, currentStreak: streakEndingAt(days, endDate) };
}

const COUNT_MILESTONES = [1, 10, 25, 50, 100, 200, 250, 500, 750, 1000, 1500, 2000];
const STREAK_MILESTONES = [3, 5, 7, 14, 21, 30, 50, 100, 150, 200, 250, 300, 365];

function ordinal(n: number): string {
  const rule = new Intl.PluralRules("en", { type: "ordinal" }).select(n);
  const suffix = { one: "st", two: "nd", few: "rd", other: "th", zero: "th", many: "th" }[rule];
  return `${n}${suffix}`;
}

// Plain-English hints for the LLM's own consumption (never shown to her
// directly) about whether this log happens to land on a milestone. Empty
// most of the time by design — the confirmation prompt is instructed to only
// mention these when they're actually present, so most logs stay a short
// plain confirmation instead of narrating stats every time.
export function milestoneHints(stats: LogStats): string[] {
  const hints: string[] = [];
  if (COUNT_MILESTONES.includes(stats.totalCount)) {
    hints.push(`This is her ${ordinal(stats.totalCount)} entry ever.`);
  }
  if (STREAK_MILESTONES.includes(stats.currentStreak)) {
    hints.push(`She's logged something ${stats.currentStreak} days in a row now.`);
  }
  return hints;
}

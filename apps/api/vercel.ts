import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  // 18:00 UTC Sunday → ~19:00 (CET) or ~20:00 (CEST) Europe/Amsterdam, both "evening".
  // Vercel Cron has no DST awareness, so this drifts an hour across the DST transition —
  // accepted tradeoff, see docs/architecture/overview.md §10 decision 5.
  //
  // Daily note/check-in runs the other 6 days (Mon-Sat, day-of-week 1-6) at the same
  // evening time, deliberately skipping Sunday so it doesn't double up with the weekly
  // recap — see docs/architecture/roadmap.md §1 and apps/api/app/api/recap/daily/route.ts.
  crons: [
    { path: "/api/recap/run", schedule: "0 18 * * 0" },
    { path: "/api/recap/daily", schedule: "0 18 * * 1-6" },
  ],
};

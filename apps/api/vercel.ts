import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  // 18:00 UTC Sunday → ~19:00 (CET) or ~20:00 (CEST) Europe/Amsterdam, both "evening".
  // Vercel Cron has no DST awareness, so this drifts an hour across the DST transition —
  // accepted tradeoff, see docs/architecture/overview.md §10 decision 5.
  crons: [{ path: "/api/recap/run", schedule: "0 18 * * 0" }],
};

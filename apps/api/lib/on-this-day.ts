import { and, entries, gte, lte } from "@lumen/db";

import { db } from "@/lib/db";
import type { RetrievedEntry } from "@/lib/llm";

const DAY_MS = 24 * 60 * 60 * 1000;
// A few days either side of the anchor date — "around this time", not the
// exact calendar date, since a weekly recap cadence means the exact date
// rarely lines up with a Sunday.
const WINDOW_DAYS = 3;

const ANCHORS: { label: string; daysAgo: number }[] = [
  { label: "around this time last month", daysAgo: 28 },
  { label: "around this time last year", daysAgo: 365 },
];

export interface OnThisDayCallback {
  label: string;
  entries: RetrievedEntry[];
}

// Nostalgic callbacks for the weekly recap — "a year ago you were...". Purely
// additive: returns nothing until there's actually a month/year of history to
// look back on, no new schema needed (docs/architecture/roadmap.md §1).
export async function onThisDayCallbacks(reference: Date = new Date()): Promise<OnThisDayCallback[]> {
  const callbacks = await Promise.all(
    ANCHORS.map(async (anchor) => {
      const center = reference.getTime() - anchor.daysAgo * DAY_MS;
      const rows = await db
        .select()
        .from(entries)
        .where(
          and(
            gte(entries.occurredAt, new Date(center - WINDOW_DAYS * DAY_MS)),
            lte(entries.occurredAt, new Date(center + WINDOW_DAYS * DAY_MS)),
          ),
        );
      return {
        label: anchor.label,
        entries: rows.map((row) => ({
          occurredAt: row.occurredAt,
          category: row.category,
          summary: row.summary,
        })),
      };
    }),
  );
  return callbacks.filter((callback) => callback.entries.length > 0);
}

import { bigint, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// See docs/architecture/overview.md §5 for the rationale (jsonb `data` bag,
// free-text `category` instead of an enum column).
export const entries = pgTable(
  "entries",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    rawText: text("raw_text").notNull(),
    category: text("category").notNull(),
    summary: text("summary").notNull(),
    data: jsonb("data").notNull().default({}),
    source: text("source").notNull().default("shortcut"),
  },
  (table) => [
    index("entries_occurred_at_idx").on(table.occurredAt.desc()),
    index("entries_category_idx").on(table.category),
  ],
);

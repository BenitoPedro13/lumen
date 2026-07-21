import {
  bigint,
  boolean,
  foreignKey,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  ntfyTopic: text("ntfy_topic"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spaces = pgTable(
  "spaces",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["journal", "tasks"] }).notNull().default("journal"),
    createdBy: bigint("created_by", { mode: "number" }).notNull(),
    inviteCode: text("invite_code").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [foreignKey({ columns: [table.createdBy], foreignColumns: [users.id] }).onDelete("cascade")],
);

export const spaceMembers = pgTable(
  "space_members",
  {
    spaceId: bigint("space_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    foreignKey({ columns: [table.spaceId], foreignColumns: [spaces.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  ],
);

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
    spaceId: bigint("space_id", { mode: "number" }),
    createdBy: bigint("created_by", { mode: "number" }),
    kind: text("kind", { enum: ["log", "task"] }).default("log"),
  },
  (table) => [
    index("entries_occurred_at_idx").on(table.occurredAt.desc()),
    index("entries_category_idx").on(table.category),
    index("entries_space_id_idx").on(table.spaceId),
    foreignKey({ columns: [table.spaceId], foreignColumns: [spaces.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.createdBy], foreignColumns: [users.id] }).onDelete("cascade"),
  ],
);

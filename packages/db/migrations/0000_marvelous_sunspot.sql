CREATE TABLE IF NOT EXISTS "entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"raw_text" text NOT NULL,
	"category" text NOT NULL,
	"summary" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'shortcut' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_occurred_at_idx" ON "entries" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_category_idx" ON "entries" USING btree ("category");
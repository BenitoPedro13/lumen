CREATE TABLE "space_members" (
	"space_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_members_space_id_user_id_pk" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "spaces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"kind" text DEFAULT 'journal' NOT NULL,
	"created_by" bigint NOT NULL,
	"invite_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"ntfy_topic" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "space_id" bigint;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "created_by" bigint;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "kind" text DEFAULT 'log';--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_space_id_idx" ON "entries" USING btree ("space_id");
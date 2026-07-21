import { z } from "zod";

// Starting set, shipped deliberately as a guess (docs/architecture/overview.md §10,
// decision 4) — revisit once Phase 0/1 are running and real usage exists to look at.
// Don't tune this before there's data.
export const CATEGORIES = [
  "fitness",
  "spending",
  "mood",
  "food",
  "errand",
  "work",
  "other",
] as const;

// Space resolution — schema factory for dynamic space name enum
export function makeSpaceResolutionSchema(spaceNames: string[]) {
  return z.object({
    space: z.enum(spaceNames.length > 0 ? (spaceNames as [string, ...string[]]) : (["default"] as const)),
  });
}

export type Category = (typeof CATEGORIES)[number];

// Output of the extraction LLM call for POST /log.
// See docs/architecture/overview.md §6.1. `summary`/`confirmation` must be written in
// whatever language the dictated `text` was in (§6.0) — the prompt must instruct this
// explicitly, don't assume English or Dutch.
export const ExtractionSchema = z.object({
  // { offset: true } is required — Zod's datetime() rejects timezone-offset
  // strings (e.g. "+02:00") by default, only accepting UTC "Z". We want the
  // model to return her local-offset time (Europe/Amsterdam), not force a
  // UTC conversion, so the plain UTC-only default would reject valid output.
  occurred_at: z.string().datetime({ offset: true }),
  category: z.enum(CATEGORIES),
  summary: z.string(),
  data: z.record(z.any()),
  confirmation: z.string(),
  // True only when this dictation is amending the entry logged immediately
  // before it (e.g. "actually, make that 45 minutes"), not a new fact —
  // see docs/architecture/roadmap.md §1 "correction flow". The caller only
  // asks the model to consider this when a recent-enough prior entry exists.
  is_correction: z.boolean(),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

// Output of the query-scoping LLM call for POST /ask, step 1.
// See docs/architecture/overview.md §6.2. No `category` field — it was dropped after
// real usage showed the extraction call and this call can independently guess different
// categories for the same ambiguous thing (e.g. "water" as food vs. other), and a hard
// category-equality filter turned that mismatch into false "nothing logged" answers. Date
// range narrows the SQL query; the answer-generation call does the semantic matching.
export const QueryScopeSchema = z.object({
  from: z.string().datetime({ offset: true }).nullable(),
  to: z.string().datetime({ offset: true }).nullable(),
});

export type QueryScope = z.infer<typeof QueryScopeSchema>;

// Output of the answering LLM call for POST /ask, step 2.
// `answer` is spoken directly by Siri — no markdown, no lists — and must reply in the
// same language the question was asked in (§6.0), independent of the entries' language.
export const AnswerSchema = z.object({
  answer: z.string(),
});

export type Answer = z.infer<typeof AnswerSchema>;

// Output of the weekly recap LLM call for the /recap/run cron job.
// See docs/architecture/overview.md §6.3. No per-request input to detect a language
// from — the prompt picks whichever language the week's entries are predominantly in.
export const RecapSchema = z.object({
  recap: z.string(),
});

export type Recap = z.infer<typeof RecapSchema>;

// Output of the daily-note LLM call for the /recap/daily cron job — a much
// shorter cousin of the weekly recap, one sentence about just today.
export const DailyNoteSchema = z.object({
  note: z.string(),
});

export type DailyNote = z.infer<typeof DailyNoteSchema>;

// Output of the check-in nudge LLM call, sent by /recap/daily instead of a
// daily note when nothing's been logged in a couple of days.
export const NudgeSchema = z.object({
  text: z.string(),
});

export type Nudge = z.infer<typeof NudgeSchema>;

// Output of the task extraction LLM call for POST /log when space kind is "tasks".
// Parses spoken task commands like "add make dinner 20 points due tomorrow" or "mark laundry done".
export const TaskActionSchema = z.object({
  action: z.enum(["add", "complete"]),
  title: z.string(),
  points: z.number().int().positive().default(10),
  dueAt: z.string().datetime({ offset: true }).nullable(),
  matchedEntryId: z.number().int().nullable(),
  confirmation: z.string(),
});

export type TaskAction = z.infer<typeof TaskActionSchema>;

// Output of the undo-confirmation LLM call for POST /undo — a short spoken
// acknowledgement of what was just removed, in whatever language the removed
// entry itself was in (there's no per-request input text to detect language
// from, since "undo" carries no dictation of its own).
export const UndoSchema = z.object({
  confirmation: z.string(),
});

export type Undo = z.infer<typeof UndoSchema>;

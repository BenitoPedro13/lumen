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

export type Category = (typeof CATEGORIES)[number];

// Output of the extraction LLM call for POST /log.
// See docs/architecture/overview.md §6.1. `summary`/`confirmation` must be written in
// whatever language the dictated `text` was in (§6.0) — the prompt must instruct this
// explicitly, don't assume English or Dutch.
export const ExtractionSchema = z.object({
  occurred_at: z.string().datetime(),
  category: z.enum(CATEGORIES),
  summary: z.string(),
  data: z.record(z.any()),
  confirmation: z.string(),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

// Output of the query-scoping LLM call for POST /ask, step 1.
// See docs/architecture/overview.md §6.2.
export const QueryScopeSchema = z.object({
  category: z.enum(CATEGORIES).nullable(),
  from: z.string().datetime().nullable(),
  to: z.string().datetime().nullable(),
});

export type QueryScope = z.infer<typeof QueryScopeSchema>;

// Output of the answering LLM call for POST /ask, step 2.
// `answer` is spoken directly by Siri — no markdown, no lists — and must reply in the
// same language the question was asked in (§6.0), independent of the entries' language.
export const AnswerSchema = z.object({
  answer: z.string(),
});

export type Answer = z.infer<typeof AnswerSchema>;

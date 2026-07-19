import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";

import {
  AnswerSchema,
  ExtractionSchema,
  QueryScopeSchema,
  type Answer,
  type Extraction,
  type QueryScope,
} from "@lumen/core";

// See docs/architecture/overview.md §10 decision 2 — IANA zone, not a fixed
// offset, since Europe/Amsterdam observes DST.
const TIMEZONE = "Europe/Amsterdam";

const LANGUAGE_RULE =
  "Detect the language of the input and reply in that same language — never default to English or Dutch.";

function nowContext(): string {
  return `Current UTC time: ${new Date().toISOString()}. Her timezone (IANA): ${TIMEZONE}.`;
}

export async function extract(text: string): Promise<Extraction> {
  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You extract a structured record from a short thing a person just dictated to their phone.",
      nowContext(),
      "Resolve relative times ('this morning', 'at 8 and again at 5') against the current time and timezone above.",
      LANGUAGE_RULE,
      "`confirmation` is a short sentence spoken aloud by Siri right after this — no markdown, no lists, just a natural spoken sentence.",
    ].join("\n"),
    prompt: text,
    output: Output.object({ schema: ExtractionSchema }),
  });
  return output;
}

export async function scopeQuery(question: string): Promise<QueryScope> {
  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You turn a spoken question into a date range and optional category filter over a personal log.",
      nowContext(),
      "If the question implies no clear date range, leave `from` and `to` null (meaning: search all time). If it implies no clear category, leave `category` null.",
    ].join("\n"),
    prompt: question,
    output: Output.object({ schema: QueryScopeSchema }),
  });
  return output;
}

export interface RetrievedEntry {
  occurredAt: Date;
  category: string;
  summary: string;
}

export async function answer(question: string, entries: RetrievedEntry[]): Promise<Answer> {
  const context = entries.length
    ? entries
        .map((e) => `- [${e.occurredAt.toISOString()}] (${e.category}) ${e.summary}`)
        .join("\n")
    : "(no matching entries found)";

  const { output } = await generateText({
    model: anthropic("claude-sonnet-5"),
    system: [
      "You answer a spoken question about a person's personal log by reasoning over the retrieved entries below.",
      nowContext(),
      LANGUAGE_RULE,
      "`answer` is spoken directly by Siri — one short natural sentence, no markdown, no lists.",
      "If the retrieved entries don't contain enough information to answer, say so plainly rather than guessing.",
    ].join("\n"),
    prompt: `Question: ${question}\n\nRetrieved entries:\n${context}`,
    output: Output.object({ schema: AnswerSchema }),
  });
  return output;
}

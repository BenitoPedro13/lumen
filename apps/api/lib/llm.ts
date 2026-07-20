import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";

import {
  AnswerSchema,
  ExtractionSchema,
  QueryScopeSchema,
  RecapSchema,
  type Answer,
  type Extraction,
  type QueryScope,
  type Recap,
} from "@lumen/core";

// See docs/architecture/overview.md §10 decision 2 — IANA zone, not a fixed
// offset, since Europe/Amsterdam observes DST.
const TIMEZONE = "Europe/Amsterdam";

const LANGUAGE_RULE =
  "Detect the language of the input and reply in that same language — never default to English or Dutch.";

function nowContext(): string {
  return `Current UTC time: ${new Date().toISOString()}. Her timezone (IANA): ${TIMEZONE}.`;
}

export async function extract(text: string, milestoneHints: string[] = []): Promise<Extraction> {
  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You extract a structured record from a short thing a person just dictated to their phone.",
      nowContext(),
      "Resolve relative times ('this morning', 'at 8 and again at 5') against the current time and timezone above.",
      LANGUAGE_RULE,
      "`confirmation` is a short sentence spoken aloud by Siri right after this — no markdown, no lists, just a natural spoken sentence.",
      ...(milestoneHints.length
        ? [
            `Notable fact about this specific log, for your own context only — never state it as raw data: ${milestoneHints.join(" ")} Add one brief, warm clause mentioning this in \`confirmation\` (in her language) — don't skip it, but keep it natural and short, like an aside from a friend, not like a notification.`,
          ]
        : [
            "Do not mention counts, streaks, or stats in `confirmation` — just confirm what was logged.",
          ]),
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
      "You turn a spoken question into a date range over a personal log.",
      nowContext(),
      "If the question implies no clear date range, leave `from` and `to` null (meaning: search all time).",
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

export async function recap(weekEntries: RetrievedEntry[], statsContext?: string): Promise<Recap> {
  const context = weekEntries.length
    ? weekEntries
        .map((e) => `- [${e.occurredAt.toISOString()}] (${e.category}) ${e.summary}`)
        .join("\n")
    : "(nothing logged this week)";

  const { output } = await generateText({
    model: anthropic("claude-sonnet-5"),
    system: [
      "You write a short weekly recap over a person's personal log entries from the last 7 days.",
      "Write 2-4 warm, natural sentences, like a note from someone who's been paying attention — not a bullet-point report or a list of stats.",
      "Write in whichever language the entries below are predominantly written in — judge this strictly from the actual text of the entries themselves, not from any other context (e.g. don't assume a specific language just because of who this app is for). If there are no entries, say so gently in a neutral, widely understood language.",
      ...(statsContext
        ? [
            `Some numbers about this week, for your own context only: ${statsContext} Weave in at most one or two of these if they make the recap warmer or more interesting (e.g. a streak, a nice jump from last week) — skip any that aren't actually interesting, and never present them as a mechanical list.`,
          ]
        : []),
    ].join("\n"),
    prompt: `Entries from the last 7 days:\n${context}`,
    output: Output.object({ schema: RecapSchema }),
  });
  return output;
}

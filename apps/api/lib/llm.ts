import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

import {
  AnswerSchema,
  DailyNoteSchema,
  ExtractionSchema,
  makeSpaceResolutionSchema,
  NudgeSchema,
  QueryScopeSchema,
  RecapSchema,
  TaskActionSchema,
  type Answer,
  type DailyNote,
  type Extraction,
  type Nudge,
  type QueryScope,
  type Recap,
  type TaskAction,
} from "@lumen/core";

import type { UserSpace } from "@/lib/spaces";

import type { OnThisDayCallback } from "@/lib/on-this-day";

// See docs/architecture/overview.md §10 decision 2 — IANA zone, not a fixed
// offset, since Europe/Amsterdam observes DST.
const TIMEZONE = "Europe/Amsterdam";

const LANGUAGE_RULE =
  "Detect the language of the input and reply in that same language — never default to English or Dutch.";

function nowContext(): string {
  return `Current UTC time: ${new Date().toISOString()}. Her timezone (IANA): ${TIMEZONE}.`;
}

export interface RecentEntry {
  rawText: string;
  summary: string;
}

export async function resolveSpace(text: string, userSpaces: UserSpace[]): Promise<UserSpace> {
  // Optimization: if user has only one space, skip LLM and return it directly
  if (userSpaces.length === 1) {
    return userSpaces[0];
  }

  // Build enum of space names + "default" fallback
  const spaceNames = [...userSpaces.map((s) => s.name), "default"];
  const schema = makeSpaceResolutionSchema(spaceNames);

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You determine which space/list a person is referring to in a spoken sentence.",
      "The user has access to these spaces: " + userSpaces.map((s) => `"${s.name}" (${s.kind})`).join(", ") + ".",
      "Pick the space by name from the sentence, or say 'default' if no specific space is mentioned or if the sentence is ambiguous.",
      "You must pick from the exact list provided — never invent a space name.",
    ].join("\n"),
    prompt: text,
    output: Output.object({ schema }),
  });

  const selectedName = output.space;

  if (selectedName === "default") {
    const defaultSpace = userSpaces.find((s) => s.isDefault);
    return defaultSpace || userSpaces[0]; // Fallback to first if default not found (shouldn't happen)
  }

  return userSpaces.find((s) => s.name === selectedName) || userSpaces[0];
}

export async function extract(
  text: string,
  milestoneHints: string[] = [],
  recentEntry?: RecentEntry,
): Promise<Extraction> {
  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You extract a structured record from a short thing a person just dictated to their phone.",
      nowContext(),
      "Resolve relative times ('this morning', 'at 8 and again at 5') against the current time and timezone above.",
      LANGUAGE_RULE,
      "`confirmation` is a short sentence spoken aloud by Siri right after this — no markdown, no lists, just a natural spoken sentence.",
      "`is_correction` is false unless the instructions below say otherwise.",
      ...(recentEntry
        ? [
            `The most recent thing she logged, in case this new dictation is actually correcting or amending it rather than starting a new independent log: "${recentEntry.rawText}" (summarized as: ${recentEntry.summary}). If this new text is clearly a correction/amendment to that specific entry (e.g. "actually...", "wait, I meant...", "no, make that...", or otherwise clearly refers back to it) — set \`is_correction\` to true, and make \`category\`/\`summary\`/\`data\`/\`occurred_at\` reflect the full corrected fact by combining the original with the correction, and phrase \`confirmation\` as acknowledging an update (e.g. "Got it, updated that to...", in her language). Otherwise set \`is_correction\` to false and treat this as a completely independent new log, ignoring the entry above entirely.`,
          ]
        : []),
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

export interface TaskToMatch {
  id: number;
  title: string;
}

export async function extractTask(text: string, openTasks: TaskToMatch[]): Promise<TaskAction> {
  const taskContext =
    openTasks.length > 0
      ? `Open tasks to potentially complete: ${openTasks.map((t) => `id=${t.id} "${t.title}"`).join("; ")}`
      : "(no open tasks currently)";

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You parse task commands from a person's spoken sentence.",
      nowContext(),
      "Resolve relative times ('tomorrow', 'next week', 'friday') against the current time and timezone above.",
      LANGUAGE_RULE,
      "Commands are either 'add' (new task) or 'complete' (mark done).",
      "For 'add': extract title, points (default 10 if not mentioned), and optional due date.",
      "For 'complete': try to match an open task by title/description and extract its id. If no clear match, leave matchedEntryId null.",
      "`confirmation` is brief and natural (e.g., 'Added laundry, due tomorrow, 15 points' or 'Marked groceries done').",
      taskContext,
    ].join("\n"),
    prompt: text,
    output: Output.object({ schema: TaskActionSchema }),
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

export async function answer(question: string, entries: RetrievedEntry[], extraContext?: string): Promise<Answer> {
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
      ...(extraContext ? [`Additional context: ${extraContext}`] : []),
    ].join("\n"),
    prompt: `Question: ${question}\n\nRetrieved entries:\n${context}`,
    output: Output.object({ schema: AnswerSchema }),
  });
  return output;
}

export async function recap(
  weekEntries: RetrievedEntry[],
  statsContext?: string,
  callbacks: OnThisDayCallback[] = [],
): Promise<Recap> {
  const context = weekEntries.length
    ? weekEntries
        .map((e) => `- [${e.occurredAt.toISOString()}] (${e.category}) ${e.summary}`)
        .join("\n")
    : "(nothing logged this week)";

  const callbackContext = callbacks.length
    ? callbacks
        .map(
          (callback) =>
            `${callback.label}:\n${callback.entries
              .map((e) => `  - (${e.category}) ${e.summary}`)
              .join("\n")}`,
        )
        .join("\n")
    : "";

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
      ...(callbackContext
        ? [
            `For optional nostalgic color, here's what was logged around this same time in the past:\n${callbackContext}\nIf something there is genuinely worth a brief callback (e.g. "a year ago you were..."), include at most one, in one short clause — otherwise ignore this entirely, don't force it.`,
          ]
        : []),
    ].join("\n"),
    prompt: `Entries from the last 7 days:\n${context}`,
    output: Output.object({ schema: RecapSchema }),
  });
  return output;
}

export async function dailyNote(todayEntries: RetrievedEntry[]): Promise<DailyNote> {
  const context = todayEntries
    .map((e) => `- [${e.occurredAt.toISOString()}] (${e.category}) ${e.summary}`)
    .join("\n");

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You write ONE short, warm sentence recapping what a person logged today, sent as a light evening notification.",
      LANGUAGE_RULE + " Judge the language from the entries below, not from any other context.",
      "No markdown, no lists — a single natural spoken-style sentence, much shorter and lighter than a weekly recap.",
    ].join("\n"),
    prompt: `Today's entries:\n${context}`,
    output: Output.object({ schema: DailyNoteSchema }),
  });
  return output;
}

export async function checkInNudge(recentEntries: RetrievedEntry[]): Promise<Nudge> {
  const context = recentEntries.length
    ? recentEntries
        .map((e) => `- [${e.occurredAt.toISOString()}] (${e.category}) ${e.summary}`)
        .join("\n")
    : "(no recent entries)";

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: [
      "You write ONE short, warm, low-key check-in notification to someone who hasn't logged anything in their personal log for a couple of days.",
      LANGUAGE_RULE + " Judge the language from the recent entries below, not from any other context.",
      "No markdown, no guilt-tripping or alarmist tone — a gentle, low-pressure nudge, like a friend saying 'haven't heard from you in a bit'.",
    ].join("\n"),
    prompt: `Her most recent entries, for language/tone reference:\n${context}`,
    output: Output.object({ schema: NudgeSchema }),
  });
  return output;
}

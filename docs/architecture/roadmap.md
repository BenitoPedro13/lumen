# Lumen — Roadmap / Post-MVP Ideas

> Status: planning only. Nothing in this document is implemented. Captured
> 2026-07-20 after the MVP (Phase 0–2) shipped and both of you started using
> it for real. Supersedes the "don't over-build" restraint in
> `docs/architecture/overview.md` §4.3/§10 where noted below — see §0.

---

## 0. Two problems surfaced by real usage

### 0.1 No privacy separation between the two of you

**Problem:** `entries` (packages/db/src/schema.ts) has no owner/user column, and
both Shortcuts send the same shared `LUMEN_API_TOKEN`. Every `/log` write and
every `/ask` retrieval is pooled — she sees your logs, you see hers. This
wasn't a deliberate decision, it's just what "shared secret, one table" gets
you by default (overview.md §4.1, §5). Worth treating as a bug, not a
someday-feature, even though it's being filed here for later implementation.

**Design sketch:**

- Add two columns to `entries`: `owner` (`text`, not null — e.g. `'her'` /
  `'you'`) and `visibility` (`text`, not null, default `'private'` — values
  `'private'` | `'shared'`).
- Issue a **separate bearer token per person** (`LUMEN_API_TOKEN_HER`,
  `LUMEN_API_TOKEN_YOU`, or similar). `lib/auth.ts` resolves the token to an
  `owner` instead of a single boolean `isAuthorized`.
- `/log` stamps `owner` from the resolved token. Default `visibility` stays
  `'private'`.
- `/ask` and `/recap/run` filter `WHERE owner = :current OR visibility =
  'shared'` instead of scanning the whole table.
- Recap becomes per-owner: either two separate cron pushes (one per ntfy
  topic) or a single push per person that includes their own entries plus
  anything `shared`.
- Migration note: `owner` can't be `not null` without a backfill — existing
  rows need a one-time UPDATE to a chosen default owner before the constraint
  is added.
- `visibility = 'shared'` is what makes the Phase-4 "couple-linked triggers"
  idea (overview.md §9) actually make sense — without it, going per-user
  would accidentally kill the "surface something to my partner" use case
  instead of just fixing the leak.

### 0.2 Self-serve automations for her

**Problem:** today the only two Shortcuts that exist are the ones you build
and hardcode a URL + token into. If she wants to wire up her own automation
(an NFC tag, a location trigger, chaining Health app data into a log) she has
no independent way to authenticate or extend this without going through you
each time.

**Design sketch:**

- Falls out of §0.1 almost for free: once she has her *own* bearer token, any
  Shortcut she builds herself authenticates as her automatically — no code
  change needed per new automation.
- The API is already automation-friendly on purpose — `POST /log {text}` and
  `POST /ask {question}` are freeform, not tied to the specific "Dictate
  Text" trigger. Any Shortcut trigger (NFC, location, time-of-day, Health app
  export, Shortcuts automation) that can POST JSON with a bearer header can
  drive it today.
- What's missing is documentation, not endpoints: a short, stable "here's the
  contract, here's your token" reference she (or you, on her behalf) can work
  from without reading the source. Worth writing once §0.1 ships.
- Speculative, only build if she actually asks: a batch/webhook-style
  endpoint for chained automations (e.g. auto-logging workouts from Health
  app exports). Don't build ahead of a real request — same reasoning as the
  category taxonomy in overview.md §10 decision 4.

---

## 1. Feature backlog (from earlier brainstorm, 2026-07-20)

**Shipped** (all built on top of the existing `entries` table, no schema
changes needed):

- **Streaks/counters** — `apps/api/lib/stats.ts`. Milestone-aware `/log`
  confirmations, week-over-week + streak context in the weekly recap.
- **On-this-day** — `apps/api/lib/on-this-day.ts`. Nostalgic callbacks
  ("a year ago you were...") woven into the weekly recap when history exists.
- **Correction flow** — "actually, make that X" now updates the entry logged
  in the last 15 minutes instead of inserting a new one, via an `is_correction`
  field the extraction call sets when a recent-enough prior entry is shown as
  context. See `ExtractionSchema` in `packages/core/src/schemas.ts` and
  `apps/api/app/api/log/route.ts`.
- **Daily recap/check-in** — `apps/api/app/api/recap/daily/route.ts`, cron'd
  Mon-Sat (Sunday stays the weekly recap only, see `apps/api/vercel.ts`).
  Sends a light one-sentence daily note if anything was logged that day;
  otherwise a gentle one-shot check-in nudge if she's gone quiet 48-72h;
  otherwise nothing. This is the "proactive nudges" idea below, scoped down
  to the one variant that's actually usable at current data volume (silence
  detection needs no history; a spending/mood rolling-average baseline does).

**Still open** — the rest of the original "proactive nudges" idea:

- **Spending/mood rolling-average nudges** — cron compares recent entries to
  her own rolling average (e.g. a `spending` spike, `mood` trending low
  several days running) and pushes an alert. Deferred, not built, because
  there isn't yet enough history for a rolling average to mean anything, and
  because summing `data->>'amount'` safely needs a bit more care (cast
  guarding against non-numeric/missing values) than was worth doing ahead of
  real data to test it against. Revisit once there's a few weeks of spending
  entries.

Carried over from overview.md §9 Phase 4 (unchanged, just indexed here):

- `days-together`-style novelty endpoint.
- Photo-of-the-day companion flow.
- Couple-linked triggers — now well-defined once `visibility: 'shared'`
  exists (§0.1).

Medium effort, new query/prompt shapes:

- **Per-category recap digest** — split the weekly summary into threads
  (spending vs. mood vs. fitness) instead of one flat paragraph, since
  `category` is already there to group by.
- **Run-on dictation splitting** — "walked the dog and also spent 20 on
  coffee" as two entries instead of one muddled extraction. Needs a small
  addition to the Haiku extraction prompt (§6.1), not a new pipeline.

Bigger bets, need real design before building:

- **Escalate low-confidence answers** — if `/ask` can't find anything solid,
  flag it to you (admin) instead of just guessing out loud.
- **Trend-aware answering** — "am I spending more than usual?" needs
  aggregation logic in `/ask`, not just retrieval-then-summarize.
- Private `apps/web` admin dashboard to browse/edit entries (already listed
  as a Phase-4 maybe in overview.md §9 and the top-level CLAUDE.md).

---

## 2. Architecture reconsiderations now that the MVP has shipped

overview.md §4.3 and §10 decision 4 deliberately deferred a vector DB and
tuning the category taxonomy until there was real usage to look at — that
condition is now met. This section doesn't commit to either, just notes
they're unblocked:

- **Vector DB / embeddings** — worth revisiting if `/ask` starts needing
  fuzzy semantic recall ("that thing I mentioned once about...") that plain
  date/category filtering can't serve, once entry volume grows past
  personal-journal scale. Neon supports `pgvector` directly, so this wouldn't
  necessarily mean a new piece of infrastructure — an embedding column next
  to the existing `entries` row is the smallest version of this. Don't add it
  speculatively; add it when a real question falls through the current
  retrieval.
- **Category taxonomy tuning** — now that there's real logged data, look at
  what she and you have actually been categorizing as `other` and adjust
  `packages/core/src/schemas.ts` `CATEGORIES` accordingly (overview.md §10
  decision 4, §9 Phase 3).

The general "don't over-build ahead of real usage" instinct in CLAUDE.md
still applies to genuinely-speculative ideas above — it's specifically the
blanket **no-vector-DB-for-v1** stance that's lifted, because the MVP has
shipped and the "revisit once there's real usage" condition it was
conditioned on has been met.

# Lumen

A private, voice-first memory-and-answer service for two people. She talks to
Siri; Siri talks to Lumen; Lumen remembers things and answers questions about
them — no app, no typing, no visible tech. Built as a pnpm/Turborepo monorepo
deployed to Vercel.

> **Status: Phase 0 + Phase 2 complete — smoke-tested end-to-end, not yet deployed.**
> Monorepo scaffolded, decisions resolved (`docs/architecture/overview.md`
> §10), Neon provisioned and migrated, `/health`, `/log`, `/ask`, `/recap/run`
> all implemented in `apps/api` (Next.js App Router route handlers) and
> verified locally against the real Anthropic API + Neon, including the
> Dutch-language path. Vercel Cron entry for `/recap/run` is set in
> `apps/api/vercel.ts`; ntfy delivery code is in place but `NTFY_TOPIC` isn't
> set yet, and no Vercel deployment exists yet (deferred deliberately — see
> git history). Next: Phase 1 — the two Shortcuts, which needs a deployed
> preview URL to point at first.

---

## Quick start

### Prerequisites

- Node ≥ 22 and pnpm ≥ 11 (`npm i -g pnpm`)
- A Neon Postgres project, provisioned via `vercel integration add neon` — see
  `docs/architecture/overview.md` §4.3
- An Anthropic API key from console.anthropic.com — **not** a Claude.ai Pro/Max
  subscription, which doesn't grant API credits

### Setup

```bash
# 1. Install all workspace deps
pnpm install

# 2. Copy env file and fill in your Neon connection string, a bearer token,
#    and your ANTHROPIC_API_KEY
cp apps/api/.env.example apps/api/.env

# 3. Generate and run the Drizzle migration
pnpm --filter @lumen/db db:generate
pnpm --filter @lumen/db db:migrate
```

### Run in development

```bash
pnpm --filter @lumen/api dev   # next dev
```

### Tests, lint, build

```bash
pnpm lint          # ESLint across all packages
pnpm typecheck     # TypeScript --noEmit
pnpm build         # Full production build
```

---

## Workspace layout

```
apps/
  api/        Next.js App Router, route handlers only (no pages) — /log /ask /recap/run /health
packages/
  core/       @lumen/core — Zod schemas (extraction, query-scope, answer) + category taxonomy, zero framework deps
  db/         @lumen/db — Drizzle schema for `entries`, migrations, Neon client factory
  config/     @lumen/config — shared tsconfig base
docs/
  architecture/   overview.md — full spec: product, UX flows, stack, data model, prompts, phased plan
```

There is intentionally no `apps/web` yet — v1 has no UI for her (Shortcuts +
Siri is the entire client surface, see `docs/architecture/overview.md` §1). A
private admin dashboard is a Phase 4 maybe, not a Phase 0 default.

---

## Documentation

- [`docs/architecture/overview.md`](docs/architecture/overview.md) — the whole
  plan: product goals, the two Siri flows, architecture diagram, data model,
  LLM prompt design, API contract, security, phased build plan, and the open
  decisions blocking Phase 0.
- [`docs/architecture/roadmap.md`](docs/architecture/roadmap.md) — post-MVP
  planning doc (not yet implemented): the per-user privacy gap (both of you
  currently share one token and see each other's entries), self-serve
  automation support for her, and the wider feature backlog.
- [`CLAUDE.md`](CLAUDE.md) — this file: workflow + project context for AI agents.

---

## Working with this repo

- **Do not add a `Co-Authored-By` trailer to git commits.** Commit messages
  should just be the summary/body — no AI co-author line.

---

## Design decisions worth knowing before touching code

- **Vercel + Neon, not "run it on my Mac."** A Mac/Tailscale setup was the
  original brainstorm, but it fails the moment the laptop is asleep or off the
  network — and a broken voice interaction reads to her as "this doesn't
  work," not "the server's down." Always-on managed hosting removes that
  failure class entirely. See `docs/architecture/overview.md` §3.
- **Next.js App Router (route handlers only), not a bare Hono function.**
  Started as a framework-less Hono app in a single Vercel Function — leaner on
  paper, but its local `vercel dev` emulation proved unreliable (requests hung
  indefinitely, reproduced even with a trivial zero-dependency handler).
  `next dev` is Vercel's most battle-tested local path. No pages exist —
  `next`/`react`/`react-dom` are dependencies only because the framework
  requires them. See §4.1.
- **No vector DB / embeddings for v1** — was the original stance, conditioned
  on revisiting once there's real usage (§4.3). That condition has now been
  met (MVP shipped, both of you using it), so this is explicitly unblocked
  for consideration — see `docs/architecture/roadmap.md` §2. Still don't add
  it speculatively; add it when a real question falls through plain date/
  category filtering.
- **Errors never surface as errors.** Every endpoint returns `200` with a
  spoken-safe fallback sentence in the normal response shape — Siri has no
  error-handling UX, so the contract's job is to always give it something sane
  to say. Real errors are logged server-side only. See §7.
- **`category` is free text, not an enum column**, and `data` is a jsonb bag.
  The taxonomy will drift once you see what she actually logs; jsonb absorbs
  that without migrations. See §5.
- **Extraction uses Haiku, answering uses Sonnet.** Extraction is cheap and
  low-ambiguity; answering needs real reasoning over retrieved entries. Don't
  collapse these into one model tier. See §6.
- **Anthropic is called directly via `@ai-sdk/anthropic`, not the Vercel AI
  Gateway.** Keeps LLM billing entirely on your own Anthropic account instead
  of routing spend through Vercel. Model IDs: `claude-sonnet-5`,
  `claude-haiku-4-5`. See §4.2.
- **Multilingual by prompt instruction, not by separate pipeline.** She speaks
  Dutch; Claude handles that natively. Every prompt detects the input's
  language and replies in kind — don't hardcode Dutch or English anywhere.
  `category` enum keys stay fixed English internally regardless; only
  human-facing strings (`summary`, `confirmation`, `answer`) follow her
  language. Dictation/TTS language is a device-level Siri setting, not
  something the API controls. See §6.0.

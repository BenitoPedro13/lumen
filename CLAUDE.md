# Lumen

A private, voice-first memory-and-answer service for two people. She talks to
Siri; Siri talks to Lumen; Lumen remembers things and answers questions about
them — no app, no typing, no visible tech. Built as a pnpm/Turborepo monorepo
deployed to Vercel.

> **Status: Phase 0 (skeleton) not started.** Monorepo scaffolded, docs
> written, all open decisions resolved (`docs/architecture/overview.md` §10 —
> name Lumen, `Europe/Amsterdam`, ntfy.sh, starting categories as-is, Sunday
> 18:00 UTC recap). Next: provision Neon, then build `/log` and `/ask` in
> `apps/api`.

---

## Quick start

### Prerequisites

- Node ≥ 22 and pnpm ≥ 11 (`npm i -g pnpm`)
- A Neon Postgres project, provisioned via `vercel integration add neon` — see
  `docs/architecture/overview.md` §4.3

### Setup

```bash
# 1. Install all workspace deps
pnpm install

# 2. Copy env file and fill in your Neon connection string + a bearer token
cp apps/api/.env.example apps/api/.env

# 3. Generate and run the Drizzle migration
pnpm --filter @lumen/db db:generate
pnpm --filter @lumen/db db:migrate
```

### Run in development

```bash
# API only
pnpm --filter @lumen/api dev

# Everything via Turborepo
pnpm dev
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
  api/        Hono app on Vercel Functions — /log /ask /recap/run /health
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
- [`CLAUDE.md`](CLAUDE.md) — this file: workflow + project context for AI agents.

---

## Design decisions worth knowing before touching code

- **Vercel + Neon, not "run it on my Mac."** A Mac/Tailscale setup was the
  original brainstorm, but it fails the moment the laptop is asleep or off the
  network — and a broken voice interaction reads to her as "this doesn't
  work," not "the server's down." Always-on managed hosting removes that
  failure class entirely. See `docs/architecture/overview.md` §3.
- **No vector DB / embeddings for v1.** At personal-journal scale, a SQL date +
  category filter comfortably outperforms the complexity of semantic search.
  Revisit only if `/ask` starts needing fuzzy recall over months of history.
  See §4.3.
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
- **Multilingual by prompt instruction, not by separate pipeline.** She speaks
  Dutch; Claude handles that natively. Every prompt detects the input's
  language and replies in kind — don't hardcode Dutch or English anywhere.
  `category` enum keys stay fixed English internally regardless; only
  human-facing strings (`summary`, `confirmation`, `answer`) follow her
  language. Dictation/TTS language is a device-level Siri setting, not
  something the API controls. See §6.0.

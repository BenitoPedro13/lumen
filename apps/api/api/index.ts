import { Hono } from "hono";
import { handle } from "hono/vercel";

export const config = { runtime: "nodejs" };

const app = new Hono().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));

// /log, /ask, /recap/run land in Phase 0 once the open decisions in
// docs/architecture/overview.md §10 are settled (timezone, categories,
// push channel) — see that doc before wiring them up.

export default handle(app);

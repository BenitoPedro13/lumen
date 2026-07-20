export function isAuthorized(request: Request): boolean {
  return bearerMatches(request, process.env.LUMEN_API_TOKEN);
}

// Vercel Cron invokes the configured path with `Authorization: Bearer $CRON_SECRET`
// automatically once CRON_SECRET is set as a project env var — no shared LUMEN_API_TOKEN
// involved, since Shortcuts never calls this endpoint directly.
export function isAuthorizedCron(request: Request): boolean {
  return bearerMatches(request, process.env.CRON_SECRET);
}

function bearerMatches(request: Request, expected: string | undefined): boolean {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  return Boolean(expected) && token === expected;
}

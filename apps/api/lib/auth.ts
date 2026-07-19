export function isAuthorized(request: Request): boolean {
  const expected = process.env.LUMEN_API_TOKEN;
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  return Boolean(expected) && token === expected;
}

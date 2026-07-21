export * from "./schema";
export * from "./client";

// Re-exported so callers build queries against the same drizzle-orm instance
// this package uses internally — importing drizzle-orm separately in a
// consumer risks a duplicate-instance type mismatch (peer-resolved differently).
export { and, desc, eq, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";

import { desc, entries, eq } from "@lumen/db";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { undoConfirmation } from "@/lib/llm";

// Retracts the most recent entry this person created, in any space — an
// explicit user action, so unlike the /log correction flow there's no time
// window: "undo" always means "undo the last thing", however old it is.
export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ confirmation: "I couldn't verify that request." });
  }

  try {
    const [mostRecent] = await db
      .select()
      .from(entries)
      .where(eq(entries.createdBy, user.id))
      .orderBy(desc(entries.createdAt))
      .limit(1);

    if (!mostRecent) {
      return Response.json({ confirmation: "There's nothing to undo." });
    }

    await db.delete(entries).where(eq(entries.id, mostRecent.id));

    const result = await undoConfirmation(mostRecent.rawText, mostRecent.summary);
    return Response.json({ confirmation: result.confirmation });
  } catch (err) {
    console.error("POST /api/undo failed", err);
    return Response.json({ confirmation: "Something went wrong undoing that — try again in a bit." });
  }
}

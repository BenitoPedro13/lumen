import { z } from "zod";

import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@lumen/db";
import { eq } from "@lumen/db";

const UpdateMeBody = z.object({
  ntfyTopic: z.string().optional(),
  name: z.string().optional(),
});

export async function PATCH(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = UpdateMeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updates: Record<string, any> = {};
    if (parsed.data.ntfyTopic !== undefined) {
      updates.ntfyTopic = parsed.data.ntfyTopic || null;
    }
    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();

    return Response.json({
      id: updated.id,
      name: updated.name,
      ntfyTopic: updated.ntfyTopic,
    });
  } catch (err) {
    console.error("PATCH /api/me failed", err);
    return Response.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

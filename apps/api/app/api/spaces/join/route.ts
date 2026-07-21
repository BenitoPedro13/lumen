import { z } from "zod";

import { resolveUser } from "@/lib/auth";
import { joinSpace } from "@/lib/spaces";

const JoinSpaceBody = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = JoinSpaceBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const space = await joinSpace(user.id, parsed.data.code);
    if (!space) {
      return Response.json({ error: "Invite code not found" }, { status: 404 });
    }
    return Response.json(space, { status: 201 });
  } catch (err) {
    console.error("POST /api/spaces/join failed", err);
    return Response.json({ error: "Failed to join space" }, { status: 500 });
  }
}

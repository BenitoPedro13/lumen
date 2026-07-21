import { randomBytes } from "crypto";
import { createHash } from "crypto";

import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultSpace } from "@/lib/spaces";
import { users } from "@lumen/db";

const CreateUserBody = z.object({
  name: z.string().min(1),
  ntfyTopic: z.string().optional(),
});

function generateToken(): string {
  // 24 bytes = 192 bits of entropy, good for bearer tokens
  return randomBytes(24).toString("hex");
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateUserBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const token = generateToken();
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        tokenHash,
        ntfyTopic: parsed.data.ntfyTopic || null,
      })
      .returning();

    const defaultSpaceId = await ensureDefaultSpace(user.id, "Mine");

    return Response.json({
      userId: user.id,
      token, // Only time the raw token is shown
      defaultSpaceId,
    });
  } catch (err) {
    console.error("POST /api/admin/users failed", err);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

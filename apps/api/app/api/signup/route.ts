import { createHash, randomBytes } from "crypto";

import { z } from "zod";

import { db } from "@/lib/db";
import { ensureDefaultSpace, redeemSignupInvite, validateSignupInvite } from "@/lib/spaces";
import { users } from "@lumen/db";

const SignupBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  ntfyTopic: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = SignupBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // Validate invite
    const validation = await validateSignupInvite(parsed.data.code);
    if (!validation.valid) {
      return Response.json({ error: validation.reason || "Invalid invite" }, { status: 400 });
    }

    // Generate token
    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        tokenHash,
        ntfyTopic: parsed.data.ntfyTopic || null,
      })
      .returning();

    // Create default space
    const defaultSpaceId = await ensureDefaultSpace(user.id, "Mine");

    // Redeem invite
    await redeemSignupInvite(parsed.data.code, user.id);

    return Response.json(
      {
        userId: user.id,
        token, // Only time the raw token is shown
        defaultSpaceId,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/signup failed", err);
    return Response.json({ error: "Signup failed" }, { status: 500 });
  }
}

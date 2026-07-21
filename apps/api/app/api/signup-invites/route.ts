import { resolveUser } from "@/lib/auth";
import { createSignupInvite } from "@/lib/spaces";

export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const code = await createSignupInvite(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return Response.json({
      code,
      expiresAt,
      signupUrl: `/signup/${code}`,
    });
  } catch (err) {
    console.error("POST /api/signup-invites failed", err);
    return Response.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

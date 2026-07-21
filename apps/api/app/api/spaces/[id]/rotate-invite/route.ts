import { resolveUser } from "@/lib/auth";
import { rotateInviteCode } from "@/lib/spaces";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const spaceId = Number(id);

  if (isNaN(spaceId)) {
    return Response.json({ error: "Invalid space ID" }, { status: 400 });
  }

  try {
    const newCode = await rotateInviteCode(user.id, spaceId);
    if (!newCode) {
      return Response.json({ error: "Space not found or access denied" }, { status: 404 });
    }
    return Response.json({ inviteCode: newCode });
  } catch (err) {
    console.error("POST /api/spaces/[id]/rotate-invite failed", err);
    return Response.json({ error: "Failed to rotate invite code" }, { status: 500 });
  }
}

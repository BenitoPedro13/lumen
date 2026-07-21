import { z } from "zod";

import { resolveUser } from "@/lib/auth";
import { createSpace, userSpaces } from "@/lib/spaces";

const CreateSpaceBody = z.object({
  name: z.string().min(1),
  kind: z.enum(["journal", "tasks"]).default("journal"),
});

const ListSpacesRequest = z.object({});

export async function POST(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateSpaceBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const space = await createSpace(user.id, parsed.data.name, parsed.data.kind);
    return Response.json(space, { status: 201 });
  } catch (err) {
    console.error("POST /api/spaces failed", err);
    return Response.json({ error: "Failed to create space" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await resolveUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spaces = await userSpaces(user.id);
    return Response.json({ spaces });
  } catch (err) {
    console.error("GET /api/spaces failed", err);
    return Response.json({ error: "Failed to list spaces" }, { status: 500 });
  }
}

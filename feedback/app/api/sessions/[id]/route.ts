import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSessionById, updateSessionMetadata } from "@/lib/db/queries";

interface PatchBody {
  userId?: string;
  display_name?: string | null;
  summary?: string | null;
  thumbnail_url?: string | null;
}

interface DeleteBody {
  userId?: string;
}

async function assertSessionOwner(sessionId: string, userId: string) {
  const session = await getSessionById(sessionId);
  if (!session) {
    return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) };
  }
  if (session.user_id !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const check = await assertSessionOwner(sessionId, body.userId);
    if (check.error) return check.error;

    await deleteSession(sessionId, body.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const check = await assertSessionOwner(sessionId, body.userId);
    if (check.error) return check.error;

    const updated = await updateSessionMetadata(sessionId, {
      display_name:
        body.display_name === undefined
          ? undefined
          : body.display_name?.trim().slice(0, 80) ?? null,
      summary:
        body.summary === undefined
          ? undefined
          : body.summary?.trim().slice(0, 160) ?? null,
      thumbnail_url:
        body.thumbnail_url === undefined
          ? undefined
          : body.thumbnail_url?.slice(0, 500_000) ?? null,
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

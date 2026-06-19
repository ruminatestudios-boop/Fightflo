import { NextRequest, NextResponse } from "next/server";
import { revokeApiKey } from "@/lib/api-keys";
import { getStoredUserIdFromRequest } from "@/lib/api/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getStoredUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await revokeApiKey(params.id, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

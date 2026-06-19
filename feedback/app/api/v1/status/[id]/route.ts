import { NextRequest, NextResponse } from "next/server";
import { validateBearerApiKey } from "@/lib/api/auth";
import { getSessionById } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = await validateBearerApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const session = await getSessionById(params.id);
  if (!session || session.user_id !== apiKey.user_id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session_id: session.id,
    status: session.status,
    sport: session.sport,
    level: session.level,
    created_at: session.created_at,
    ...(session.status === "complete"
      ? { report_url: `https://feedback.fightflo.app/api/v1/report/${session.id}` }
      : {}),
  });
}

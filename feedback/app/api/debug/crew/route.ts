import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = process.env.CREW_ACCESS_TOKEN;
  const sentToken = request.headers.get("x-crew-token");
  return NextResponse.json({
    envSet: !!token,
    envLength: token?.length ?? 0,
    sentToken: sentToken ?? "(none)",
    match: !!token && !!sentToken && sentToken.trim() === token.trim(),
  });
}

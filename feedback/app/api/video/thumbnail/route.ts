import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="16" fill="url(#g)"/>
  <polygon points="68,52 108,80 68,108" fill="rgba(255,255,255,0.85)"/>
  <text x="80" y="132" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="11" font-family="system-ui,sans-serif">SESSION ${session.session_number}</text>
</svg>`.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

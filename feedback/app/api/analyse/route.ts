import { NextRequest, NextResponse } from "next/server";
import { startAnalysisPipeline } from "@/lib/analysis/startPipeline";
import { getSessionById } from "@/lib/db/queries";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "complete") {
      return NextResponse.json({ status: "complete", sessionId });
    }

    if (session.status === "processing") {
      return NextResponse.json({ status: "processing", sessionId });
    }

    startAnalysisPipeline(sessionId);

    return NextResponse.json({ status: "processing", sessionId });
  } catch (error) {
    console.error("[analyse]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId,
    status: session.status,
    progress: {
      step: (session as { progress_step?: string }).progress_step ?? session.status,
      message:
        (session as { progress_message?: string }).progress_message ??
        "Processing...",
    },
  });
}

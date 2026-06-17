import { NextRequest, NextResponse } from "next/server";
import { scheduleAnalysisPipeline } from "@/lib/analysis/startPipeline";
import { getReportBySessionId, getSessionById } from "@/lib/db/queries";

export const runtime = "nodejs";
export const maxDuration = 300;

function sessionNeedsPipelineKick(session: {
  status: string;
  created_at: string;
  progress_step?: string;
}): boolean {
  const step = session.progress_step ?? "";
  const ageMs = Date.now() - new Date(session.created_at).getTime();

  if (session.status === "uploading") return true;
  if (session.status === "processing" && step === "uploading") return true;
  if (session.status === "processing" && step === "extracting_frames" && ageMs > 45_000) {
    return true;
  }
  return false;
}

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

    if (session.status === "failed") {
      return NextResponse.json({ status: "failed", sessionId });
    }

    const report = await getReportBySessionId(sessionId);
    if (report) {
      return NextResponse.json({ status: "complete", sessionId });
    }

    if (sessionNeedsPipelineKick(session)) {
      scheduleAnalysisPipeline(sessionId);
      return NextResponse.json({ status: "processing", sessionId, kicked: true });
    }

    if (session.status === "processing") {
      return NextResponse.json({ status: "processing", sessionId });
    }

    scheduleAnalysisPipeline(sessionId);
    return NextResponse.json({ status: "processing", sessionId, kicked: true });
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

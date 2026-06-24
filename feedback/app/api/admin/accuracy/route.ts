import { NextRequest, NextResponse } from "next/server";
import {
  listClaimReviews,
  listRecentReportsForReview,
  upsertClaimReview,
} from "@/lib/db/queries";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("x-admin-secret")?.trim();
  return provided === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reports, reviews] = await Promise.all([
    listRecentReportsForReview(30),
    listClaimReviews(),
  ]);

  return NextResponse.json({ reports, reviews });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    claimId?: string;
    reportId?: string;
    sessionId?: string;
    claimKind?: "weakness" | "positive";
    weaknessType?: string | null;
    verdict?: "match" | "no_match" | "unsure";
    failReason?: string | null;
  };

  if (!body.claimId || !body.reportId || !body.sessionId || !body.claimKind || !body.verdict) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await upsertClaimReview({
    claimId: body.claimId,
    reportId: body.reportId,
    sessionId: body.sessionId,
    claimKind: body.claimKind,
    weaknessType: body.weaknessType,
    verdict: body.verdict,
    failReason: body.failReason,
  });

  return NextResponse.json({ ok: true });
}

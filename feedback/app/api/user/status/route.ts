import { NextRequest, NextResponse } from "next/server";
import { hasProAccess } from "@/lib/config/env";
import { ensureDevDatabaseReady } from "@/lib/db/devFallback";
import { getAnalysisAllowance } from "@/lib/storage/sessions";
import { getUserById } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await ensureDevDatabaseReady();
  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({
      isPro: hasProAccess(null),
      hasEmail: false,
      email: null,
      canAnalyse: true,
      used: 0,
      limit: 1,
      bonusScans: 0,
      message: "",
    });
  }

  const allowance = await getAnalysisAllowance(userId);

  return NextResponse.json({
    ...allowance,
    hasEmail: Boolean(user.email?.trim()),
    email: user.email?.trim() || null,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getApiCredits } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const credits = await getApiCredits(userId);
  return NextResponse.json({ credits });
}

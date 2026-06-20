import { NextRequest, NextResponse } from "next/server";
import { listScanCosts } from "@/lib/db/queries";

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

  const rows = await listScanCosts(500);

  const totalUsd = rows.reduce((sum, r) => sum + Number(r.total_usd), 0);
  const completeRows = rows.filter((r) => r.status === "complete");
  const avgUsd = completeRows.length > 0 ? totalUsd / completeRows.length : 0;

  const byUser = new Map<string, { userId: string; scanCount: number; totalUsd: number }>();
  for (const row of rows) {
    const key = row.user_id ?? "unknown";
    const existing = byUser.get(key);
    if (existing) {
      existing.scanCount += 1;
      existing.totalUsd += Number(row.total_usd);
    } else {
      byUser.set(key, { userId: key, scanCount: 1, totalUsd: Number(row.total_usd) });
    }
  }

  const perUser = Array.from(byUser.values()).sort((a, b) => b.totalUsd - a.totalUsd);

  return NextResponse.json({
    totalUsd,
    scanCount: rows.length,
    avgUsd,
    perUser,
    recent: rows.slice(0, 50),
  });
}

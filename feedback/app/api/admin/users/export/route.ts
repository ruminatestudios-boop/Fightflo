import { NextRequest, NextResponse } from "next/server";
import { listAllUsersForExport } from "@/lib/db/queries";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("x-admin-secret")?.trim();
  return provided === secret;
}

function csvEscape(value: string | number | boolean | null): string {
  const str = value === null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailsOnly = request.nextUrl.searchParams.get("emailsOnly") === "true";
  const users = await listAllUsersForExport(emailsOnly);

  const headers = [
    "id",
    "email",
    "sport",
    "level",
    "is_pro",
    "subscription_status",
    "free_analyses_used",
    "free_analyses_limit",
    "bonus_scans",
    "created_at",
  ];

  const lines = [
    headers.join(","),
    ...users.map((u) =>
      [
        u.id,
        u.email,
        u.sport,
        u.level,
        u.is_pro,
        u.subscription_status,
        u.free_analyses_used,
        u.free_analyses_limit,
        u.bonus_scans,
        u.created_at,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fightflo-users-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

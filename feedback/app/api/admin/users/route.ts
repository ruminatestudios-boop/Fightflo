import { NextRequest, NextResponse } from "next/server";
import {
  getUserSessions,
  listRecentUsers,
  searchUsers,
  setUserBonusScans,
  setUserIsPro,
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

  const search = request.nextUrl.searchParams.get("q")?.trim();
  const users = search ? await searchUsers(search) : await listRecentUsers(50);

  const withSessionCounts = await Promise.all(
    users.map(async (u) => {
      const sessions = await getUserSessions(u.id);
      return { ...u, sessionCount: sessions.length };
    })
  );

  return NextResponse.json({ users: withSessionCounts });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    userId?: string;
    bonusScans?: number;
    isPro?: boolean;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    if (body.bonusScans !== undefined) {
      await setUserBonusScans(body.userId, body.bonusScans);
    }
    if (body.isPro !== undefined) {
      await setUserIsPro(body.userId, body.isPro);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 400 }
    );
  }
}

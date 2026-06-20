import { NextRequest, NextResponse } from "next/server";
import {
  createInviteCode,
  listInviteCodes,
  updateInviteCode,
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

  const codes = await listInviteCodes();
  return NextResponse.json({ codes });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    code?: string;
    label?: string;
    totalLimit?: number;
  };

  if (!body.code || !body.totalLimit || body.totalLimit <= 0) {
    return NextResponse.json(
      { error: "code and totalLimit (> 0) are required" },
      { status: 400 }
    );
  }

  try {
    const created = await createInviteCode({
      code: body.code.trim(),
      label: body.label?.trim() || null,
      totalLimit: body.totalLimit,
    });
    return NextResponse.json({ code: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create code" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    code?: string;
    totalLimit?: number;
    active?: boolean;
  };

  if (!body.code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const updated = await updateInviteCode(body.code.trim(), {
      totalLimit: body.totalLimit,
      active: body.active,
    });
    return NextResponse.json({ code: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update code" },
      { status: 400 }
    );
  }
}

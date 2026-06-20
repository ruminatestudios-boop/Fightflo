import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET?.trim() ?? "";
  const provided = request.headers.get("x-admin-secret")?.trim() ?? "";

  return NextResponse.json({
    envSet: !!secret,
    envLength: secret.length,
    envFirst4: secret.slice(0, 4),
    envLast4: secret.slice(-4),
    providedLength: provided.length,
    match: secret === provided,
  });
}

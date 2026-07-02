import { NextResponse } from "next/server";

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  const { passcode } = (await request.json()) as { passcode?: string };
  const expected = (process.env.TASKS_PASSCODE_HASH || "").trim();
  const secret = (process.env.TASKS_API_SECRET || "").trim();

  if (!expected || !secret) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }
  if (!passcode) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const actual = await sha256Hex(passcode);
  const ok = actual === expected;
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Hand the client a secret to authenticate subsequent /api/tasks* writes with,
  // since knowing the correct passcode is what proves the request is authorized.
  return NextResponse.json({ ok: true, secret });
}

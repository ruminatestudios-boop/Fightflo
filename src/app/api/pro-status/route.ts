import { NextResponse } from "next/server";
import { ensureUser, getUser } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId")?.trim();

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const user = (await getUser(deviceId)) ?? (await ensureUser(deviceId));

  if (!user) {
    return NextResponse.json({
      isPro: false,
      plan: null,
      synced: false,
    });
  }

  return NextResponse.json({
    isPro: user.isPro,
    plan: user.plan ?? null,
    synced: true,
  });
}

export async function POST(request: Request) {
  let body: { deviceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  await ensureUser(deviceId);
  const user = await getUser(deviceId);

  return NextResponse.json({
    isPro: user?.isPro ?? false,
    plan: user?.plan ?? null,
    synced: Boolean(user),
  });
}

import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/db/users";
import { savePushSubscription } from "@/lib/db/push-subscriptions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    deviceId?: string;
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;

  if (!deviceId || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await ensureUser(deviceId);
  await savePushSubscription(deviceId, {
    endpoint,
    keys: { p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

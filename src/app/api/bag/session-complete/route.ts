import { NextResponse } from "next/server";
import { recordBagSession, markNotification } from "@/lib/db/users";
import { sendPushToDevice } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    deviceId?: string;
    combosThrown?: number;
    sessionType?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const combosThrown =
    body.sessionType === "flurry" ? 0 : Math.max(0, body.combosThrown ?? 1);

  await recordBagSession(deviceId, combosThrown);

  const today = new Date().toISOString().slice(0, 10);
  await markNotification(deviceId, { postSessionSentDate: today });

  void sendPushToDevice(deviceId, {
    title: "Nice work today.",
    body: "Come back tomorrow to beat your score.",
    url: "/",
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import {
  getWeeklyComboPercentile,
  listUsersForCron,
  markNotification,
} from "@/lib/db/users";
import { sendPushToDevice } from "@/lib/push-server";

export const runtime = "nodejs";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((utcB - utcA) / ms);
}

function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${date.getUTCFullYear()}-W${week}`;
}

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const day = now.getUTCDay();
  const today = todayKey();

  const users = await listUsersForCron();
  let sent = 0;

  for (const user of users) {
    const last = user.lastSessionAt ? new Date(user.lastSessionAt) : null;
    const created = new Date(user.createdAt);
    const daysSinceSignup = daysBetween(created, now);
    const notif = user.notifications ?? {};

    // Day 1 after signup (daily cron at 17:00 UTC)
    if (daysSinceSignup === 1 && !last && !notif.day1Sent) {
      const n = await sendPushToDevice(user.deviceId, {
        title: "Your bag is waiting 👊",
        body: "5 minutes is enough. Open fightflo.",
        url: "/",
      });
      if (n > 0) {
        await markNotification(user.deviceId, { day1Sent: true });
        sent += n;
      }
    }

    // Missed day — no session today, last session before today
    if (last) {
      const lastDay = last.toISOString().slice(0, 10);
      const missed = lastDay < today && notif.slippedSentDate !== today;
      if (missed) {
        const n = await sendPushToDevice(user.deviceId, {
          title: "You slipped.",
          body: "Get back on the bag. Your streak is at risk.",
          url: "/",
        });
        if (n > 0) {
          await markNotification(user.deviceId, { slippedSentDate: today });
          sent += n;
        }
      }
    }

    // Sunday weekly recap — Pro only (same daily cron run)
    if (
      day === 0 &&
      user.isPro &&
      user.weeklyCombos > 0 &&
      notif.weeklyRecapSentWeek !== isoWeekKey(now)
    ) {
      const topPct = await getWeeklyComboPercentile(user.weeklyCombos);
      const n = await sendPushToDevice(user.deviceId, {
        title: "Your week on the bag 🔥",
        body: `You threw ${user.weeklyCombos} combos. Top ${topPct}% of fightflo.`,
        url: "/",
      });
      if (n > 0) {
        await markNotification(user.deviceId, {
          weeklyRecapSentWeek: isoWeekKey(now),
        });
        sent += n;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, users: users.length });
}

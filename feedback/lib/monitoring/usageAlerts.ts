import { getUsageAlertCycle, recordUsageAlert } from "@/lib/db/queries";

const ALERT_THRESHOLD_PERCENT = 80;
const ALERT_EMAIL = process.env.ALERT_EMAIL?.trim() || "ruminatestudios@gmail.com";

interface UsageCheck {
  service: string;
  usedPercent: number;
  detail: string;
}

async function checkCloudinaryUsage(): Promise<UsageCheck | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    plan: string;
    credits: { usage: number; limit: number; used_percent: number };
  };

  return {
    service: "cloudinary",
    usedPercent: data.credits.used_percent,
    detail: `${data.plan} plan — ${data.credits.usage.toFixed(1)}/${data.credits.limit} credits used`,
  };
}

/** Add more checks here as they become measurable (Gemini quota, Supabase size, etc). */
async function runAllChecks(): Promise<UsageCheck[]> {
  const checks = await Promise.all([checkCloudinaryUsage()]);
  return checks.filter((c): c is UsageCheck => c !== null);
}

function currentCycleKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
}

async function alreadyAlertedThisCycle(service: string, cycleKey: string): Promise<boolean> {
  const existing = await getUsageAlertCycle(service);
  return existing === cycleKey;
}

async function sendUsageAlertEmail(check: UsageCheck): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY?.trim();
  if (!apiKey) {
    console.error("[usageAlerts] LOOPS_API_KEY not set — cannot send alert email:", check);
    return;
  }

  const transactionalId = process.env.LOOPS_TX_USAGE_ALERT?.trim() || "usage_alert";

  await fetch("https://app.loops.so/api/v1/transactional", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionalId,
      email: ALERT_EMAIL,
      dataVariables: {
        service: check.service,
        usedPercent: Math.round(check.usedPercent),
        detail: check.detail,
      },
    }),
  }).catch((error) => console.error("[usageAlerts] failed to send alert email:", error));
}

/** Run from the daily cron — checks usage, emails once per service per billing cycle if over threshold. */
export async function runUsageAlertCheck(): Promise<{ checked: number; alerted: string[] }> {
  const cycleKey = currentCycleKey();
  const checks = await runAllChecks();
  const alerted: string[] = [];

  for (const check of checks) {
    if (check.usedPercent < ALERT_THRESHOLD_PERCENT) continue;
    if (await alreadyAlertedThisCycle(check.service, cycleKey)) continue;

    await sendUsageAlertEmail(check);
    await recordUsageAlert(check.service, cycleKey, check.usedPercent);
    alerted.push(check.service);
  }

  return { checked: checks.length, alerted };
}

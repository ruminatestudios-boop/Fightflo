"use client";

import { getDeviceId } from "@/lib/device-id";
import { setPro } from "@/lib/subscription";

export async function registerDevice(): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch("/api/pro-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
  } catch {
    /* offline */
  }
}

export async function syncProFromServer(): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!deviceId) return false;

  try {
    const res = await fetch(
      `/api/pro-status?deviceId=${encodeURIComponent(deviceId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { isPro?: boolean; synced?: boolean };
    if (data.isPro) {
      setPro(true);
      return true;
    }
    if (data.synced) {
      setPro(false);
    }
    return false;
  } catch {
    return false;
  }
}

export async function startCheckout(
  plan: "monthly" | "annual",
  returnPath = "/bag"
): Promise<string | null> {
  const deviceId = getDeviceId();
  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, plan, returnPath }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

export async function notifySessionComplete(payload: {
  sessionType: string;
  combosThrown?: number;
}): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch("/api/bag/session-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, ...payload }),
    });
  } catch {
    /* offline */
  }
}

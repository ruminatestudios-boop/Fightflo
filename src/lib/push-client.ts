"use client";

import { getDeviceId } from "@/lib/device-id";

const PUSH_DECLINED_KEY = "flowbag-push-declined";
const PUSH_SUBSCRIBED_KEY = "flowbag-push-subscribed";

export function hasDeclinedPush(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(PUSH_DECLINED_KEY) === "true";
}

export function hasSubscribedPush(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "true";
}

export function declinePushReminders(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUSH_DECLINED_KEY, "true");
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeToPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    declinePushReminders();
    return false;
  }

  const keyRes = await fetch("/api/push/vapid-public-key");
  if (!keyRes.ok) return false;
  const { publicKey } = (await keyRes.json()) as { publicKey: string };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  const deviceId = getDeviceId();

  const res = await fetch("/api/push/save-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      subscription: {
        endpoint: json.endpoint,
        keys: json.keys,
      },
    }),
  });

  if (!res.ok) return false;

  localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
  return true;
}

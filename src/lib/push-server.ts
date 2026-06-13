import webpush from "web-push";
import {
  getSubscriptionsForDevice,
  removePushSubscription,
} from "@/lib/db/push-subscriptions";

let configured = false;

function configureWebPush(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:hello@fightflo.app";
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function sendPushToDevice(
  deviceId: string,
  payload: { title: string; body: string; url?: string }
): Promise<number> {
  if (!configureWebPush()) return 0;

  const subs = await getSubscriptionsForDevice(deviceId);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url ?? "/",
          })
        );
        sent += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await removePushSubscription(sub.endpoint);
        }
      }
    })
  );

  return sent;
}

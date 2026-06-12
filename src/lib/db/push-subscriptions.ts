import { getDb } from "./mongodb";
import type { StoredPushSubscription } from "./types";

const COLLECTION = "push_subscriptions";

export async function savePushSubscription(
  deviceId: string,
  sub: { endpoint: string; keys: StoredPushSubscription["keys"] }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const doc: StoredPushSubscription = {
    deviceId,
    endpoint: sub.endpoint,
    keys: sub.keys,
    createdAt: new Date(),
  };

  await db.collection<StoredPushSubscription>(COLLECTION).updateOne(
    { endpoint: sub.endpoint },
    { $set: doc },
    { upsert: true }
  );
}

export async function getSubscriptionsForDevice(
  deviceId: string
): Promise<StoredPushSubscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .collection<StoredPushSubscription>(COLLECTION)
    .find({ deviceId })
    .toArray();
}

export async function getAllPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.collection<StoredPushSubscription>(COLLECTION).find({}).toArray();
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.collection(COLLECTION).deleteOne({ endpoint });
}

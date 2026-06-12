import { getDb } from "./mongodb";
import type { SubscriptionPlan, UserRecord } from "./types";

const COLLECTION = "users";

function weekStartKey(d = new Date()): string {
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

export async function ensureUser(deviceId: string): Promise<UserRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const col = db.collection<UserRecord>(COLLECTION);
  const existing = await col.findOne({ deviceId });
  if (existing) return existing;

  const user: UserRecord = {
    deviceId,
    isPro: false,
    createdAt: new Date(),
    totalSessions: 0,
    weeklyCombos: 0,
    weekStart: weekStartKey(),
    notifications: {},
  };
  await col.insertOne(user);
  return user;
}

export async function getUser(deviceId: string): Promise<UserRecord | null> {
  const db = await getDb();
  if (!db) return null;
  return db.collection<UserRecord>(COLLECTION).findOne({ deviceId });
}

export async function setUserPro(
  deviceId: string,
  isPro: boolean,
  extra?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    plan?: SubscriptionPlan;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.collection<UserRecord>(COLLECTION).updateOne(
    { deviceId },
    {
      $set: {
        isPro,
        ...extra,
      },
      $setOnInsert: {
        createdAt: new Date(),
        totalSessions: 0,
        weeklyCombos: 0,
        weekStart: weekStartKey(),
        notifications: {},
      },
    },
    { upsert: true }
  );
}

export async function setUserProByStripeCustomer(
  stripeCustomerId: string,
  isPro: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .collection<UserRecord>(COLLECTION)
    .updateMany({ stripeCustomerId }, { $set: { isPro } });
}

export async function recordBagSession(
  deviceId: string,
  combosThrown: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const ws = weekStartKey();
  const user = await ensureUser(deviceId);
  if (!user) return;

  const weeklyCombos =
    user.weekStart === ws ? user.weeklyCombos + combosThrown : combosThrown;

  await db.collection<UserRecord>(COLLECTION).updateOne(
    { deviceId },
    {
      $set: {
        lastSessionAt: new Date(),
        weeklyCombos,
        weekStart: ws,
      },
      $inc: { totalSessions: 1 },
    }
  );
}

export async function markNotification(
  deviceId: string,
  patch: Partial<UserRecord["notifications"]>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    set[`notifications.${k}`] = v;
  }
  await db.collection<UserRecord>(COLLECTION).updateOne({ deviceId }, { $set: set });
}

export async function listUsersForCron(): Promise<UserRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db.collection<UserRecord>(COLLECTION).find({}).toArray();
}

export async function getWeeklyComboPercentile(
  weeklyCombos: number
): Promise<number> {
  const db = await getDb();
  if (!db || weeklyCombos <= 0) return 50;

  const col = db.collection<UserRecord>(COLLECTION);
  const total = await col.countDocuments({ weeklyCombos: { $gt: 0 } });
  if (total === 0) return 50;

  const below = await col.countDocuments({
    weeklyCombos: { $lt: weeklyCombos },
  });
  const pct = Math.round((below / total) * 100);
  return Math.max(1, Math.min(99, 100 - pct));
}

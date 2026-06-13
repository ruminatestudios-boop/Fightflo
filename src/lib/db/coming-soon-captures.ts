import { COMING_SOON_COPY } from "@/lib/bag-drill/copy";
import { getDb } from "./mongodb";

export interface ComingSoonCaptureRecord {
  email: string;
  source: "coming_soon_banner";
  interestedIn: ("muaythai" | "kickboxing")[];
  capturedAt: Date;
  deviceId?: string;
}

const COLLECTION = "coming_soon_captures";

/** Baseline for social proof when DB is empty or unavailable. */
export const COMING_SOON_WAITLIST_BASE = COMING_SOON_COPY.waitlistBaseCount;

export async function recordComingSoonCapture(data: {
  email: string;
  deviceId?: string;
  interestedIn: ("muaythai" | "kickboxing")[];
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const normalized = data.email.trim().toLowerCase();

  await db.collection<ComingSoonCaptureRecord>(COLLECTION).updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        source: "coming_soon_banner",
        interestedIn: data.interestedIn,
        capturedAt: new Date(),
        deviceId: data.deviceId,
      },
    },
    { upsert: true }
  );
}

export async function getComingSoonWaitlistCount(): Promise<number> {
  const db = await getDb();
  if (!db) return COMING_SOON_WAITLIST_BASE;

  try {
    const count = await db.collection(COLLECTION).countDocuments();
    return COMING_SOON_WAITLIST_BASE + count;
  } catch {
    return COMING_SOON_WAITLIST_BASE;
  }
}

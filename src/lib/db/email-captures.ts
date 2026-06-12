import { getDb } from "./mongodb";
import type { EmailCaptureSource } from "@/lib/boxing-timer/email-capture-storage";

export interface EmailCaptureRecord {
  email: string;
  capturedFrom: EmailCaptureSource;
  timerSessionsBeforeCapture: number;
  clickedFlowbagLink: boolean;
  convertedToFlowbagUser: boolean;
  convertedToPaying: boolean;
  capturedAt: Date;
  deviceId?: string;
}

const COLLECTION = "email_captures";

export async function recordEmailCapture(
  data: Omit<EmailCaptureRecord, "capturedAt" | "clickedFlowbagLink" | "convertedToFlowbagUser" | "convertedToPaying"> & {
    clickedFlowbagLink?: boolean;
    convertedToFlowbagUser?: boolean;
    convertedToPaying?: boolean;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const normalized = data.email.trim().toLowerCase();

  await db.collection<EmailCaptureRecord>(COLLECTION).updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        capturedFrom: data.capturedFrom,
        timerSessionsBeforeCapture: data.timerSessionsBeforeCapture,
        deviceId: data.deviceId,
        capturedAt: new Date(),
      },
      $setOnInsert: {
        clickedFlowbagLink: data.clickedFlowbagLink ?? false,
        convertedToFlowbagUser: data.convertedToFlowbagUser ?? false,
        convertedToPaying: data.convertedToPaying ?? false,
      },
    },
    { upsert: true }
  );
}

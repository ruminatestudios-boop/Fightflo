import type { Session } from "@/types";
import { DEMO_CLOUDINARY_PUBLIC_ID } from "@/lib/demo/sampleData";

/** Sessions created from the baked sample analysis (See sample breakdown report). */
export function isDemoSession(session: Pick<Session, "cloudinary_public_id">): boolean {
  if (!session.cloudinary_public_id) return false;
  return session.cloudinary_public_id === DEMO_CLOUDINARY_PUBLIC_ID;
}

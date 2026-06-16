import { Suspense } from "react";
import { ReportPageClient } from "./ReportPageClient";
import { ensureDevDatabaseReady } from "@/lib/db/devFallback";
import {
  getReportBySessionId,
  getSessionById,
  getUserById,
} from "@/lib/db/queries";
import { hasProAccess } from "@/lib/config/env";

interface ReportPageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = params;

  let initialReport = null;
  let initialSession = null;

  let isPro = false;

  try {
    await ensureDevDatabaseReady();
    initialSession = await getSessionById(id);
    if (initialSession?.user_id) {
      const user = await getUserById(initialSession.user_id);
      isPro = hasProAccess(user);
    }
    if (initialSession?.status === "complete") {
      initialReport = await getReportBySessionId(id);
    }
  } catch {
    // Client will poll when SSR data unavailable (no env in dev)
  }

  return (
    <Suspense fallback={null}>
      <ReportPageClient
        sessionId={id}
        initialReport={initialReport}
        initialSession={initialSession}
        initialIsPro={isPro}
      />
    </Suspense>
  );
}

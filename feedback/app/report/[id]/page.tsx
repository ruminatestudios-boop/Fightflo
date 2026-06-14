import { ReportPageClient } from "./ReportPageClient";
import {
  getReportBySessionId,
  getSessionById,
} from "@/lib/db/queries";

interface ReportPageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = params;

  let initialReport = null;
  let initialSession = null;

  try {
    initialSession = await getSessionById(id);
    if (initialSession?.status === "complete") {
      initialReport = await getReportBySessionId(id);
    }
  } catch {
    // Client will poll when SSR data unavailable (no env in dev)
  }

  return (
    <ReportPageClient
      sessionId={id}
      initialReport={initialReport}
      initialSession={initialSession}
    />
  );
}

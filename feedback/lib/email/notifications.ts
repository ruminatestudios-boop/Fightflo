import { getSportConfig } from "@/config/sports";
import { humanLabelForWeakness } from "@/lib/analysis/poseMetrics";
import {
  currentIsoWeekKey,
  markEmailSent,
  wasEmailSent,
  wasEmailSentWithinDays,
} from "@/lib/email/log";
import {
  createFeedbackContact,
  sendAnalysisReadyEmail,
  sendComebackEmail,
  sendUpgradePromptEmail,
  sendWeeklyProgressEmail,
} from "@/lib/email/loops";
import {
  getReportBySessionId,
  getUserById,
  listUsersForScheduledEmails,
} from "@/lib/db/queries";
import type { CoachingFeedback, SportId } from "@/types";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function saveUserEmail(input: {
  userId: string;
  email: string;
  sport?: SportId;
  level?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, error: "Invalid email address" };
  }

  const { updateUserEmail } = await import("@/lib/db/queries");
  const user = await updateUserEmail(input.userId, email);
  if (!user) return { ok: false, error: "User not found" };

  await createFeedbackContact({
    email,
    userId: user.id,
    sport: (input.sport ?? user.sport) as SportId,
    level: user.level,
  }).catch(() => undefined);

  const { getUserSessions } = await import("@/lib/db/queries");
  const sessions = await getUserSessions(user.id);
  const latestComplete = sessions.find((s) => s.status === "complete");
  if (latestComplete) {
    const report = await getReportBySessionId(latestComplete.id);
    if (report) {
      await notifyReportReady({
        sessionId: latestComplete.id,
        userId: user.id,
        sport: latestComplete.sport as SportId,
        feedback: {
          positives: report.positives,
          main_weakness: report.main_weakness,
          pattern_insight: report.pattern_insight,
          drill: report.drill,
          coach_summary: report.coach_summary,
        },
      }).catch(() => undefined);
    }
  }

  return { ok: true };
}

export async function notifyReportReady(input: {
  sessionId: string;
  userId?: string | null;
  sport: SportId;
  feedback: CoachingFeedback;
}): Promise<void> {
  if (!input.userId) return;

  const already = await wasEmailSent(
    input.userId,
    "analysis_ready",
    input.sessionId
  );
  if (already) return;

  const user = await getUserById(input.userId);
  if (!user?.email?.trim()) return;

  const sportName = getSportConfig(input.sport).name;
  const result = await sendAnalysisReadyEmail({
    email: user.email,
    reportUrl: `${appUrl()}/report/${input.sessionId}`,
    mainFinding: input.feedback.main_weakness.title,
    sport: sportName,
  });

  if (result.ok || result.skipped) {
    await markEmailSent(input.userId, "analysis_ready", input.sessionId);
  }
}

export async function runScheduledEmails(): Promise<{
  upgrade: number;
  comeback: number;
  weekly: number;
}> {
  const stats = { upgrade: 0, comeback: 0, weekly: 0 };
  const isSunday = new Date().getUTCDay() === 0;
  const weekKey = currentIsoWeekKey();
  const uploadUrl = appUrl();

  const candidates = await listUsersForScheduledEmails();

  for (const row of candidates) {
    if (!row.email?.trim()) continue;

    if (
      !row.is_pro &&
      row.session_count === 1 &&
      row.days_since_last_session >= 3 &&
      !(await wasEmailSent(row.user_id, "upgrade_prompt"))
    ) {
      const report = row.latest_session_id
        ? await getReportBySessionId(row.latest_session_id)
        : null;
      const mainFinding =
        report?.main_weakness?.title ??
        (row.primary_weakness
          ? humanLabelForWeakness(row.primary_weakness)
          : "your main coaching focus");

      const result = await sendUpgradePromptEmail({
        email: row.email,
        mainFinding,
        uploadUrl,
      });

      if (result.ok || result.skipped) {
        await markEmailSent(row.user_id, "upgrade_prompt");
        stats.upgrade += 1;
      }
    }

    if (
      row.days_since_last_session >= 7 &&
      row.primary_weakness &&
      !(await wasEmailSentWithinDays(row.user_id, "comeback", 7))
    ) {
      const weakness = humanLabelForWeakness(row.primary_weakness);
      const result = await sendComebackEmail({
        email: row.email,
        weakness,
        uploadUrl,
      });

      if (result.ok || result.skipped) {
        await markEmailSent(row.user_id, "comeback");
        stats.comeback += 1;
      }
    }

    if (
      isSunday &&
      row.is_pro &&
      row.sessions_this_week > 0 &&
      !(await wasEmailSent(row.user_id, "weekly_progress", weekKey))
    ) {
      const trendLabel =
        row.weakness_trend === "improving"
          ? "improving"
          : row.weakness_trend === "worse"
            ? "needs attention"
            : "holding steady";

      const result = await sendWeeklyProgressEmail({
        email: row.email,
        sessionsThisWeek: row.sessions_this_week,
        weaknessTrend: trendLabel,
      });

      if (result.ok || result.skipped) {
        await markEmailSent(row.user_id, "weekly_progress", weekKey);
        stats.weekly += 1;
      }
    }
  }

  return stats;
}

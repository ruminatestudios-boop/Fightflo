import { randomUUID } from "crypto";
import { startOfCurrentMonthUtc } from "@/config/limits";
import { exportCacheVersion } from "@/lib/video/exportManifest";
import type {
  ClipRecord,
  CoachingFeedback,
  FollowUpComparison,
  LandmarkTimeline,
  Report,
  ReportClip,
  Session,
  SessionStatus,
  SkillLevel,
  SportId,
  User,
  WeaknessRecord,
} from "@/types";

type DevSession = Session & {
  progress_step?: string;
  progress_message?: string;
};

const users = new Map<string, User>();
const sessions = new Map<string, DevSession>();
const reports = new Map<string, Report>();
const reportsBySession = new Map<string, string>();
const clips = new Map<string, ClipRecord[]>();
const weaknesses = new Map<string, WeaknessRecord>();

function now() {
  return new Date().toISOString();
}

export async function createAnonymousUser(
  sport: SportId,
  level: SkillLevel
): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: "",
    created_at: now(),
    sport,
    level,
    is_pro: false,
    stripe_customer_id: null,
    subscription_status: "none",
    free_analyses_used: 0,
    free_analyses_limit: 1,
    bonus_scans: 0,
  };
  users.set(user.id, user);
  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  const user = users.get(userId);
  if (!user) return null;
  return { ...user, bonus_scans: user.bonus_scans ?? 0 };
}

export async function updateUserEmail(
  userId: string,
  email: string
): Promise<User | null> {
  const user = users.get(userId);
  if (!user) return null;
  user.email = email.trim().toLowerCase();
  return user;
}

export async function incrementFreeAnalyses(userId: string): Promise<void> {
  const user = users.get(userId);
  if (user) user.free_analyses_used += 1;
}

export async function createSession(input: {
  id?: string;
  userId?: string | null;
  sport: SportId;
  level: SkillLevel;
  videoUrl: string;
  videoDuration?: number;
  cloudinaryPublicId?: string;
  parentSessionId?: string | null;
}): Promise<DevSession> {
  let sessionNumber = 1;
  if (input.userId) {
    sessionNumber =
      [...sessions.values()].filter((s) => s.user_id === input.userId).length +
      1;
  }

  const session: DevSession = {
    id: input.id ?? randomUUID(),
    user_id: input.userId ?? null,
    created_at: now(),
    sport: input.sport,
    level: input.level,
    video_url: input.videoUrl,
    video_duration: input.videoDuration ?? 0,
    status: "uploading",
    session_number: sessionNumber,
    progress_step: "uploading",
    progress_message: "Uploading your video...",
    cloudinary_public_id: input.cloudinaryPublicId ?? null,
    parent_session_id: input.parentSessionId ?? null,
  };
  sessions.set(session.id, session);
  return session;
}

export async function getSessionById(
  sessionId: string
): Promise<DevSession | null> {
  return sessions.get(sessionId) ?? null;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  progress?: { step: string; message: string }
): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.status = status;
  if (progress) {
    session.progress_step = progress.step;
    session.progress_message = progress.message;
  }
}

export async function updateSessionSport(
  sessionId: string,
  sport: SportId
): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) session.sport = sport;
}

export async function updateSessionMetadata(
  sessionId: string,
  patch: {
    display_name?: string | null;
    summary?: string | null;
    thumbnail_url?: string | null;
  }
): Promise<DevSession | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (patch.display_name !== undefined) session.display_name = patch.display_name;
  if (patch.summary !== undefined) session.summary = patch.summary;
  if (patch.thumbnail_url !== undefined) session.thumbnail_url = patch.thumbnail_url;

  return session;
}

export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session || session.user_id !== userId) return false;

  const reportId = reportsBySession.get(sessionId);
  if (reportId) {
    clips.delete(reportId);
    reports.delete(reportId);
    reportsBySession.delete(sessionId);
  }

  sessions.delete(sessionId);
  return true;
}

export async function getReportBySessionId(
  sessionId: string
): Promise<Report | null> {
  const reportId = reportsBySession.get(sessionId);
  if (!reportId) return null;
  return reports.get(reportId) ?? null;
}

export async function getReportById(reportId: string): Promise<Report | null> {
  return reports.get(reportId) ?? null;
}

export async function saveReport(input: {
  sessionId: string;
  userId?: string | null;
  sport: SportId;
  feedback: CoachingFeedback;
  landmarkData: LandmarkTimeline;
  clips: ReportClip[];
  poseQuality?: Report["pose_quality"];
  confirmedEvents?: Report["confirmed_events"];
  landmarkSummary?: Report["landmark_summary"];
  followUpComparison?: FollowUpComparison | null;
  markComplete?: boolean;
}): Promise<Report> {
  const report: Report = {
    id: randomUUID(),
    session_id: input.sessionId,
    user_id: input.userId ?? null,
    created_at: now(),
    sport: input.sport,
    positives: input.feedback.positives,
    main_weakness: input.feedback.main_weakness,
    pattern_insight: input.feedback.pattern_insight,
    drill: input.feedback.drill,
    coach_summary: input.feedback.coach_summary,
    raw_landmark_data: input.landmarkData,
    clips: input.clips,
    pose_quality: input.poseQuality ?? null,
    confirmed_events: input.confirmedEvents ?? [],
    landmark_summary: input.landmarkSummary ?? null,
    follow_up_comparison: input.followUpComparison ?? null,
  };
  reports.set(report.id, report);
  reportsBySession.set(input.sessionId, report.id);

  const session = sessions.get(input.sessionId);
  if (session && !session.summary?.trim()) {
    session.summary = input.feedback.coach_summary?.trim().slice(0, 160) ?? null;
  }

  if (input.clips.length > 0) {
    clips.set(
      report.id,
      input.clips.map((clip) => ({
        id: randomUUID(),
        session_id: input.sessionId,
        report_id: report.id,
        timestamp: clip.timestamp,
        clip_url: clip.clip_url,
        clip_type: clip.clip_type,
        description: clip.description,
      }))
    );
  }

  if (input.markComplete !== false) {
    await updateSessionStatus(input.sessionId, "complete", {
      step: "complete",
      message: "Your report is ready.",
    });
  }

  return report;
}

export async function updateReportExportUrl(
  sessionId: string,
  exportVideoUrl: string
): Promise<void> {
  const reportId = reportsBySession.get(sessionId);
  if (!reportId) return;
  const report = reports.get(reportId);
  if (!report) return;
  report.export_video_url = exportVideoUrl;
  report.landmark_summary = {
    ...(report.landmark_summary ?? {}),
    export_video_url: exportVideoUrl,
    export_cache_version: exportCacheVersion(),
    export_has_skeleton: true,
  };
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  return [...sessions.values()]
    .filter((s) => s.user_id === userId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function getMonthlySessionCount(userId: string): Promise<number> {
  const monthStart = new Date(startOfCurrentMonthUtc()).getTime();
  return [...sessions.values()].filter(
    (s) =>
      s.user_id === userId &&
      new Date(s.created_at).getTime() >= monthStart
  ).length;
}

export async function upsertWeakness(
  userId: string,
  weaknessType: string,
  sessionNumber: number,
  count: number
): Promise<void> {
  const key = `${userId}:${weaknessType}`;
  const existing = [...weaknesses.values()].find(
    (w) => w.user_id === userId && w.weakness_type === weaknessType && w.status === "active"
  );

  if (existing) {
    existing.current_session = sessionNumber;
    existing.current_count = count;
    weaknesses.set(existing.id, existing);
  } else {
    const record: WeaknessRecord = {
      id: randomUUID(),
      user_id: userId,
      created_at: now(),
      weakness_type: weaknessType,
      first_detected_session: sessionNumber,
      current_session: sessionNumber,
      initial_count: count,
      current_count: count,
      trend: "stable",
      percentage_change: 0,
      status: "active",
      fixed_at_session: null,
    };
    weaknesses.set(record.id, record);
  }
  void key;
}

export async function getWeaknessHistory(
  userId: string,
  weaknessType: string
): Promise<WeaknessRecord | null> {
  return (
    [...weaknesses.values()].find(
      (w) => w.user_id === userId && w.weakness_type === weaknessType
    ) ?? null
  );
}

export async function getClipsByReportId(
  reportId: string
): Promise<ClipRecord[]> {
  return clips.get(reportId) ?? [];
}

export async function addBonusScans(
  userId: string,
  count: number
): Promise<void> {
  const user = users.get(userId);
  if (!user) return;
  user.bonus_scans = (user.bonus_scans ?? 0) + count;
}

export async function decrementBonusScans(userId: string): Promise<void> {
  const user = users.get(userId);
  if (!user || (user.bonus_scans ?? 0) <= 0) return;
  user.bonus_scans -= 1;
}

export async function setUserPro(
  stripeCustomerId: string,
  subscriptionStatus: string,
  userId?: string | null
): Promise<void> {
  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  if (userId) {
    const user = users.get(userId);
    if (user) {
      user.is_pro = isActive;
      user.subscription_status = subscriptionStatus as User["subscription_status"];
      user.stripe_customer_id = stripeCustomerId;
      return;
    }
  }

  for (const user of users.values()) {
    if (user.stripe_customer_id === stripeCustomerId) {
      user.is_pro = isActive;
      user.subscription_status = subscriptionStatus as User["subscription_status"];
      return;
    }
  }
}

export async function linkStripeCustomer(
  userId: string,
  stripeCustomerId: string,
  email?: string | null
): Promise<void> {
  const user = users.get(userId);
  if (!user) return;
  user.stripe_customer_id = stripeCustomerId;
  if (email?.trim() && !user.email) {
    user.email = email.trim().toLowerCase();
  }
}

export interface ScheduledEmailUserRow {
  user_id: string;
  email: string;
  is_pro: boolean;
  session_count: number;
  sessions_this_week: number;
  days_since_last_session: number;
  latest_session_id: string | null;
  primary_weakness: string | null;
  weakness_trend: string | null;
}

export async function listUsersForScheduledEmails(): Promise<
  ScheduledEmailUserRow[]
> {
  const weekStart = (() => {
    const d = new Date();
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - diff);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const now = Date.now();
  const rows: ScheduledEmailUserRow[] = [];

  for (const user of users.values()) {
    if (!user.email?.trim()) continue;

    const userSessions = [...sessions.values()]
      .filter((s) => s.user_id === user.id && s.status === "complete")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    if (userSessions.length === 0) continue;

    const latest = userSessions[0];
    const daysSince = Math.floor(
      (now - new Date(latest.created_at).getTime()) / 86_400_000
    );

    const sessionsThisWeek = userSessions.filter(
      (s) => new Date(s.created_at).getTime() >= weekStart
    ).length;

    const weakness = [...weaknesses.values()].find(
      (w) => w.user_id === user.id && w.status === "active"
    );

    rows.push({
      user_id: user.id,
      email: user.email,
      is_pro: user.is_pro,
      session_count: userSessions.length,
      sessions_this_week: sessionsThisWeek,
      days_since_last_session: daysSince,
      latest_session_id: latest.id,
      primary_weakness: weakness?.weakness_type ?? null,
      weakness_trend: weakness?.trend ?? null,
    });
  }

  return rows;
}

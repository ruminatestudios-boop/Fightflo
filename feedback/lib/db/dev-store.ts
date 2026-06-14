import { randomUUID } from "crypto";
import { startOfCurrentMonthUtc } from "@/config/limits";
import type {
  ClipRecord,
  CoachingFeedback,
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
  cloudinary_public_id?: string | null;
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
  };
  users.set(user.id, user);
  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  return users.get(userId) ?? null;
}

export async function incrementFreeAnalyses(userId: string): Promise<void> {
  const user = users.get(userId);
  if (user) user.free_analyses_used += 1;
}

export async function createSession(input: {
  userId?: string | null;
  sport: SportId;
  level: SkillLevel;
  videoUrl: string;
  videoDuration?: number;
  cloudinaryPublicId?: string;
}): Promise<DevSession> {
  let sessionNumber = 1;
  if (input.userId) {
    sessionNumber =
      [...sessions.values()].filter((s) => s.user_id === input.userId).length +
      1;
  }

  const session: DevSession = {
    id: randomUUID(),
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
  };
  reports.set(report.id, report);
  reportsBySession.set(input.sessionId, report.id);

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

  await updateSessionStatus(input.sessionId, "complete", {
    step: "complete",
    message: "Your report is ready.",
  });

  return report;
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

export async function setUserPro(): Promise<void> {
  /* noop in dev */
}

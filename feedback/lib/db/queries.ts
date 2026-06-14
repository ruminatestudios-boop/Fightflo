import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { startOfCurrentMonthUtc } from "@/config/limits";
import { isSupabaseConfigured } from "@/lib/config/env";
import * as devStore from "@/lib/db/dev-store";
import type {
  ClipRecord,
  CoachingFeedback,
  ConfirmedPoseEvent,
  LandmarkTimeline,
  PoseQualityReport,
  Report,
  ReportClip,
  Session,
  SessionStatus,
  SkillLevel,
  SportId,
  User,
  WeaknessRecord,
} from "@/types";

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createAnonymousUser(
  sport: SportId,
  level: SkillLevel
): Promise<User> {
  if (!isSupabaseConfigured()) return devStore.createAnonymousUser(sport, level);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .insert({ sport, level })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  if (!isSupabaseConfigured()) return devStore.getUserById(userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as User | null;
}

export async function incrementFreeAnalyses(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return devStore.incrementFreeAnalyses(userId);

  const user = await getUserById(userId);
  if (!user) return;

  const supabase = getSupabase();
  await supabase
    .from("users")
    .update({ free_analyses_used: user.free_analyses_used + 1 })
    .eq("id", userId);
}

export async function getMonthlySessionCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return devStore.getMonthlySessionCount(userId);
  }

  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfCurrentMonthUtc());

  if (error) throw error;
  return count ?? 0;
}

export async function createSession(input: {
  userId?: string | null;
  sport: SportId;
  level: SkillLevel;
  videoUrl: string;
  videoDuration?: number;
  cloudinaryPublicId?: string;
}): Promise<Session> {
  if (!isSupabaseConfigured()) return devStore.createSession(input);

  const supabase = getSupabase();

  let sessionNumber = 1;
  if (input.userId) {
    const { count } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", input.userId);
    sessionNumber = (count ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: input.userId ?? null,
      sport: input.sport,
      level: input.level,
      video_url: input.videoUrl,
      video_duration: input.videoDuration ?? 0,
      status: "uploading",
      session_number: sessionNumber,
      cloudinary_public_id: input.cloudinaryPublicId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  if (!isSupabaseConfigured()) return devStore.getSessionById(sessionId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as Session | null;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  progress?: { step: string; message: string }
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return devStore.updateSessionStatus(sessionId, status, progress);
  }

  const supabase = getSupabase();
  await supabase
    .from("sessions")
    .update({
      status,
      ...(progress
        ? { progress_step: progress.step, progress_message: progress.message }
        : {}),
    })
    .eq("id", sessionId);
}

export async function updateSessionSport(
  sessionId: string,
  sport: SportId
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return devStore.updateSessionSport(sessionId, sport);
  }

  const supabase = getSupabase();
  await supabase.from("sessions").update({ sport }).eq("id", sessionId);
}

export async function getReportBySessionId(
  sessionId: string
): Promise<Report | null> {
  if (!isSupabaseConfigured()) return devStore.getReportBySessionId(sessionId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select()
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as Report | null;
}

export async function getReportById(reportId: string): Promise<Report | null> {
  if (!isSupabaseConfigured()) return devStore.getReportById(reportId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select()
    .eq("id", reportId)
    .maybeSingle();

  if (error) throw error;
  return data as Report | null;
}

export async function saveReport(input: {
  sessionId: string;
  userId?: string | null;
  sport: SportId;
  feedback: CoachingFeedback;
  landmarkData: LandmarkTimeline;
  clips: ReportClip[];
  poseQuality?: PoseQualityReport | null;
  confirmedEvents?: ConfirmedPoseEvent[];
  landmarkSummary?: Record<string, unknown> | null;
}): Promise<Report> {
  if (!isSupabaseConfigured()) return devStore.saveReport(input);

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      session_id: input.sessionId,
      user_id: input.userId ?? null,
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
    })
    .select()
    .single();

  if (error) throw error;

  const report = data as Report;

  if (input.clips.length > 0) {
    await supabase.from("clips").insert(
      input.clips.map((clip) => ({
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
  if (!isSupabaseConfigured()) return devStore.getUserSessions(userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function upsertWeakness(
  userId: string,
  weaknessType: string,
  sessionNumber: number,
  count: number
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return devStore.upsertWeakness(userId, weaknessType, sessionNumber, count);
  }

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("weaknesses")
    .select()
    .eq("user_id", userId)
    .eq("weakness_type", weaknessType)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const record = existing as WeaknessRecord;
    const pctChange =
      record.initial_count > 0
        ? ((count - record.initial_count) / record.initial_count) * 100
        : 0;
    const trend =
      count < record.current_count
        ? "improving"
        : count > record.current_count
          ? "worse"
          : "stable";

    await supabase
      .from("weaknesses")
      .update({
        current_session: sessionNumber,
        current_count: count,
        percentage_change: pctChange,
        trend,
        status: count === 0 ? "fixed" : "active",
        fixed_at_session: count === 0 ? sessionNumber : null,
      })
      .eq("id", record.id);
  } else {
    await supabase.from("weaknesses").insert({
      user_id: userId,
      weakness_type: weaknessType,
      first_detected_session: sessionNumber,
      current_session: sessionNumber,
      initial_count: count,
      current_count: count,
      trend: "stable",
      percentage_change: 0,
      status: "active",
    });
  }
}

export async function getWeaknessHistory(
  userId: string,
  weaknessType: string
): Promise<WeaknessRecord | null> {
  if (!isSupabaseConfigured()) {
    return devStore.getWeaknessHistory(userId, weaknessType);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("weaknesses")
    .select()
    .eq("user_id", userId)
    .eq("weakness_type", weaknessType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as WeaknessRecord | null;
}

export async function getClipsByReportId(
  reportId: string
): Promise<ClipRecord[]> {
  if (!isSupabaseConfigured()) return devStore.getClipsByReportId(reportId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clips")
    .select()
    .eq("report_id", reportId);

  if (error) throw error;
  return (data ?? []) as ClipRecord[];
}

export async function setUserPro(
  stripeCustomerId: string,
  subscriptionStatus: string
): Promise<void> {
  if (!isSupabaseConfigured()) return devStore.setUserPro();

  const supabase = getSupabase();
  await supabase
    .from("users")
    .update({
      is_pro:
        subscriptionStatus === "active" || subscriptionStatus === "trialing",
      subscription_status: subscriptionStatus,
      stripe_customer_id: stripeCustomerId,
    })
    .eq("stripe_customer_id", stripeCustomerId);
}

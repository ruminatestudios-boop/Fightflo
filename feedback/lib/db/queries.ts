import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { startOfCurrentMonthUtc, startOfTodayUtc } from "@/config/limits";
import * as devStore from "@/lib/db/dev-store";
import {
  activateDevFallback,
  ensureDevDatabaseReady,
  isConnectionError,
  isDevStoreActive,
  withDevFallback,
} from "@/lib/db/devFallback";
import {
  toSessionLibraryEntry,
  type SessionLibraryEntry,
} from "@/lib/sessions/library";
import { exportCacheVersion } from "@/lib/video/exportManifest";
import { cleanupSessionAssets } from "@/lib/storage/session-cleanup";
import {
  formatSupabaseError,
  isMissingColumnError,
} from "@/lib/db/supabaseErrors";
import {
  deleteSessionMetadata,
  mergeSessionMetadata,
  readSessionMetadata,
  writeSessionMetadata,
} from "@/lib/storage/session-metadata";
import type {
  ClipRecord,
  CoachingFeedback,
  ConfirmedPoseEvent,
  FollowUpComparison,
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
  if (isDevStoreActive()) return devStore.createAnonymousUser(sport, level);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .insert({ sport, level })
    .select()
    .single();

  if (error) {
    if (isConnectionError(error)) {
      activateDevFallback(error);
      return devStore.createAnonymousUser(sport, level);
    }
    throw error;
  }
  return data as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  if (isDevStoreActive()) return devStore.getUserById(userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isConnectionError(error)) {
      activateDevFallback(error);
      return devStore.getUserById(userId);
    }
    throw error;
  }
  if (!data) return null;
  return normalizeUser(data as User);
}

function normalizeUser(user: User): User {
  return {
    ...user,
    bonus_scans: user.bonus_scans ?? 0,
  };
}

export async function addBonusScans(
  userId: string,
  count: number
): Promise<void> {
  if (isDevStoreActive()) {
    return devStore.addBonusScans(userId, count);
  }

  const user = await getUserById(userId);
  if (!user) return;

  const supabase = getSupabase();
  await supabase
    .from("users")
    .update({ bonus_scans: user.bonus_scans + count })
    .eq("id", userId);
}

export async function decrementBonusScans(userId: string): Promise<void> {
  if (isDevStoreActive()) {
    return devStore.decrementBonusScans(userId);
  }

  const user = await getUserById(userId);
  if (!user || user.bonus_scans <= 0) return;

  const supabase = getSupabase();
  await supabase
    .from("users")
    .update({ bonus_scans: user.bonus_scans - 1 })
    .eq("id", userId);
}

export async function getApiCredits(userId: string): Promise<number> {
  const user = await getUserById(userId);
  return user?.api_credits ?? 0;
}

export async function addApiCredits(userId: string, count: number): Promise<void> {
  const supabase = getSupabase();
  const user = await getUserById(userId);
  if (!user) return;
  await supabase
    .from("users")
    .update({ api_credits: (user.api_credits ?? 0) + count })
    .eq("id", userId);
}

export async function deductApiCredit(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const user = await getUserById(userId);
  if (!user || (user.api_credits ?? 0) <= 0) return false;
  await supabase
    .from("users")
    .update({ api_credits: user.api_credits - 1 })
    .eq("id", userId);
  return true;
}

export async function updateUserEmail(
  userId: string,
  email: string
): Promise<User | null> {
  if (isDevStoreActive()) {
    return devStore.updateUserEmail(userId, email);
  }

  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("users")
    .update({ email: normalized })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return withDevFallback(error, () => devStore.updateUserEmail(userId, email));
  }
  return data as User;
}

export async function incrementFreeAnalyses(userId: string): Promise<void> {
  if (isDevStoreActive()) return devStore.incrementFreeAnalyses(userId);

  const user = await getUserById(userId);
  if (!user) return;

  const supabase = getSupabase();
  await supabase
    .from("users")
    .update({ free_analyses_used: user.free_analyses_used + 1 })
    .eq("id", userId);
}

export async function getDailySessionCount(userId: string): Promise<number> {
  if (isDevStoreActive()) return 0;

  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfTodayUtc());

  if (error) return 0;
  return count ?? 0;
}

export async function getMonthlySessionCount(userId: string): Promise<number> {
  if (isDevStoreActive()) {
    return devStore.getMonthlySessionCount(userId);
  }

  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfCurrentMonthUtc());

  if (error) {
    return withDevFallback(error, () => devStore.getMonthlySessionCount(userId));
  }
  return count ?? 0;
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
}): Promise<Session> {
  if (isDevStoreActive()) return devStore.createSession(input);

  const supabase = getSupabase();

  let sessionNumber = 1;
  if (input.userId) {
    const { count } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", input.userId);
    sessionNumber = (count ?? 0) + 1;
  }

  const minimalPayload = {
    ...(input.id ? { id: input.id } : {}),
    user_id: input.userId ?? null,
    sport: input.sport,
    level: input.level,
    video_url: input.videoUrl,
    video_duration: input.videoDuration ?? 0,
    status: "uploading",
    session_number: sessionNumber,
  };

  const withCloudinaryPayload = {
    ...minimalPayload,
    cloudinary_public_id: input.cloudinaryPublicId ?? null,
  };

  const withParentPayload = input.parentSessionId
    ? { ...withCloudinaryPayload, parent_session_id: input.parentSessionId }
    : withCloudinaryPayload;

  let { data, error } = await supabase
    .from("sessions")
    .insert(withParentPayload)
    .select()
    .single();

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from("sessions")
      .insert(withCloudinaryPayload)
      .select()
      .single());
  }

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from("sessions")
      .insert(minimalPayload)
      .select()
      .single());
  }

  if (error) {
    return withDevFallback(error, () => devStore.createSession(input));
  }
  return data as Session;
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  if (isDevStoreActive()) return devStore.getSessionById(sessionId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return withDevFallback(error, () => devStore.getSessionById(sessionId));
  }
  if (data) return data as Session;

  if (process.env.NODE_ENV === "development") {
    devStore.hydrateDevStore();
    const local = await devStore.getSessionById(sessionId);
    if (local) return local;
  }
  return null;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  progress?: { step: string; message: string }
): Promise<void> {
  if (isDevStoreActive()) {
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
  if (isDevStoreActive()) {
    return devStore.updateSessionSport(sessionId, sport);
  }

  const supabase = getSupabase();
  await supabase.from("sessions").update({ sport }).eq("id", sessionId);
}

export async function getReportBySessionId(
  sessionId: string
): Promise<Report | null> {
  if (isDevStoreActive()) return devStore.getReportBySessionId(sessionId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select()
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return withDevFallback(error, () => devStore.getReportBySessionId(sessionId));
  }
  const report = (data?.[0] ?? null) as Report | null;
  if (report) return report;

  if (process.env.NODE_ENV === "development") {
    devStore.hydrateDevStore();
    const local = await devStore.getReportBySessionId(sessionId);
    if (local) return local;
  }
  return null;
}

export async function getReportsBySessionIds(
  sessionIds: string[]
): Promise<Map<string, Report>> {
  if (!sessionIds.length) return new Map();

  if (isDevStoreActive()) {
    const entries = await Promise.all(
      sessionIds.map(async (id) => [id, await devStore.getReportBySessionId(id)] as const)
    );
    return new Map(entries.filter(([, r]) => r !== null) as [string, Report][]);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select()
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  if (error) {
    return new Map();
  }

  // Keep only the most recent report per session
  const map = new Map<string, Report>();
  for (const row of (data ?? []) as Report[]) {
    if (!map.has(row.session_id)) map.set(row.session_id, row);
  }
  return map;
}

export async function updateReportExportUrl(
  sessionId: string,
  exportVideoUrl: string
): Promise<void> {
  if (isDevStoreActive()) {
    return devStore.updateReportExportUrl(sessionId, exportVideoUrl);
  }

  const report = await getReportBySessionId(sessionId);
  if (!report) return;

  const supabase = getSupabase();
  const exportMeta = {
    export_video_url: exportVideoUrl,
    export_cache_version: exportCacheVersion(),
    export_has_skeleton: true,
  };

  const { error: directError } = await supabase
    .from("reports")
    .update({ export_video_url: exportVideoUrl })
    .eq("session_id", sessionId);

  if (!directError) {
    const landmark_summary = {
      ...(report.landmark_summary ?? {}),
      ...exportMeta,
    };
    await supabase
      .from("reports")
      .update({ landmark_summary })
      .eq("session_id", sessionId);
    return;
  }

  const landmark_summary = {
    ...(report.landmark_summary ?? {}),
    ...exportMeta,
  };

  const { error: summaryError } = await supabase
    .from("reports")
    .update({ landmark_summary })
    .eq("session_id", sessionId);

  if (summaryError) {
    console.warn(
      "[updateReportExportUrl] Supabase update skipped:",
      summaryError.message
    );
  }
}

export async function getReportById(reportId: string): Promise<Report | null> {
  if (isDevStoreActive()) return devStore.getReportById(reportId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select()
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    return withDevFallback(error, () => devStore.getReportById(reportId));
  }
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
  followUpComparison?: FollowUpComparison | null;
  markComplete?: boolean;
}): Promise<Report> {
  if (isDevStoreActive()) return devStore.saveReport(input);

  const supabase = getSupabase();

  const basePayload = {
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
  };

  const extendedPayload = {
    ...basePayload,
    pose_quality: input.poseQuality ?? null,
    confirmed_events: input.confirmedEvents ?? [],
    landmark_summary: input.landmarkSummary ?? null,
    follow_up_comparison: input.followUpComparison ?? null,
    secondary_weaknesses: input.feedback.secondary_weaknesses ?? [],
  };

  let { data, error } = await supabase
    .from("reports")
    .insert(extendedPayload)
    .select()
    .single();

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from("reports")
      .insert(basePayload)
      .select()
      .single());
  }

  if (error) {
    return withDevFallback(error, () => devStore.saveReport(input));
  }

  const report = data as Report;

  if (input.clips.length > 0) {
    const clipRows = input.clips
      .filter((clip) => clip.clip_url)
      .map((clip) => ({
        session_id: input.sessionId,
        report_id: report.id,
        timestamp: clip.timestamp,
        clip_url: clip.clip_url,
        clip_type: clip.clip_type,
        description: clip.description,
      }));

    if (clipRows.length > 0) {
      await supabase.from("clips").insert(clipRows);
    }
  }

  if (input.markComplete !== false) {
    await updateSessionStatus(input.sessionId, "complete", {
      step: "complete",
      message: "Your report is ready.",
    });
  }

  const session = await getSessionById(input.sessionId);
  if (session && !session.summary?.trim() && input.feedback.coach_summary?.trim()) {
    await updateSessionMetadata(input.sessionId, {
      summary: input.feedback.coach_summary.trim().slice(0, 160),
    });
  }

  void import("@/lib/email/notifications")
    .then(({ notifyReportReady }) =>
      notifyReportReady({
        sessionId: input.sessionId,
        userId: input.userId,
        sport: input.sport,
        feedback: input.feedback,
      })
    )
    .catch(console.error);

  return report;
}

export async function updateReportClips(
  sessionId: string,
  reportId: string,
  clips: import("@/types").ReportClip[]
): Promise<void> {
  const supabase = getSupabase();
  const validClips = clips.filter((c) => c.clip_url);

  if (validClips.length > 0) {
    const clipRows = validClips.map((clip) => ({
      session_id: sessionId,
      report_id: reportId,
      timestamp: clip.timestamp,
      clip_url: clip.clip_url,
      clip_type: clip.clip_type,
      description: clip.description,
    }));
    await supabase.from("clips").insert(clipRows);
  }

  await supabase
    .from("reports")
    .update({ clips: validClips })
    .eq("id", reportId);
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  if (isDevStoreActive()) return devStore.getUserSessions(userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return withDevFallback(error, () => devStore.getUserSessions(userId));
  }
  return (data ?? []) as Session[];
}

export async function updateSessionMetadata(
  sessionId: string,
  patch: {
    display_name?: string | null;
    summary?: string | null;
    thumbnail_url?: string | null;
  }
): Promise<Session | null> {
  await writeSessionMetadata(sessionId, patch);

  if (isDevStoreActive()) {
    return devStore.updateSessionMetadata(sessionId, patch);
  }

  const supabase = getSupabase();
  const payload: Record<string, string | null> = {};
  if (patch.display_name !== undefined) payload.display_name = patch.display_name;
  if (patch.summary !== undefined) payload.summary = patch.summary;
  if (patch.thumbnail_url !== undefined) payload.thumbnail_url = patch.thumbnail_url;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from("sessions")
      .update(payload)
      .eq("id", sessionId);

    if (error) {
      console.warn("[sessions] Supabase metadata update skipped:", error.message);
    }
  }

  const session = await getSessionById(sessionId);
  if (!session) return null;

  const meta = await readSessionMetadata(sessionId);
  return mergeSessionMetadata(session, meta);
}

export async function getUserSessionLibrary(
  userId: string
): Promise<SessionLibraryEntry[]> {
  const sessions = await getUserSessions(userId);
  if (!sessions.length) return [];

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? null;
  const sessionIds = sessions.map((s) => s.id);

  // Fetch all reports in one query instead of N individual queries
  const [reportsMap, metaResults] = await Promise.all([
    getReportsBySessionIds(sessionIds),
    Promise.all(sessions.map((s) => readSessionMetadata(s.id))),
  ]);

  return sessions.map((session, i) => {
    const merged = mergeSessionMetadata(session, metaResults[i]);
    const report = reportsMap.get(session.id) ?? null;
    return toSessionLibraryEntry(merged, report, cloudName);
  });
}

export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.user_id !== userId) throw new Error("Forbidden");

  await cleanupSessionAssets(session);
  await deleteSessionMetadata(sessionId);

  if (isDevStoreActive()) {
    const deleted = await devStore.deleteSession(sessionId, userId);
    if (!deleted) throw new Error("Session not found");
    return;
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    return withDevFallback(error, () =>
      devStore.deleteSession(sessionId, userId).then((deleted) => {
        if (!deleted) throw new Error("Session not found");
      })
    );
  }
}

export async function upsertWeakness(
  userId: string,
  weaknessType: string,
  sessionNumber: number,
  count: number
): Promise<void> {
  if (isDevStoreActive()) {
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
  if (isDevStoreActive()) {
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

  if (error) {
    return withDevFallback(error, () =>
      devStore.getWeaknessHistory(userId, weaknessType)
    );
  }
  return data as WeaknessRecord | null;
}

export async function getClipsByReportId(
  reportId: string
): Promise<ClipRecord[]> {
  if (isDevStoreActive()) return devStore.getClipsByReportId(reportId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clips")
    .select()
    .eq("report_id", reportId);

  if (error) {
    return withDevFallback(error, () => devStore.getClipsByReportId(reportId));
  }
  return (data ?? []) as ClipRecord[];
}

export async function setUserPro(
  stripeCustomerId: string,
  subscriptionStatus: string,
  userId?: string | null
): Promise<void> {
  if (isDevStoreActive()) {
    return devStore.setUserPro(stripeCustomerId, subscriptionStatus, userId);
  }

  const supabase = getSupabase();
  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const payload = {
    is_pro: isActive,
    subscription_status: subscriptionStatus,
    stripe_customer_id: stripeCustomerId,
  };

  if (userId) {
    await supabase.from("users").update(payload).eq("id", userId);
    return;
  }

  await supabase
    .from("users")
    .update(payload)
    .eq("stripe_customer_id", stripeCustomerId);
}

export async function linkStripeCustomer(
  userId: string,
  stripeCustomerId: string,
  email?: string | null
): Promise<void> {
  if (isDevStoreActive()) {
    return devStore.linkStripeCustomer(userId, stripeCustomerId, email);
  }

  const supabase = getSupabase();
  const patch: Record<string, string> = {
    stripe_customer_id: stripeCustomerId,
  };

  if (email?.trim()) {
    const user = await getUserById(userId);
    if (user && !user.email?.trim()) {
      patch.email = email.trim().toLowerCase();
    }
  }

  await supabase.from("users").update(patch).eq("id", userId);
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

function startOfWeekUtc(date = new Date()): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.getTime();
}

export async function listUsersForScheduledEmails(): Promise<
  ScheduledEmailUserRow[]
> {
  if (isDevStoreActive()) {
    return devStore.listUsersForScheduledEmails();
  }

  const supabase = getSupabase();
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .not("email", "is", null)
    .neq("email", "");

  if (error) {
    return withDevFallback(error, () => devStore.listUsersForScheduledEmails());
  }

  const now = Date.now();
  const weekStart = startOfWeekUtc();
  const rows: ScheduledEmailUserRow[] = [];

  for (const user of (users ?? []) as User[]) {
    const { data: userSessions } = await supabase
      .from("sessions")
      .select("id, created_at, status")
      .eq("user_id", user.id)
      .eq("status", "complete")
      .order("created_at", { ascending: false });

    const sessions = userSessions ?? [];
    if (sessions.length === 0) continue;

    const latest = sessions[0];
    const daysSince = Math.floor(
      (now - new Date(latest.created_at).getTime()) / 86_400_000
    );

    const sessionsThisWeek = sessions.filter(
      (s) => new Date(s.created_at).getTime() >= weekStart
    ).length;

    const { data: weakness } = await supabase
      .from("weaknesses")
      .select("weakness_type, trend")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    rows.push({
      user_id: user.id,
      email: user.email,
      is_pro: user.is_pro,
      session_count: sessions.length,
      sessions_this_week: sessionsThisWeek,
      days_since_last_session: daysSince,
      latest_session_id: latest.id,
      primary_weakness: weakness?.weakness_type ?? null,
      weakness_trend: weakness?.trend ?? null,
    });
  }

  return rows;
}

export interface InviteCodeRecord {
  code: string;
  label: string | null;
  total_limit: number;
  used_count: number;
  active: boolean;
  created_at: string;
}

/** Selective beta invite link with its own capped scan budget */
export async function getInviteCodeByCode(
  code: string
): Promise<InviteCodeRecord | null> {
  if (isDevStoreActive()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("invite_codes")
    .select()
    .eq("code", code)
    .maybeSingle();

  if (error) return null;
  return (data as InviteCodeRecord) ?? null;
}

export async function incrementInviteCodeUsage(code: string): Promise<void> {
  if (isDevStoreActive()) return;

  const existing = await getInviteCodeByCode(code);
  if (!existing) return;

  const supabase = getSupabase();
  await supabase
    .from("invite_codes")
    .update({ used_count: existing.used_count + 1 })
    .eq("code", code);
}

export async function createInviteCode(input: {
  code: string;
  label?: string | null;
  totalLimit: number;
}): Promise<InviteCodeRecord> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("invite_codes")
    .insert({
      code: input.code,
      label: input.label ?? null,
      total_limit: input.totalLimit,
      used_count: 0,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as InviteCodeRecord;
}

export async function listInviteCodes(): Promise<InviteCodeRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("invite_codes")
    .select()
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as InviteCodeRecord[]) ?? [];
}

export async function updateInviteCode(
  code: string,
  updates: { totalLimit?: number; active?: boolean }
): Promise<InviteCodeRecord> {
  const supabase = getSupabase();
  const payload: Record<string, number | boolean> = {};
  if (updates.totalLimit !== undefined) payload.total_limit = updates.totalLimit;
  if (updates.active !== undefined) payload.active = updates.active;

  const { data, error } = await supabase
    .from("invite_codes")
    .update(payload)
    .eq("code", code)
    .select()
    .single();

  if (error) throw error;
  return data as InviteCodeRecord;
}

export async function deleteInviteCode(code: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("invite_codes").delete().eq("code", code);
  if (error) throw error;
}

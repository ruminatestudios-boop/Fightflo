export type SportId =
  | "boxing"
  | "muaythai"
  | "mma"
  | "golf"
  | "tennis"
  | "cricket"
  | "football"
  | "weightlifting";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro";

export type SessionStatus = "uploading" | "processing" | "complete" | "failed";

export type WeaknessTrend = "improving" | "stable" | "worse";

export type WeaknessStatus = "active" | "fixed";

export type ClipType = "weakness" | "positive";

export type SubscriptionStatus =
  | "none"
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

export interface User {
  id: string;
  email: string;
  created_at: string;
  sport: SportId;
  level: SkillLevel;
  is_pro: boolean;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  free_analyses_used: number;
  free_analyses_limit: number;
  bonus_scans: number;
}

export interface AnalysisAllowance {
  canAnalyse: boolean;
  isPro: boolean;
  used: number;
  limit: number;
  bonusScans: number;
  message: string;
}

export interface Session {
  id: string;
  user_id: string | null;
  created_at: string;
  sport: SportId;
  level: SkillLevel;
  video_url: string;
  video_duration: number;
  status: SessionStatus;
  session_number: number;
  display_name?: string | null;
  summary?: string | null;
  thumbnail_url?: string | null;
  cloudinary_public_id?: string | null;
  /** Prior session this clip is verifying a fix for */
  parent_session_id?: string | null;
}

export type ComparisonStatus = "improved" | "worse" | "unchanged";

export interface ComparisonItem {
  label: string;
  status: ComparisonStatus;
  detail: string;
  priorValue?: string | number;
  currentValue?: string | number;
}

export type FollowUpVerdict = "fixed" | "partial" | "not_fixed" | "mixed";

export interface FollowUpComparison {
  parentSessionId: string;
  parentTitle: string;
  parentWeaknessTitle: string;
  headline: string;
  improved: ComparisonItem[];
  regressed: ComparisonItem[];
  unchanged: ComparisonItem[];
  verdict: FollowUpVerdict;
  summary: string;
}

export interface PositiveFinding {
  timestamp: string;
  title: string;
  technical_detail: string;
  why_it_matters: string;
}

export interface MainWeakness {
  timestamp: string;
  title: string;
  what_is_happening: string;
  root_cause: string;
  fight_consequence: string;
  frequency: string;
  mechanical_fix: string;
  elite_reference: string;
}

export interface DrillRecommendation {
  name: string;
  description: string;
  success_marker: string;
}

export interface ReportClip {
  timestamp: string;
  clip_url: string;
  clip_type: ClipType;
  description: string;
}

export interface PoseQualityReport {
  score: number;
  frames_total: number;
  frames_with_pose: number;
  avg_visibility: number;
  usable: boolean;
  message: string;
}

export interface ConfirmedPoseEvent {
  weakness_type: string;
  timestamp: string;
  timeSeconds: number;
  jointHighlight: keyof FrameLandmarks;
  label: string;
  confidence: number;
  /** Pose-verified coaching detail — not generic template text */
  detail?: string;
  mechanical_fix?: string;
  evidence?: string;
  pillar?: string;
}

export interface Report {
  id: string;
  session_id: string;
  user_id: string | null;
  created_at: string;
  sport: SportId;
  positives: PositiveFinding[];
  main_weakness: MainWeakness;
  secondary_weaknesses?: MainWeakness[];
  pattern_insight: string;
  drill: DrillRecommendation;
  coach_summary: string;
  raw_landmark_data: LandmarkTimeline | null;
  clips: ReportClip[];
  pose_quality?: PoseQualityReport | null;
  confirmed_events?: ConfirmedPoseEvent[];
  landmark_summary?: Record<string, unknown> | null;
  export_video_url?: string | null;
  follow_up_comparison?: FollowUpComparison | null;
}

export interface WeaknessRecord {
  id: string;
  user_id: string;
  created_at: string;
  weakness_type: string;
  first_detected_session: number;
  current_session: number;
  initial_count: number;
  current_count: number;
  trend: WeaknessTrend;
  percentage_change: number;
  status: WeaknessStatus;
  fixed_at_session: number | null;
}

export interface ClipRecord {
  id: string;
  session_id: string;
  report_id: string;
  timestamp: string;
  clip_url: string;
  clip_type: ClipType;
  description: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FrameLandmarks {
  nose?: LandmarkPoint;
  left_eye_inner?: LandmarkPoint;
  left_eye?: LandmarkPoint;
  left_eye_outer?: LandmarkPoint;
  right_eye_inner?: LandmarkPoint;
  right_eye?: LandmarkPoint;
  right_eye_outer?: LandmarkPoint;
  left_ear?: LandmarkPoint;
  right_ear?: LandmarkPoint;
  mouth_left?: LandmarkPoint;
  mouth_right?: LandmarkPoint;
  left_shoulder?: LandmarkPoint;
  right_shoulder?: LandmarkPoint;
  left_elbow?: LandmarkPoint;
  right_elbow?: LandmarkPoint;
  left_wrist?: LandmarkPoint;
  right_wrist?: LandmarkPoint;
  left_pinky?: LandmarkPoint;
  right_pinky?: LandmarkPoint;
  left_index?: LandmarkPoint;
  right_index?: LandmarkPoint;
  left_thumb?: LandmarkPoint;
  right_thumb?: LandmarkPoint;
  left_hip?: LandmarkPoint;
  right_hip?: LandmarkPoint;
  left_knee?: LandmarkPoint;
  right_knee?: LandmarkPoint;
  left_ankle?: LandmarkPoint;
  right_ankle?: LandmarkPoint;
  left_heel?: LandmarkPoint;
  right_heel?: LandmarkPoint;
  left_foot_index?: LandmarkPoint;
  right_foot_index?: LandmarkPoint;
}

export interface TimelineFrame {
  frame: number;
  timestamp: string;
  landmarks: FrameLandmarks;
}

export type LandmarkTimeline = TimelineFrame[];

export interface PatternEvent {
  weakness_type: string;
  start_frame: number;
  end_frame: number;
  start_timestamp: string;
  end_timestamp: string;
  confidence: number;
}

export interface PatternAnalysisResult {
  primary_weakness: string;
  frequency: number;
  pattern_data: Record<string, unknown>;
  fatigue_detected: boolean;
  events: PatternEvent[];
  session_landmarks: LandmarkTimeline;
}

export interface AnalysisProgress {
  step:
    | "uploading"
    | "extracting_frames"
    | "analysing_movement"
    | "finding_patterns"
    | "writing_report"
    | "generating_clips"
    | "complete"
    | "failed";
  message: string;
  percent: number;
}

export interface CoachingFeedback {
  positives: PositiveFinding[];
  main_weakness: MainWeakness;
  secondary_weaknesses?: MainWeakness[];
  pattern_insight: string;
  drill: DrillRecommendation;
  coach_summary: string;
}

export interface UploadResult {
  sessionId: string;
  videoUrl: string;
  publicId: string;
}

export interface ProgressDataPoint {
  session: number;
  count: number;
  date: string;
  /** All confirmed events in that clip (for context in tooltips) */
  totalFaults?: number;
}

export interface SportAccent {
  primary: string;
  muted: string;
}

export const SPORT_ACCENTS: Record<SportId, SportAccent> = {
  boxing: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
  muaythai: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
  mma: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
  golf: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
  tennis: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
  cricket: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
  football: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
  weightlifting: { primary: "#fa4141", muted: "rgba(250, 65, 65, 0.15)" },
};

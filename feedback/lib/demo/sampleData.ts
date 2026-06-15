import { getSportConfig } from "@/config/sports";
import type {
  ConfirmedPoseEvent,
  CoachingFeedback,
  LandmarkTimeline,
  PoseQualityReport,
  ReportClip,
  SkillLevel,
  SportId,
} from "@/types";
import bakedLandmarks from "@/lib/demo/landmarkData.json";

/**
 * Baked from real analysis: Boxing · Session 21njj
 * Source session: f97ad611-4a58-4a81-9703-877755b14d8a
 * Re-export: node scripts/export-demo-session.mjs <sessionId>
 */

export const DEMO_SOURCE_SESSION_ID = "f97ad611-4a58-4a81-9703-877755b14d8a";

export const DEMO_VIDEO_URL =
  "https://res.cloudinary.com/dpf6rw5sm/video/upload/v1781421979/feedback/sessions/f97ad611-4a58-4a81-9703-877755b14d8a/session_f97ad611-4a58-4a81-9703-877755b14d8a.mp4";

export const DEMO_CLOUDINARY_PUBLIC_ID =
  "feedback/sessions/f97ad611-4a58-4a81-9703-877755b14d8a/session_f97ad611-4a58-4a81-9703-877755b14d8a";

export const DEMO_VIDEO_DURATION = 16;

export const DEMO_DISPLAY_NAME = "Boxing · Session 21njj";

export const DEMO_SUMMARY =
  "Tracking was limited. Your chin is tucked and guard is generally good. However, integrate head movement into every combination to avoid being a static target.";

export const DEMO_THUMBNAIL_URL =
  "https://res.cloudinary.com/dpf6rw5sm/video/upload/so_1,w_160,h_160,c_fill,q_auto,f_jpg/feedback/sessions/f97ad611-4a58-4a81-9703-877755b14d8a/session_f97ad611-4a58-4a81-9703-877755b14d8a.jpg";

const DEMO_FEEDBACK: CoachingFeedback = {
  positives: [
    {
      title: "Consistent Chin Protection",
      timestamp: "0:00",
      why_it_matters:
        "A well-tucked chin significantly reduces the target area and absorbs impact more effectively, preventing knockdowns and minimizing damage from incoming punches.",
      technical_detail:
        "At the session's start and throughout the initial exchanges, the athlete maintains a consistently tucked chin, keeping the jawline protected behind the lead shoulder.",
    },
    {
      title: "Active Lead Hand Guard",
      timestamp: "0:08",
      why_it_matters:
        "A high, active lead hand guard is crucial for blocking incoming counter punches and maintaining defensive integrity, allowing for quick transitions back to offense.",
      technical_detail:
        "The lead hand is consistently observed returning to a protective position near the face after extending the jab, maintaining a high guard posture.",
    },
    {
      title: "Solid Defensive Stance",
      timestamp: "0:16",
      why_it_matters:
        "A solid defensive stance provides a strong foundation for both offense and defense, enabling efficient weight transfer for power and quick evasion from attacks.",
      technical_detail:
        "The athlete demonstrates a stable and balanced fighting stance, with the body angled effectively to present a smaller target, and the hands generally held in a ready position.",
    },
  ],
  main_weakness: {
    title: "Static Head Position",
    frequency:
      "Visible in 195 of 195 frames where the athlete is actively punching or in a stance.",
    timestamp: "0:00",
    root_cause:
      "A primary focus on offensive output without integrating fundamental defensive mechanics into the punching rhythm. This indicates a lack of habituation for evasive actions during combinations.",
    mechanical_fix:
      "Practice 'Slip and Rip' drills. After every 2-3 punches on the bag, execute a subtle head slip to the left or right, or a roll under, before continuing the combination. Focus on making it fluid, not a separate action.",
    elite_reference: "Tyson Fury head movement",
    fight_consequence:
      "In live sparring or competition, a static head is an easy target, making the athlete vulnerable to clean shots and combinations, significantly increasing the risk of taking damage.",
    what_is_happening:
      "The athlete maintains a fixed head position throughout the punching sequences on the heavy bag, showing no lateral or vertical head movement.",
  },
  pattern_insight:
    "The static head position is a symptom of a broader issue where offensive actions are not fully integrated with defensive movement and body mechanics. Without rotational engagement from the hips and core, the upper body becomes stiff, limiting both power generation and the natural flow of head movement.",
  drill: {
    name: "Head Movement Flow Drill",
    description:
      "Perform 3-5 punch combinations on the heavy bag. After each combination, immediately execute a head slip (left or right) or a roll, then reset or continue with another combination. Focus on making the head movement a natural extension of your punching rhythm, not an interruption. Start slow, then build speed.",
    success_marker:
      "The head moves off the centerline smoothly and automatically after each combination, without breaking rhythm or losing balance.",
  },
  coach_summary:
    "Tracking was limited. Your chin is tucked and guard is generally good. However, integrate head movement into every combination to avoid being a static target. Focus on defensive flow.",
};

const DEMO_CLIPS: ReportClip[] = [
  {
    clip_url:
      "https://res.cloudinary.com/dpf6rw5sm/video/upload/v1781422149/feedback/clips/f97ad611-4a58-4a81-9703-877755b14d8a/f97ad611-4a58-4a81-9703-877755b14d8a_weakness.mp4",
    clip_type: "weakness",
    timestamp: "0:00",
    description: "Static Head Position",
  },
  {
    clip_url:
      "https://res.cloudinary.com/dpf6rw5sm/video/upload/v1781422177/feedback/clips/f97ad611-4a58-4a81-9703-877755b14d8a/f97ad611-4a58-4a81-9703-877755b14d8a_positive_0.mp4",
    clip_type: "positive",
    timestamp: "0:00",
    description: "Consistent Chin Protection",
  },
  {
    clip_url:
      "https://res.cloudinary.com/dpf6rw5sm/video/upload/v1781422222/feedback/clips/f97ad611-4a58-4a81-9703-877755b14d8a/f97ad611-4a58-4a81-9703-877755b14d8a_positive_1.mp4",
    clip_type: "positive",
    timestamp: "0:08",
    description: "Active Lead Hand Guard",
  },
  {
    clip_url:
      "https://res.cloudinary.com/dpf6rw5sm/video/upload/v1781422238/feedback/clips/f97ad611-4a58-4a81-9703-877755b14d8a/f97ad611-4a58-4a81-9703-877755b14d8a_positive_2.mp4",
    clip_type: "positive",
    timestamp: "0:16",
    description: "Solid Defensive Stance",
  },
];

export function getDemoFeedback(
  _sport: SportId,
  _level: SkillLevel
): CoachingFeedback {
  return DEMO_FEEDBACK;
}

export function getDemoClips(_feedback: CoachingFeedback): ReportClip[] {
  return DEMO_CLIPS;
}

export function getDemoPoseQuality(): PoseQualityReport {
  const baked = bakedLandmarks.pose_quality as PoseQualityReport | undefined;
  if (baked && baked.frames_with_pose > 0) return baked;
  return {
    score: 38,
    frames_total: 195,
    frames_with_pose: 0,
    avg_visibility: 0,
    usable: false,
    message:
      "Tracking was limited in this session — coaching is based on video frames and movement patterns.",
  };
}

export function getDemoConfirmedEvents(): ConfirmedPoseEvent[] {
  return (bakedLandmarks.confirmed_events as ConfirmedPoseEvent[]) ?? [];
}

export function getDemoLandmarkSummary(): Record<string, unknown> {
  const summary = bakedLandmarks.landmark_summary as Record<string, unknown> | undefined;
  return {
    source_session_id: DEMO_SOURCE_SESSION_ID,
    ...(summary ?? {}),
  };
}

export function getDemoLandmarkTimeline(): LandmarkTimeline {
  return (bakedLandmarks.timeline as LandmarkTimeline) ?? [];
}

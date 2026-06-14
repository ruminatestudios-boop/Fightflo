import type {
  CoachingFeedback,
  ConfirmedPoseEvent,
  PoseQualityReport,
  ReportClip,
  SkillLevel,
  SportId,
} from "@/types";

/** Public sample clip for demo playback */
export const DEMO_VIDEO_URL =
  "https://res.cloudinary.com/demo/video/upload/delivery.mp4";

export function getDemoFeedback(
  sport: SportId,
  level: SkillLevel
): CoachingFeedback {
  const sportLabel = sport === "muaythai" ? "Muay Thai" : "Boxing";

  return {
    positives: [
      {
        timestamp: "0:08",
        title: "Solid stance width",
        technical_detail:
          "Feet stay shoulder-width apart through combinations — good base for power.",
        why_it_matters:
          "A stable base lets you throw without losing balance when you miss.",
      },
      {
        timestamp: "1:14",
        title: "Sharp jab recovery",
        technical_detail:
          "Lead hand returns to guard within two frames after extension.",
        why_it_matters:
          "Fast recovery keeps your guard intact between exchanges.",
      },
      {
        timestamp: "2:03",
        title: "Good head movement on exits",
        technical_detail:
          "Small slip to the outside after throwing — chin stays tucked.",
        why_it_matters:
          "Moving off-line after punching is what keeps you from getting countered.",
      },
    ],
    main_weakness: {
      timestamp: "0:42",
      title: "Guard drops after cross",
      what_is_happening:
        "Your rear hand drifts down and away from your chin immediately after throwing the cross.",
      root_cause:
        "You're over-rotating the rear shoulder and not re-chambering the hand on the return path.",
      fight_consequence:
        "A sharp counter hook lands clean while your guard is open — this is a common KO setup.",
      frequency: "Found in 6 of 9 cross combinations",
      mechanical_fix:
        "Finish the cross with the rear hand touching your jaw, then snap the lead hand back to cover before you move.",
      elite_reference:
        "Canelo keeps both hands home before he pivots out — copy that re-chamber.",
    },
    pattern_insight:
      "This isn't a focus issue — it's a mechanical habit. Fix the return path on the cross and the guard drops disappear across all your combos.",
    drill: {
      name: "Mirror guard-return drill",
      description: `3×3 min rounds: throw jab-cross only. Partner or mirror checks that your rear hand touches your jaw before your feet move. ${sportLabel} guard discipline.`,
      success_marker:
        "Guard stays up for 3 consecutive combos without being reminded.",
    },
    coach_summary: `${level} level — your ${sportLabel} fundamentals are there, but the dropped guard after the cross is the one thing that would get you hurt in sparring. Fix that first.`,
  };
}

export function getDemoClips(
  feedback: CoachingFeedback
): ReportClip[] {
  return [
    {
      timestamp: feedback.main_weakness.timestamp,
      clip_url: DEMO_VIDEO_URL,
      clip_type: "weakness",
      description: feedback.main_weakness.title,
    },
    ...feedback.positives.map((p) => ({
      timestamp: p.timestamp,
      clip_url: DEMO_VIDEO_URL,
      clip_type: "positive" as const,
      description: p.title,
    })),
  ];
}

export function getDemoPoseQuality(): PoseQualityReport {
  return {
    score: 78,
    frames_total: 144,
    frames_with_pose: 132,
    avg_visibility: 0.81,
    usable: true,
    message: "Good visibility — skeleton tracking is reliable for this session.",
  };
}

export function getDemoConfirmedEvents(): ConfirmedPoseEvent[] {
  return [
    {
      weakness_type: "guard_drop_after_cross",
      timestamp: "0:42",
      timeSeconds: 42,
      jointHighlight: "right_wrist",
      label: "Guard down",
      confidence: 0.88,
    },
    {
      weakness_type: "guard_drop_after_cross",
      timestamp: "1:38",
      timeSeconds: 98,
      jointHighlight: "right_wrist",
      label: "Guard down",
      confidence: 0.82,
    },
  ];
}

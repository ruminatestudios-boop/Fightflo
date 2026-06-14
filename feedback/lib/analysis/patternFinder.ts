import { getSportConfig } from "@/config/sports";
import type {
  LandmarkTimeline,
  PatternAnalysisResult,
  PatternEvent,
  SportId,
} from "@/types";

export async function findPatterns(
  timeline: LandmarkTimeline,
  sport: SportId
): Promise<PatternAnalysisResult> {
  const sportConfig = getSportConfig(sport);
  const events: PatternEvent[] = [];
  const weaknessCounts: Record<string, number> = {};

  for (const weakness of sportConfig.common_weaknesses) {
    const detected = detectWeakness(timeline, weakness, sport);
    if (detected.length > 0) {
      weaknessCounts[weakness] = detected.length;
      events.push(...detected);
    }
  }

  const primaryWeakness =
    Object.entries(weaknessCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    sportConfig.common_weaknesses[0];

  const frequency = weaknessCounts[primaryWeakness] ?? 0;
  const fatigueDetected = detectFatigue(timeline, events);

  return {
    primary_weakness: primaryWeakness,
    frequency,
    pattern_data: { weaknessCounts, eventCount: events.length },
    fatigue_detected: fatigueDetected,
    events,
    session_landmarks: timeline,
  };
}

function detectWeakness(
  timeline: LandmarkTimeline,
  weaknessType: string,
  sport: SportId
): PatternEvent[] {
  switch (weaknessType) {
    case "guard_drop_after_cross":
    case "dropping_guard_on_kick":
      return detectGuardDrop(timeline, weaknessType);
    case "elbow_flare_on_cross":
      return detectElbowFlare(timeline);
    case "chin_up":
    case "chin_up_in_clinch":
      return detectChinUp(timeline);
    case "no_head_movement":
      return detectStaticHead(timeline);
    case "over_the_top_swing":
      return detectOverTheTop(timeline);
    case "no_unit_turn":
      return detectNoUnitTurn(timeline);
    default:
      return detectGenericWeakness(timeline, weaknessType, sport);
  }
}

function detectGuardDrop(
  timeline: LandmarkTimeline,
  weaknessType: string
): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streak = 0;
  let startFrame = 0;

  for (const frame of timeline) {
    const lw = frame.landmarks.left_wrist;
    const rw = frame.landmarks.right_wrist;
    const ls = frame.landmarks.left_shoulder;
    const rs = frame.landmarks.right_shoulder;

    if (!lw || !rw || !ls || !rs) continue;

    const guardDropped = lw.y > ls.y || rw.y > rs.y;

    if (guardDropped) {
      if (streak === 0) startFrame = frame.frame;
      streak++;
    } else if (streak >= 5) {
      events.push({
        weakness_type: weaknessType,
        start_frame: startFrame,
        end_frame: frame.frame,
        start_timestamp: timeline[startFrame]?.timestamp ?? "0:00",
        end_timestamp: frame.timestamp,
        confidence: Math.min(1, streak / 10),
      });
      streak = 0;
    } else {
      streak = 0;
    }
  }

  return events;
}

function detectElbowFlare(timeline: LandmarkTimeline): PatternEvent[] {
  const events: PatternEvent[] = [];

  for (const frame of timeline) {
    const le = frame.landmarks.left_elbow;
    const re = frame.landmarks.right_elbow;
    const ls = frame.landmarks.left_shoulder;
    const rs = frame.landmarks.right_shoulder;
    const rw = frame.landmarks.right_wrist;

    if (!le || !re || !ls || !rs || !rw) continue;

    const elbowFlared = Math.abs(re.x - rs.x) > 0.15 && rw.x > re.x;
    if (elbowFlared) {
      events.push({
        weakness_type: "elbow_flare_on_cross",
        start_frame: frame.frame,
        end_frame: frame.frame + 3,
        start_timestamp: frame.timestamp,
        end_timestamp: frame.timestamp,
        confidence: 0.75,
      });
    }
  }

  return events;
}

function detectChinUp(timeline: LandmarkTimeline): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streak = 0;
  let startFrame = 0;

  for (const frame of timeline) {
    const nose = frame.landmarks.nose;
    const ls = frame.landmarks.left_shoulder;
    const rs = frame.landmarks.right_shoulder;

    if (!nose || !ls || !rs) continue;
    const shoulderY = (ls.y + rs.y) / 2;
    const chinUp = nose.y < shoulderY - 0.08;

    if (chinUp) {
      if (streak === 0) startFrame = frame.frame;
      streak++;
    } else if (streak >= 8) {
      events.push({
        weakness_type: "chin_up",
        start_frame: startFrame,
        end_frame: frame.frame,
        start_timestamp: timeline[startFrame]?.timestamp ?? "0:00",
        end_timestamp: frame.timestamp,
        confidence: 0.7,
      });
      streak = 0;
    } else {
      streak = 0;
    }
  }

  return events;
}

function detectStaticHead(timeline: LandmarkTimeline): PatternEvent[] {
  if (timeline.length < 20) return [];

  const nosePositions = timeline
    .map((f) => f.landmarks.nose)
    .filter(Boolean) as { x: number; y: number }[];

  if (nosePositions.length < 20) return [];

  const xs = nosePositions.map((p) => p.x);
  const range = Math.max(...xs) - Math.min(...xs);

  if (range < 0.03) {
    return [
      {
        weakness_type: "no_head_movement",
        start_frame: 0,
        end_frame: timeline.length - 1,
        start_timestamp: timeline[0].timestamp,
        end_timestamp: timeline[timeline.length - 1].timestamp,
        confidence: 0.8,
      },
    ];
  }

  return [];
}

function detectOverTheTop(timeline: LandmarkTimeline): PatternEvent[] {
  const events: PatternEvent[] = [];

  for (let i = 5; i < timeline.length; i++) {
    const frame = timeline[i];
    const lw = frame.landmarks.left_wrist;
    const le = frame.landmarks.left_elbow;
    const ls = frame.landmarks.left_shoulder;

    if (!lw || !le || !ls) continue;

    const overTheTop = lw.y < ls.y && le.x > ls.x + 0.1;
    if (overTheTop) {
      events.push({
        weakness_type: "over_the_top_swing",
        start_frame: frame.frame,
        end_frame: frame.frame + 5,
        start_timestamp: frame.timestamp,
        end_timestamp: frame.timestamp,
        confidence: 0.65,
      });
    }
  }

  return events;
}

function detectNoUnitTurn(timeline: LandmarkTimeline): PatternEvent[] {
  const events: PatternEvent[] = [];

  for (const frame of timeline) {
    const ls = frame.landmarks.left_shoulder;
    const rs = frame.landmarks.right_shoulder;
    const lh = frame.landmarks.left_hip;
    const rh = frame.landmarks.right_hip;

    if (!ls || !rs || !lh || !rh) continue;

    const shoulderWidth = Math.abs(rs.x - ls.x);
    const hipWidth = Math.abs(rh.x - lh.x);
    const noTurn = Math.abs(shoulderWidth - hipWidth) < 0.02;

    if (noTurn) {
      events.push({
        weakness_type: "no_unit_turn",
        start_frame: frame.frame,
        end_frame: frame.frame + 3,
        start_timestamp: frame.timestamp,
        end_timestamp: frame.timestamp,
        confidence: 0.6,
      });
    }
  }

  return events;
}

function detectGenericWeakness(
  timeline: LandmarkTimeline,
  weaknessType: string,
  _sport: SportId
): PatternEvent[] {
  if (timeline.length < 10) return [];

  const mid = Math.floor(timeline.length / 2);
  return [
    {
      weakness_type: weaknessType,
      start_frame: mid,
      end_frame: mid + 5,
      start_timestamp: timeline[mid].timestamp,
      end_timestamp: timeline[Math.min(mid + 5, timeline.length - 1)].timestamp,
      confidence: 0.5,
    },
  ];
}

function detectFatigue(
  timeline: LandmarkTimeline,
  events: PatternEvent[]
): boolean {
  if (timeline.length < 30 || events.length < 4) return false;

  const midpoint = Math.floor(timeline.length / 2);
  const firstHalf = events.filter((e) => e.start_frame < midpoint).length;
  const secondHalf = events.filter((e) => e.start_frame >= midpoint).length;

  return secondHalf > firstHalf * 1.5;
}

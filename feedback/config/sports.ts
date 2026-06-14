import type { SportId } from "@/types";

export interface MechanicsRange {
  min?: number;
  max?: number;
}

export interface SportMechanicsStandard {
  [key: string]: string | MechanicsRange | Record<string, unknown>;
}

export interface SportConfig {
  name: string;
  emoji: string;
  available: boolean;
  landmarks_to_track: number[];
  mechanics_standards: Record<string, SportMechanicsStandard>;
  common_weaknesses: string[];
  coach_voice: string;
  elite_references: string[];
}

export const SPORTS: Record<SportId, SportConfig> = {
  boxing: {
    name: "Boxing",
    emoji: "🥊",
    available: true,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24],
    mechanics_standards: {
      jab: {
        elbow_extension: { min: 165, max: 180 },
        shoulder_elevation: "required",
        return_frames: { max: 10 },
      },
      cross: {
        hip_rotation: { min: 45 },
        weight_shift: { min: 55, max: 65 },
        elbow_position: "tucked",
      },
      guard: {
        wrist_height: "above_shoulder",
        elbow_position: "protecting_ribs",
      },
    },
    common_weaknesses: [
      "elbow_flare_on_cross",
      "guard_drop_after_cross",
      "no_head_movement",
      "overcommitting_weight",
      "slow_guard_return",
      "chin_up",
      "square_stance",
    ],
    coach_voice: "corner_coach",
    elite_references: [
      "Canelo cross mechanics",
      "Lomachenko footwork",
      "Tyson Fury head movement",
      "Floyd Mayweather guard",
    ],
  },

  muaythai: {
    name: "Muay Thai",
    emoji: "🇹🇭",
    available: true,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      teep: {
        chamber_height: "hip_level_minimum",
        extension: "full",
        guard: "maintained_throughout",
      },
      roundhouse: {
        pivot: "required",
        hip_rotation: { min: 90 },
        shin_not_foot: "required",
      },
      knee: {
        chamber: "hip_height",
        clinch_guard: "maintained",
      },
    },
    common_weaknesses: [
      "dropping_guard_on_kick",
      "no_pivot_on_roundhouse",
      "kicking_with_foot_not_shin",
      "no_chamber_on_knee",
      "square_stance",
      "chin_up_in_clinch",
    ],
    coach_voice: "muay_thai_kru",
    elite_references: [
      "Buakaw roundhouse mechanics",
      "Saenchai teep technique",
      "Rodtang aggressive pressure",
    ],
  },

  mma: {
    name: "MMA",
    emoji: "🥋",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      jab: { elbow_extension: { min: 160, max: 180 } },
      takedown_entry: { level_change: "required", head_position: "outside" },
      guard: { wrist_height: "above_shoulder" },
    },
    common_weaknesses: [
      "dropping_hands_on_kick",
      "telegraphed_takedown",
      "square_stance",
      "chin_up",
    ],
    coach_voice: "mma_coach",
    elite_references: ["Khabib chain wrestling", "Adesanya distance management"],
  },

  golf: {
    name: "Golf",
    emoji: "⛳",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26],
    mechanics_standards: {
      backswing: {
        shoulder_rotation: { min: 90 },
        hip_rotation: { min: 45 },
        left_arm: "straight",
      },
      downswing: {
        hip_leads_shoulder: "required",
        weight_transfer: "right_to_left",
      },
      follow_through: {
        full_rotation: "required",
        balance: "maintained",
      },
    },
    common_weaknesses: [
      "over_the_top_swing",
      "early_extension",
      "reverse_pivot",
      "casting",
      "chicken_wing_followthrough",
      "sway_not_rotate",
    ],
    coach_voice: "golf_pro",
    elite_references: [
      "Rory McIlroy hip rotation",
      "Tiger Woods impact position",
      "Ben Hogan swing plane",
    ],
  },

  tennis: {
    name: "Tennis",
    emoji: "🎾",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      serve: {
        trophy_position: "required",
        ball_toss: "consistent_height",
        leg_drive: "required",
      },
      forehand: {
        unit_turn: "required",
        wrist_lag: "maintained",
        follow_through: "over_shoulder",
      },
    },
    common_weaknesses: [
      "no_unit_turn",
      "arm_only_swing",
      "late_preparation",
      "no_leg_drive_on_serve",
      "inconsistent_toss",
    ],
    coach_voice: "tennis_coach",
    elite_references: [
      "Federer forehand mechanics",
      "Serena Williams serve",
      "Nadal topspin mechanics",
    ],
  },

  cricket: {
    name: "Cricket",
    emoji: "🏏",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      bowling_action: { front_arm_brace: "required", hip_drive: "required" },
      batting_stance: { head_still: "required", weight_transfer: "front_foot" },
    },
    common_weaknesses: [
      "no_front_arm_brace",
      "chucking_action",
      "head_fall_away_batting",
      "flat_foot_drive",
    ],
    coach_voice: "cricket_coach",
    elite_references: ["McGrath seam position", "Kohli cover drive"],
  },

  football: {
    name: "Football",
    emoji: "⚽",
    available: false,
    landmarks_to_track: [0, 11, 12, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      shooting: { plant_foot: "beside_ball", hip_rotation: { min: 40 } },
      sprint: { knee_drive: "high", arm_opposition: "required" },
    },
    common_weaknesses: [
      "leaning_back_on_shot",
      "no_hip_rotation",
      "flat_foot_strike",
    ],
    coach_voice: "football_coach",
    elite_references: ["Ronaldo knuckleball", "Haaland finishing mechanics"],
  },

  weightlifting: {
    name: "Weightlifting",
    emoji: "🏋️",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      squat: {
        depth: "hip_below_knee",
        knee_tracking: "over_toes",
        torso_angle: "maintained",
      },
      deadlift: {
        hip_hinge: "required",
        bar_path: "vertical",
        neutral_spine: "required",
      },
    },
    common_weaknesses: [
      "butt_wink",
      "knee_cave",
      "rounded_back_deadlift",
      "bar_drift_forward",
    ],
    coach_voice: "strength_coach",
    elite_references: ["Lu Xiaojun squat depth", "Pyrros Dimas pull technique"],
  },
};

/** Sports shown in the upload picker and used for auto-detection. */
export const SELECTABLE_SPORTS: SportId[] = ["boxing", "muaythai"];

export const AVAILABLE_SPORTS = SELECTABLE_SPORTS;

export function getSportConfig(sport: SportId): SportConfig {
  return SPORTS[sport];
}

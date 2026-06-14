import { getSportConfig } from "@/config/sports";
import type { PatternAnalysisResult, SportId } from "@/types";

export interface RootCauseDiagnosis {
  weakness_type: string;
  what_is_happening: string;
  root_cause: string;
  fight_consequence: string;
  mechanical_fix: string;
  elite_reference: string;
  confidence: number;
}

const ROOT_CAUSE_TEMPLATES: Record<
  string,
  Omit<RootCauseDiagnosis, "weakness_type" | "confidence">
> = {
  elbow_flare_on_cross: {
    what_is_happening:
      "Right elbow drifts away from the body during the cross, opening the rib cage.",
    root_cause:
      "Premature shoulder rotation before hip drive completes. Scapula not pinned.",
    fight_consequence:
      "Exposes liver and chin on the same side. Counter hook becomes available.",
    mechanical_fix:
      "Cue: elbow stays on the hip line until extension. Rotate hip first, then shoulder.",
    elite_reference: "Canelo keeps elbow tucked through full cross extension.",
  },
  guard_drop_after_cross: {
    what_is_happening:
      "Guard drops below shoulder line for 5+ frames immediately after throwing the cross.",
    root_cause:
      "No recoil pattern programmed. Weight stays forward, hands don't return on the same path.",
    fight_consequence:
      "Counter hook or overhand lands clean during the recovery window.",
    mechanical_fix:
      "Shadowbox with return-to-cheek cue after every cross. Count frames until guard returns.",
    elite_reference: "Mayweather's guard return is faster than the punch itself.",
  },
  chin_up: {
    what_is_happening: "Chin rises above shoulder line during exchanges.",
    root_cause: "Eyes tracking opponent's hands instead of maintaining spine angle.",
    fight_consequence: "Uppercut and hook to the chin land with full leverage.",
    mechanical_fix: "Tuck chin to lead shoulder during combos. Eyes look through eyebrows.",
    elite_reference: "Fury maintains chin tuck even when leaning back.",
  },
  dropping_guard_on_kick: {
    what_is_happening:
      "Hands drop below chin level during the kick, opening the centre line.",
    root_cause:
      "Weight shifts to kicking leg before guard is set. Opposite hand not anchored to cheek.",
    fight_consequence:
      "Straight counter or teep lands clean while you are on one leg.",
    mechanical_fix:
      "Keep lead hand glued to cheek through chamber and extension. Drill slow teeps with guard check.",
    elite_reference: "Buakaw maintains high guard even on full-power roundhouses.",
  },
  no_pivot_on_roundhouse: {
    what_is_happening:
      "Supporting foot stays planted flat during roundhouse — no hip turn.",
    root_cause:
      "Hip rotation initiated from the shoulders, not the planted foot pivot.",
    fight_consequence:
      "Kick lacks power and you stay square — check hook available.",
    mechanical_fix:
      "Pivot on ball of planted foot until heel points at target before extending shin.",
    elite_reference: "Saenchai's pivot is visible before the shin ever leaves the chamber.",
  },
  kicking_with_foot_not_shin: {
    what_is_happening:
      "Ankle flexes and foot strikes target instead of shin bone.",
    root_cause:
      "Toes point up at impact — dorsiflexion not locked through contact.",
    fight_consequence:
      "Broken foot risk and weak transfer of force into the target.",
    mechanical_fix:
      "Point toes down, strike with shin. Drill on heavy bag focusing on contact point only.",
    elite_reference: "Rodtang's roundhouses connect with the lower shin every time.",
  },
  no_head_movement: {
    what_is_happening: "Head stays in fixed position throughout the round.",
    root_cause: "Feet planted, no slip-roll pattern integrated into defence.",
    fight_consequence: "Becomes a stationary target after first combination.",
    mechanical_fix: "Add micro-slips after every jab. Head moves on a different line than feet.",
    elite_reference: "Lomachenko's head is never where his feet suggest it will be.",
  },
  over_the_top_swing: {
    what_is_happening: "Club comes over the top instead of from the inside.",
    root_cause: "Upper body initiates downswing before hips clear.",
    fight_consequence: "Slice, weak contact, and inconsistent ball flight.",
    mechanical_fix: "Feel hip bump first. Hands drop inside the plane on the way down.",
    elite_reference: "Tiger Woods' hip clearance creates the inside path automatically.",
  },
  no_unit_turn: {
    what_is_happening: "Upper body swings without shoulder-hip separation.",
    root_cause: "Arms start the stroke. No coiled unit turn on preparation.",
    fight_consequence: "Arm-only power, late contact, no topspin generation.",
    mechanical_fix: "Turn shoulders together on prep. Hip stays loaded until last moment.",
    elite_reference: "Federer's unit turn is visible before the ball arrives.",
  },
};

export function diagnoseRootCause(
  patternData: PatternAnalysisResult,
  sport: SportId
): RootCauseDiagnosis {
  const sportConfig = getSportConfig(sport);
  const weaknessType = patternData.primary_weakness;
  const template = ROOT_CAUSE_TEMPLATES[weaknessType];

  if (template) {
    return {
      weakness_type: weaknessType,
      ...template,
      confidence: patternData.frequency > 5 ? 0.85 : 0.65,
    };
  }

  return {
    weakness_type: weaknessType,
    what_is_happening: `Detected ${weaknessType.replace(/_/g, " ")} in ${patternData.frequency} instances.`,
    root_cause: "Biomechanical sequencing issue identified in landmark data.",
    fight_consequence: "Reduces technical efficiency under pressure.",
    mechanical_fix: `Address ${weaknessType.replace(/_/g, " ")} with sport-specific drill work.`,
    elite_reference: sportConfig.elite_references[0] ?? "Study elite technique film.",
    confidence: 0.5,
  };
}

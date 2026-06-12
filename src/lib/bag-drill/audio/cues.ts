/** Pre-generated ElevenLabs coach cues — files live in /public/audio/ */

export interface AudioCue {
  file: string;
  text: string;
}

export const VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.85,
  style: 0.4,
  use_speaker_boost: true,
} as const;

/** All cues to generate via scripts/generate-audio.mjs */
export const AUDIO_CUES: AudioCue[] = [
  // Combo callouts
  { file: "combo-1-2.mp3", text: "One two" },
  { file: "combo-1-2-3.mp3", text: "One two three" },
  { file: "combo-1-2-3-2.mp3", text: "One two three two" },
  { file: "combo-double-jab.mp3", text: "Double jab" },
  { file: "combo-jab-cross-hook.mp3", text: "Jab cross hook" },
  { file: "combo-power.mp3", text: "Power combo" },
  { file: "combo-flurry.mp3", text: "Flurry — let it go" },
  { file: "combo-body-shot.mp3", text: "Body shot" },
  { file: "combo-1-2-body.mp3", text: "One two to the body" },
  { file: "combo-cross-hook.mp3", text: "Cross hook" },
  { file: "combo-double-jab-cross.mp3", text: "Double jab cross" },
  { file: "combo-body-head.mp3", text: "Body shot, head shot" },
  { file: "combo-jab-slip-cross.mp3", text: "Jab, slip, cross" },
  { file: "combo-lead-hook-cross-hook.mp3", text: "Lead hook, cross, hook" },
  { file: "combo-1-2-3-kick.mp3", text: "Jab, cross, hook, kick" },
  { file: "combo-1-2-3-low-kick.mp3", text: "Jab, cross, hook, low kick" },
  { file: "combo-1-2-rear-kick.mp3", text: "Jab, cross, rear kick" },
  { file: "combo-freestyle.mp3", text: "Freestyle — ten seconds, let it go" },
  { file: "combo-jab-roll-cross-hook.mp3", text: "Jab, roll, cross, hook" },
  { file: "combo-slip-jab-cross.mp3", text: "Slip, jab, cross" },
  { file: "combo-duck-body-cross.mp3", text: "Duck, body shot, cross" },
  { file: "combo-go.mp3", text: "Go" },
  { file: "combo-again.mp3", text: "Again" },

  // Guard warnings (urgent)
  { file: "guard-left.mp3", text: "Left hand up" },
  { file: "guard-right.mp3", text: "Right hand up" },
  { file: "guard-both.mp3", text: "Hands up — you're open" },
  { file: "guard-tight.mp3", text: "Keep that guard tight" },
  { file: "guard-chin.mp3", text: "Chin down, hands up" },

  // Encouragement
  { file: "encourage-1.mp3", text: "Good. Again." },
  { file: "encourage-2.mp3", text: "Sharp. Keep moving." },
  { file: "encourage-3.mp3", text: "That's it. Stay on it." },
  { file: "encourage-4.mp3", text: "Nice combo. Reset." },
  { file: "encourage-5.mp3", text: "Fast hands. Do it again." },
  { file: "encourage-6.mp3", text: "Clean. Pick up the pace." },

  // Corrections
  { file: "correct-shoulder.mp3", text: "Drop your shoulder on that cross" },
  { file: "correct-snap.mp3", text: "Snap it back faster" },
  { file: "correct-telegraph.mp3", text: "You're telegraphing that hook" },
  { file: "correct-step.mp3", text: "Step into it" },
  { file: "correct-breathe.mp3", text: "Breathe. Stay loose." },

  // Session
  { file: "session-start.mp3", text: "Alright. Let's get to work." },
  { file: "session-ready.mp3", text: "Hands up. Eyes forward. Go." },
  { file: "session-end.mp3", text: "Good session. You put in work today." },
  { file: "session-wrap.mp3", text: "That's a wrap. See you tomorrow." },

  // Milestones
  { file: "milestone-10.mp3", text: "Ten combos. Don't stop now." },
  { file: "milestone-half.mp3", text: "Halfway. Keep the intensity." },
  { file: "milestone-20.mp3", text: "That's twenty. You're in the zone." },

  // Utility
  { file: "silent.mp3", text: " " },
];

export const ENCOURAGEMENT_FILES = [
  "encourage-1.mp3",
  "encourage-2.mp3",
  "encourage-3.mp3",
  "encourage-4.mp3",
  "encourage-5.mp3",
  "encourage-6.mp3",
] as const;

export const GUARD_FILES = {
  left: "guard-left.mp3",
  right: "guard-right.mp3",
  both: "guard-both.mp3",
} as const;

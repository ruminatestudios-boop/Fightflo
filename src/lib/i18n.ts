import type { RhythmSegment, SignalType } from "./types";

export type AppLanguage = "en" | "th";

export const LANGUAGES: { id: AppLanguage; label: string; subtitle: string }[] = [
  { id: "en", label: "ENGLISH", subtitle: "Voice cues in English" },
  { id: "th", label: "ไทย", subtitle: "เสียงโค้ชภาษาไทย" },
];

export const SIGNAL_LABELS: Record<AppLanguage, Record<SignalType, string>> = {
  en: {
    attack: "Attack",
    defend: "Defend",
    move: "Move",
    burnout: "Sprint",
    pressure: "Pressure",
    reset: "Reset",
  },
  th: {
    attack: "โจมตี",
    defend: "ป้องกัน",
    move: "ขยับ",
    burnout: "เร่งจังหวะ",
    pressure: "กดดัน",
    reset: "พักฟื้น",
  },
};

const GENERAL_PAUSE_CUES_EN = [
  "Keep moving",
  "Don't stand still",
  "Head movement",
  "Cut angles",
  "Stay loose — hands up",
  "Move your feet",
  "Circle off",
  "Change levels",
  "Feint — keep him guessing",
  "Stay active — you're not resting",
  "Lateral footwork",
  "Snap your jab out there",
];

const GENERAL_PAUSE_CUES_TH = [
  "อย่าหยุดนิ่ง",
  "อย่ายืนนิ่ง",
  "ขยับศีรษะ",
  "เปลี่ยนมุม",
  "คลายตัว — ยกมือ",
  "ขยับเท้า",
  "เดินวนออก",
  "เปลี่ยนระดับ",
  "หลอก — อย่าให้เขาอ่านเกม",
  "อย่าหยุด — ยังไม่ได้พัก",
  "เดินข้าง",
  "ยิงหมัดตรงออกไป",
];

const SEGMENT_PAUSE_CUES_EN: Partial<Record<RhythmSegment, string[]>> = {
  reading: [
    "Keep moving — read him",
    "Cut angles, find your range",
    "Head on a swivel",
    "Feint and probe — stay busy",
    "Circle off — don't be a statue",
    "Stay outside — hands up",
  ],
  probing: [
    "Touch and go — keep your feet moving",
    "Probe with the jab — cut angles",
    "Stay loose — feint and move",
  ],
  reset: [
    "Shake it out — keep moving light",
    "Breathe — reset your feet",
    "Stay loose — don't freeze up",
  ],
  defensive: [
    "Shell up — move your head",
    "Block and roll — circle off",
    "Stay covered — cut an angle out",
  ],
  counter: [
    "Patient — feint and draw him",
    "Head off center — wait for it",
    "Keep moving — he's loading up",
  ],
  pressure: [
    "Stay busy — cut angles in",
    "Head movement — don't get pinned",
    "Keep your feet underneath you",
  ],
  feint: [
    "Sell the feint — stay loose",
    "Head fake — then cut an angle",
  ],
};

const SEGMENT_PAUSE_CUES_TH: Partial<Record<RhythmSegment, string[]>> = {
  reading: [
    "ขยับตัว — อ่านเกม",
    "เปลี่ยนมุม หาระยะ",
    "หมุนศีรษะดูรอบ",
    "หลอกและจิ้ม — อย่าหยุด",
    "เดินวนออก — อย่ายืนนิ่ง",
    "อยู่นอกระยะ — ยกมือ",
  ],
  probing: [
    "แตะแล้วถอย — ขยับเท้า",
    "จิ้มหมัดตรง — เปลี่ยนมุม",
    "คลายตัว — หลอกแล้วขยับ",
  ],
  reset: [
    "ส่ายตัว — ขยับเบาๆ",
    "หายใจ — จัดเท้าใหม่",
    "คลายตัว — อย่าแช่แข็ง",
  ],
  defensive: [
    "กันชิด — ขยับศีรษะ",
    "บล็อกแล้วหมุน — เดินวนออก",
    "กันครบ — เปลี่ยนมุมออก",
  ],
  counter: [
    "อดทน — หลอกให้เขาออกมา",
    "ศีรษะออกนอก — รอจังหวะ",
    "ขยับตัว — เขากำลังเตรียม",
  ],
  pressure: [
    "ทำงานต่อ — เปลี่ยนมุมเข้า",
    "ขยับศีรษะ — อย่าให้โดนกด",
    "เท้าอยู่ใต้ตัวเสมอ",
  ],
  feint: [
    "ขายหลอกให้จริง — คลายตัว",
    "หลอกศีรษะ — แล้วเปลี่ยนมุม",
  ],
};

/** English speak string → Thai callout */
const COMBO_SPEAK_TH: Record<string, string> = {
  "Jab, cross": "หมัดตรง หมัดไขว้",
  "Jab, cross, hook": "หมัดตรง หมัดไขว้ หมัดเหวี่ยง",
  "Jab, cross, hook, cross": "หมัดตรง หมัดไขว้ หมัดเหวี่ยง หมัดไขว้",
  "Cross, hook, cross": "หมัดไขว้ หมัดเหวี่ยง หมัดไขว้",
  "Double jab, cross": "หมัดตรงสอง หมัดไขว้",
  "Hook, cross, hook": "หมัดเหวี่ยง หมัดไขว้ หมัดเหวี่ยง",
  "Jab, cross, body shot": "หมัดตรง หมัดไขว้ ยิงลำตัว",
  "Cross, hook": "หมัดไขว้ หมัดเหวี่ยง",
  "Jab, teep": "หมัดตรง ถีบ",
  "Jab, cross, rear kick": "หมัดตรง หมัดไขว้ เตะหลัง",
  "Teep, hook": "ถีบ หมัดเหวี่ยง",
  "Elbow, knee": "ศอก เข่า",
  "Jab, low kick": "หมัดตรง เตะต่ำ",
  "Switch kick": "สลับเตะ",
  "Clinch, knee": "ยืนใน เข่า",
  "Jab, cross, elbow": "หมัดตรง หมัดไขว้ ศอก",
  "Jab, cross, level change": "หมัดตรง หมัดไขว้ ย่อตัว",
  "Jab, kick, cross": "หมัดตรง เตะ หมัดไขว้",
  "Jab, uppercut": "หมัดตรง หมัดเสย",
  "Body kick, cross": "เตะลำตัว หมัดไขว้",
  "Jab, cross, knee": "หมัดตรง หมัดไขว้ เข่า",
  "Feint, cross": "หลอก หมัดไขว้",
  "Jab, elbow": "หมัดตรง ศอก",
  "Jab, cross, low kick": "หมัดตรง หมัดไขว้ เตะต่ำ",
  "Jab, cross, high kick": "หมัดตรง หมัดไขว้ เตะสูง",
  "Jab, cross, hook, low kick": "หมัดตรง หมัดไขว้ หมัดเหวี่ยง เตะต่ำ",
  "Cross, hook, kick": "หมัดไขว้ หมัดเหวี่ยง เตะ",
  "Jab, kick, jab": "หมัดตรง เตะ หมัดตรง",
  "Switch kick, cross": "สลับเตะ หมัดไขว้",
  "Body shot, head shot": "ยิงลำตัว ยิงหัว",
  "Jab, cross, hook, kick": "หมัดตรง หมัดไขว้ หมัดเหวี่ยง เตะ",
};

export function getSignalLabel(type: SignalType, lang: AppLanguage): string {
  return SIGNAL_LABELS[lang][type];
}

export function getGeneralPauseCues(lang: AppLanguage): string[] {
  return lang === "th" ? GENERAL_PAUSE_CUES_TH : GENERAL_PAUSE_CUES_EN;
}

export function getSegmentPauseCues(
  lang: AppLanguage
): Partial<Record<RhythmSegment, string[]>> {
  return lang === "th" ? SEGMENT_PAUSE_CUES_TH : SEGMENT_PAUSE_CUES_EN;
}

export function localizeComboSpeak(speak: string, lang: AppLanguage): string {
  if (lang === "en") return speak;
  return COMBO_SPEAK_TH[speak] ?? speak;
}

export function speechLangCode(lang: AppLanguage): string {
  return lang === "th" ? "th-TH" : "en-US";
}

import type { BagCameraMode } from "./types";

/** Boxing-first product copy — aligned with on-device detection today. */
export const BAG_COPY = {
  headline: "Pick a drill. Get scored.",
  homeSubline: "Pick one of 4 drills below to start.",
  introSubtitle:
    "Boxing combos in your ear — punches counted, sequences checked, hands flagged.",
  comboDrill: "Hear the combo, throw it — we check your sequence.",
  flurry: "30 seconds — mic counts every hit on the bag.",
  flurryQuick: "30s sprint — total punch count, beat your best.",
  weaknessAfterRounds: "Extra reps on combos you're slowest on.",
  startTrainingLabel: "4 drills",
  startTrainingHint: "Pick one to start your round.",
  drillMoreInfo: "More info",
  howItWorksLabel: "How it works",
  howItWorksSlides: [
    {
      eyebrow: "Step 1",
      title: "Pick a drill",
      detail: "Choose called combos, flurry, weakness fix, or punch speed.",
    },
    {
      eyebrow: "Step 2",
      title: "Train on the bag",
      detail: "Combos play in your ear — camera and mic count hits and check your sequence.",
    },
    {
      eyebrow: "Step 3",
      title: "Get scored",
      detail: "See punch count, combo match, and reaction time — stats build after each round.",
    },
  ],
  quickStart: {
    combo: {
      label: "Fight training",
      title: "Called combos",
      detail: "Coach calls combos in your ear. Throw them — we check your sequence.",
      badge: "Recommended",
      cta: "Start combo drill",
    },
    flurry: {
      label: "Cardio",
      title: "Flurry",
      detail: "30 seconds — hit the bag as many times as you can. Beat your record.",
      cta: "Start flurry",
    },
    weakness: {
      label: "Targeted fix",
      title: "Weakness drill",
      detail: "Extra reps on combos you keep missing or hesitating on.",
      detailEmpty: "Do a few combo rounds first — we'll flag your slowest calls.",
      cta: "Start weakness drill",
    },
    speed: {
      label: "Punch timing",
      title: "Punch speed",
      detail:
        "One punch at a time — throw on go, see your speed instantly. Camera on you checks the punch; bag cam times the hit.",
      cta: "Start speed drill",
    },
  },
  speedCalibration: {
    title: "Tune punch detection",
    subtitle: "Hit the bag once — we time your reaction from go to impact.",
    step: "Throw one punch at the bag",
    done: "Ready — throw when you hear go",
    bagNote: "Bag cam times impact only — we call which punch to throw.",
    fighterNote: "You cam checks punch type and times your reaction.",
  },
  calibrationPermission:
    "Camera and mic needed to count punches and check your combos",
  calibrationGpuTip: "Use Chrome on a modern phone for best results",
  calibrationSteps: {
    camera: "Step back — fit your whole body in frame",
    stance: "Get in your fighting stance",
    guard: "Hands up by your chin",
    mic: "Throw one punch at the bag",
    done: "You're set",
  },
  calibrationBagNote:
    "Bag mode — mic tuning only. Combo check needs camera on you.",
  calibrationCameraGuide: {
    title: "Best camera position",
    placement: [
      "Chest height on a stool or shelf — not on the floor",
      "2–3 metres back, offset to your lead-hand side",
      "Face the bag; turn your body ~45° so the camera sees both shoulders",
    ],
    avoid: "Not straight in your face, not pure side profile",
  },
  calibrationAngleHints: {
    too_profile: "Turn slightly toward the camera — we need both shoulders",
    too_frontal: "Move the phone to your side — not straight in front of you",
  },
  calibrationIntro: {
    title: "Quick calibration",
    subtitle: "4 simple steps — about 30 seconds. Gets punch counts and combo checks more accurate.",
    steps: [
      {
        title: "Camera angle",
        detail: "Phone to your side at 45° — chest height, 2–3m back",
      },
      { title: "Your stance", detail: "Hold your fighting stance" },
      { title: "Guard up", detail: "Hands by your chin" },
      { title: "One test punch", detail: "Hit the bag once" },
    ],
    bagSteps: [
      { title: "Mic test", detail: "Hit the bag once — we tune punch detection" },
    ],
    bagSubtitle: "One quick step — tune mic punch detection for bag mode.",
    cta: "Start calibration",
    skip: "Skip to workout",
    skipWarning: "No calibration — punch counts and combo checks won't be as accurate. Camera and mic will still be requested when the round starts.",
    timeEstimate: "~30 sec",
  },
  upgradeBody:
    "Unlimited rounds, full history, progress charts, and corner feedback. Cancel anytime.",
  timerUpsellTitle: "Want boxing combos called on the bag?",
  timerUpsellBody:
    "FlowBag calls jab-cross-hook in your ear, counts punches, checks your combo, and flags dropped hands.",
  timerBanner:
    "Free boxing bag trainer → FlowBag calls combos and counts your punches",
  timerHomeTeaser: "Want boxing combos called on the bag?",
  timerRestTitle: "Know if you landed that combo",
  timerRestSubtitle: "FlowBag counts punches and checks your boxing sequence",
  timerRound3Title: "Still training without combo checks?",
  timerRound3Subtitle: "FlowBag boxing drills are free to try 👇",
  timerUpsellCtaAfter3:
    "Want combo checks on the bag? FlowBag boxing is free to try →",
  pageTitle: "FlowBag — Boxing Heavy Bag Trainer",
  pageDescription:
    "Boxing heavy bag trainer with called combos, punch counting, combo checks, and guard alerts.",
  hubLabel: "Boxing bag training",
  gettingStartedScored:
    "Three steps before your first scored boxing round on the bag.",
  streakLine: "bag streak — don't break the chain.",
  installTitle: "Install FlowBag on this device",
  installBody:
    "Open from your dock or home screen — faster launch, full-screen training, works offline.",
  installCta: "Install app",
  installDismiss: "Not now",
} as const;

export const COMING_SOON_COPY = {
  muayThaiTitle: "🇹🇭 MUAY THAI MODE",
  muayThaiTagline: "Kicks. Knees. Elbows. Coming soon.",
  kickboxingTitle: "🥊 KICKBOXING MODE",
  kickboxingTagline: "Full striking detection. Coming soon.",
  subtext:
    "We're training the AI on real fighters in Bangkok gyms right now. Be first to know when it drops.",
  selectHint: "Tap what you want notified about",
  selectError: "Pick at least one mode",
  emailPlaceholder: "your@email.com",
  submitLabel: "Notify Me 🔥",
  finePrint: "No spam. Just a message when it's live.",
  successMessage: "You're on the list 👊 We'll hit you when it's live.",
  waitlistSocialLabel: "Fighters already on the waitlist",
  waitlistBaseCount: 247,
  waitlistPrefix: "Join",
  waitlistSuffix: "fighters already waiting",
  lockedBadge: "Coming soon",
} as const;

/** Camera angle — what the app can score from that view. */
export const CAMERA_MODE_COPY: Record<
  BagCameraMode,
  { toggleLabel: string; flipLabel: string; description: string; summary: string; calibrationNote: string }
> = {
  fighter: {
    toggleLabel: "You",
    flipLabel: "You",
    description: "Front camera on you — counts punches and checks your combo.",
    summary: "Camera on you — full scoring.",
    calibrationNote: "Combo check uses this mode — 45° side angle works best.",
  },
  bag: {
    toggleLabel: "Bag",
    flipLabel: "Bag",
    description: "Back camera on the bag — counts hits only, no combo check.",
    summary: "Camera on bag — hit count only.",
    calibrationNote: "Mic-only calibration — no body pose needed.",
  },
};

export const GETTING_STARTED_STEPS = [
  {
    step: "01",
    title: "Set up camera",
    detail: "Point at you for combos. Point at the bag for hit count only.",
  },
  {
    step: "02",
    title: "Listen for the call",
    detail:
      "Boxing combos land in your ear — throw them on the heavy bag when you hear go.",
  },
  {
    step: "03",
    title: "Get scored",
    detail:
      "Punch counts, combo checks, and reaction times — stats build after a few rounds.",
  },
] as const;

export const LOCKED_DISCIPLINES = [
  {
    id: "muaythai" as const,
    title: COMING_SOON_COPY.muayThaiTitle,
    tagline: COMING_SOON_COPY.muayThaiTagline,
  },
  {
    id: "kickboxing" as const,
    title: COMING_SOON_COPY.kickboxingTitle,
    tagline: COMING_SOON_COPY.kickboxingTagline,
  },
] as const;

export type LockedDisciplineId = (typeof LOCKED_DISCIPLINES)[number]["id"];

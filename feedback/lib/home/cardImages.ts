import { withBasePath } from "@/lib/paths";

export interface HomeCardImage {
  src: string;
  /** CSS object-position for variety when reusing the same asset */
  position: string;
}

const CARD_IMAGES = {
  upload: {
    src: withBasePath("/images/feed-upload.png"),
    position: "72% 20%",
  },
  guard: {
    src: withBasePath("/images/feed-guard.png"),
    position: "50% 18%",
  },
  shadow: {
    src: withBasePath("/images/feed-shadow.png"),
    position: "50% 35%",
  },
  weekly: {
    src: withBasePath("/images/feed-shadow.png"),
    position: "55% 42%",
  },
  reupload: {
    src: withBasePath("/images/feed-reupload.png"),
    position: "55% 22%",
  },
  progress: {
    src: withBasePath("/images/feed-progress.png"),
    position: "50% 28%",
  },
} as const satisfies Record<string, HomeCardImage>;

export function homeCardImage(id: string): HomeCardImage {
  return CARD_IMAGES[id as keyof typeof CARD_IMAGES] ?? CARD_IMAGES.upload;
}

/** Red gradient fills for /feed carousel cards (no photography). */
const CARD_GRADIENTS: Record<string, string> = {
  upload:
    "linear-gradient(155deg, #ff6b6b 0%, #fa4141 38%, #8f1f1f 72%, #1a0808 100%)",
  guard:
    "linear-gradient(145deg, #ff5a5a 0%, #e83a3a 42%, #9b2222 78%, #140606 100%)",
  shadow:
    "linear-gradient(165deg, #fa4141 0%, #d43333 35%, #6b1818 70%, #0d0404 100%)",
  weekly:
    "linear-gradient(150deg, #ff7070 0%, #c92f2f 45%, #5c1414 80%, #100404 100%)",
  reupload:
    "linear-gradient(140deg, #ff6363 0%, #fa4141 40%, #7a1c1c 75%, #120505 100%)",
  progress:
    "linear-gradient(160deg, #e83a3a 0%, #b82828 38%, #4a1010 72%, #0a0303 100%)",
};

export function homeCardGradient(id: string): string {
  return CARD_GRADIENTS[id] ?? CARD_GRADIENTS.guard;
}

/** Feed carousel cards that use photography instead of red gradient. */
const FEED_PHOTO_CARDS = new Set(["guard", "shadow", "reupload", "progress"]);

export function homeCardUsesFeedPhoto(id: string): boolean {
  return FEED_PHOTO_CARDS.has(id);
}

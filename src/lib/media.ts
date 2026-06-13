/** Hero media — Fightlore Shopify CDN + poster overlay */

const FIGHTLORE_INTRO_CDN =
  "https://cdn.shopify.com/videos/c/o/v/8b216f4aa5df41b78eb801519b3745a6.mp4";

/** Fightlore intro — streamed from Shopify CDN (no 44MB local copy) */
export const ONBOARDING_VIDEO = FIGHTLORE_INTRO_CDN;

export const ONBOARDING_VIDEO_CDN = FIGHTLORE_INTRO_CDN;

export const DASHBOARD_VIDEO =
  "https://assets.mixkit.co/videos/preview/mixkit-man-doing-boxing-training-2088-large.mp4";

/** Intro video placeholder — shown while Shopify CDN video buffers */
export const HERO_ONBOARDING_POSTER = "/images/bag/clinch-action.png";

export const HERO_DASHBOARD_POSTER = HERO_ONBOARDING_POSTER;

/** Dashboard hero card — Muay Thai fighter portrait */
export const HERO_DASHBOARD_IMAGE = "/images/hero-fight-card.jpg";

/** Bag drill carousel — fighter in robe, clinch in ring */
export const BAG_CAROUSEL_FIGHTER = "/images/bag/fighter-robe.png";
export const BAG_CAROUSEL_CLINCH = "/images/bag/clinch-action.png";

/** Coming soon waitlist — overlapping fighter avatars */
export const WAITLIST_AVATARS = [
  "/images/waitlist/fighter-1.png",
  "/images/waitlist/fighter-2.png",
  "/images/waitlist/fighter-3.png",
  "/images/waitlist/fighter-4.png",
  "/images/waitlist/fighter-5.png",
] as const;

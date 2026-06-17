import { homeCardImage } from "@/lib/home/cardImages";
import { withBasePath } from "@/lib/paths";

export interface FeedLandingImage {
  id: string;
  src: string;
  position: string;
}

function card(id: string): FeedLandingImage {
  const image = homeCardImage(id);
  return { id, ...image };
}

/** All feed / home photography used on the landing orbit. */
export const FEED_LANDING_ORBIT_IMAGES: FeedLandingImage[] = [
  card("guard"),
  card("shadow"),
  card("reupload"),
  card("progress"),
  card("upload"),
  {
    id: "fighter",
    src: withBasePath("/images/home-carousel-fighter.png"),
    position: "50% 22%",
  },
  {
    id: "clinch",
    src: withBasePath("/images/home-carousel-clinch.png"),
    position: "50% 35%",
  },
  {
    id: "hero",
    src: withBasePath("/images/hero-poster.png"),
    position: "50% 20%",
  },
];

export const FEED_LANDING_HERO: FeedLandingImage = {
  id: "hero-center",
  src: withBasePath("/images/home-carousel-fighter.png"),
  position: "50% 18%",
};

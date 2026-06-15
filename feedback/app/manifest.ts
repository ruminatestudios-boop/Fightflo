import type { MetadataRoute } from "next";

const basePath = process.env.FEEDBACK_BASE_PATH ?? "/feedback";
const prefix = basePath === "/" ? "" : basePath;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fightflo — AI Coaching",
    short_name: "Fightflo",
    description:
      "Upload training clips and get timestamped AI coaching on guard, footwork, and habits.",
    start_url: `${prefix}/`,
    scope: `${prefix}/`,
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    categories: ["fitness", "sports"],
    icons: [
      {
        src: `${prefix}/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

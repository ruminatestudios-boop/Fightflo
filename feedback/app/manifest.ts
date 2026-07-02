import type { MetadataRoute } from "next";

const basePath = process.env.FEEDBACK_BASE_PATH ?? "/feedback";
const prefix = basePath === "/" ? "" : basePath;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fightflo: Video analysis for serious fighters",
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
    // Lets a shared link (Android share sheet) land directly in the /tasks list.
    // The `params` shape here follows the actual Web Share Target spec (a plain
    // title/text/url map) rather than Next's `share_target` type, which models
    // a different (array-based) shape that Chrome doesn't use for this.
    share_target: {
      action: `${prefix}/tasks/share-target`,
      method: "get",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    } as unknown as MetadataRoute.Manifest["share_target"],
  };
}

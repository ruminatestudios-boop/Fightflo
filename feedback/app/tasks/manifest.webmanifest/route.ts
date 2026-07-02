import { NextResponse } from "next/server";

// Next's nested `manifest.ts` special-file convention isn't supported outside
// the app root on this Next version, so this is a plain route handler instead.
// `share_target.params` is a plain title/text/url map per the real Web Share
// Target spec — not the array shape Next's MetadataRoute.Manifest type expects.
export function GET() {
  return NextResponse.json(
    {
      name: "Tasks",
      short_name: "Tasks",
      description: "Voice-driven to-do capture",
      start_url: "/tasks",
      scope: "/tasks",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      orientation: "portrait",
      icons: [
        { src: "/tasks-icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/tasks-icons/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/tasks-icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      share_target: {
        action: "/tasks/share-target",
        method: "GET",
        params: { title: "title", text: "text", url: "url" },
      },
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}

/** @type {import('next').NextConfig} */
const basePath = process.env.FEEDBACK_BASE_PATH ?? "/feedback";

const nextConfig = {
  basePath,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/feedback",
        permanent: false,
        basePath: false,
      },
      {
        // Some browsers request the manifest at the origin root even when the app
        // is mounted under a basePath.
        source: "/manifest.webmanifest",
        destination: "/feedback/manifest.webmanifest",
        permanent: false,
        basePath: false,
      },
      {
        source: "/report/:id",
        destination: "/feedback/report/:id",
        permanent: false,
        basePath: false,
      },
      {
        source: "/feedback/feedback/:path*",
        destination: "/feedback/:path*",
        permanent: false,
        basePath: false,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_REAL_ANALYSIS: process.env.GEMINI_API_KEY ? "true" : "false",
    NEXT_PUBLIC_PRO_FEATURES_BYPASS:
      process.env.PRO_FEATURES_BYPASS === "true" ||
      process.env.ANALYSIS_LIMIT_BYPASS === "true"
        ? "true"
        : (process.env.NEXT_PUBLIC_PRO_FEATURES_BYPASS ?? "false"),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    serverComponentsExternalPackages: [
      "@napi-rs/canvas",
      "@mediapipe/tasks-vision",
      "fluent-ffmpeg",
      "ffmpeg-static",
    ],
    outputFileTracingIncludes: {
      "/api/upload/route": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/ffmpeg-static/**",
      ],
      "/api/analyse/route": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/ffmpeg-static/**",
      ],
      "/api/video/download/route": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/@napi-rs/canvas/**",
        "./node_modules/ffmpeg-static/**",
        "./scripts/detect-pose-cli.ts",
        "./lib/analysis/poseDetectionCore.ts",
      ],
    },
    outputFileTracingExcludes: {
      "/api/video/download/status/route": [
        "./node_modules/ffmpeg-static/**",
        "./node_modules/@mediapipe/**",
        "./node_modules/@napi-rs/canvas/**",
      ],
      "/api/upload/sign/route": [
        "./node_modules/ffmpeg-static/**",
        "./node_modules/@mediapipe/**",
        "./node_modules/@napi-rs/canvas/**",
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;

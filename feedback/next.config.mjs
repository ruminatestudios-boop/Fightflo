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
      "ffprobe-static",
      "ffmpeg-static",
    ],
    outputFileTracingIncludes: {
      "/api/upload": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/ffmpeg-static/**",
        "./node_modules/ffprobe-static/bin/**",
      ],
      "/api/analyse": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/ffmpeg-static/**",
        "./node_modules/ffprobe-static/bin/**",
      ],
      "/api/video/download": [
        "./node_modules/ffmpeg-static/**",
        "./node_modules/ffprobe-static/bin/**",
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

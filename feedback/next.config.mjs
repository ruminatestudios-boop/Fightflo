/** @type {import('next').NextConfig} */ // v2

const nextConfig = {
  basePath: "",
  assetPrefix: "",
  async redirects() {
    return [];
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: "",
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
      "/api/upload": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/ffmpeg-static/**",
      ],
      "/api/analyse": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/ffmpeg-static/**",
      ],
      "/api/video/download": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
        "./node_modules/@napi-rs/canvas/**",
        "./node_modules/ffmpeg-static/**",
        "./scripts/detect-pose-cli.ts",
        "./lib/analysis/poseDetectionCore.ts",
      ],
    },
    outputFileTracingExcludes: {
      "/api/video/download/status": [
        "./node_modules/ffmpeg-static/**",
        "./node_modules/@mediapipe/**",
        "./node_modules/@napi-rs/canvas/**",
      ],
      "/api/upload/sign": [
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

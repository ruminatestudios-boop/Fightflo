/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_REAL_ANALYSIS: process.env.GEMINI_API_KEY ? "true" : "false",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    serverComponentsExternalPackages: ["@napi-rs/canvas", "@mediapipe/tasks-vision"],
    outputFileTracingIncludes: {
      "/api/upload": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
      ],
      "/api/analyse": [
        "./lib/analysis/mediaPipeWasmLoader.cjs",
        "./node_modules/@mediapipe/tasks-vision/wasm/**",
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

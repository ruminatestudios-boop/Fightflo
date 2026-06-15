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

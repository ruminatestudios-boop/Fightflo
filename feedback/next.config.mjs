/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    serverComponentsExternalPackages: ["@napi-rs/canvas", "@mediapipe/tasks-vision"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;

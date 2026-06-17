import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/bag",
        destination: "/",
        permanent: true,
      },
      {
        source: "/feed",
        destination: "/feedback/feed",
        permanent: false,
      },
      {
        source: "/feedback/feedback/:path*",
        destination: "/feedback/:path*",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    return [
      {
        source: "/feedback",
        destination: "http://localhost:3001",
      },
      {
        source: "/feedback/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
  // Allow phone on local network to load dev JS bundles
  allowedDevOrigins: [
    "192.168.1.119",
    "192.168.1.123",
    "10.10.0.110",
    "localhost",
    "127.0.0.1",
  ],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

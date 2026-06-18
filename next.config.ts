import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/bag",
        destination: "/bag-drill",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    return [
      {
        source: "/",
        destination: "http://localhost:3001/",
      },
      {
        source: "/feed",
        destination: "http://localhost:3001/feed",
      },
      {
        source: "/report/:path*",
        destination: "http://localhost:3001/report/:path*",
      },
      {
        source: "/api/analyse",
        destination: "http://localhost:3001/api/analyse",
      },
      {
        source: "/api/checkout",
        destination: "http://localhost:3001/api/checkout",
      },
      {
        source: "/api/webhook",
        destination: "http://localhost:3001/api/webhook",
      },
      {
        source: "/api/sessions/:path*",
        destination: "http://localhost:3001/api/sessions/:path*",
      },
      {
        source: "/api/upload/:path*",
        destination: "http://localhost:3001/api/upload/:path*",
      },
      {
        source: "/api/user/:path*",
        destination: "http://localhost:3001/api/user/:path*",
      },
      {
        source: "/api/video/:path*",
        destination: "http://localhost:3001/api/video/:path*",
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

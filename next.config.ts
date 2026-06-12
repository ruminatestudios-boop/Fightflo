import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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

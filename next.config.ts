import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    // Der Collector läuft als Userscript auf linkedin.com und ruft diese API cross-origin auf.
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://www.linkedin.com" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,x-collector-key" },
        ],
      },
      {
        source: "/collector.user.js",
        headers: [{ key: "Content-Type", value: "text/javascript; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;

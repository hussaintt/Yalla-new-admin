import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.YALLA_API_BASE_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

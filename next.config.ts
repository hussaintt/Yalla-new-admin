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
  async redirects() {
    return [
      // Admins/customers pages were renamed from /users and /clients.
      { source: "/users", destination: "/admins", permanent: true },
      { source: "/users/:path*", destination: "/admins/:path*", permanent: true },
      { source: "/clients", destination: "/customers", permanent: true },
      { source: "/clients/:path*", destination: "/customers/:path*", permanent: true },
      // /vendors/:id now serves vendor detail pages (seller people).
    ];
  },
};

export default nextConfig;

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
      // /vendors now lists seller people; store management moved to /stores.
      // Old store-detail bookmarks (/vendors/:id) redirect to the new /stores/:id.
      { source: "/vendors/:storeId", destination: "/stores/:storeId", permanent: true },
    ];
  },
};

export default nextConfig;

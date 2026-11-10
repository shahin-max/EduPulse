import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Friendly aliases for the courses page.
  async redirects() {
    return [
      { source: "/course", destination: "/courses", permanent: true },
      { source: "/course/:slug", destination: "/courses/:slug", permanent: true },
    ];
  },
};

export default nextConfig;

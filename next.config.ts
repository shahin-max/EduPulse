import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Profile photos are served by Cloudinary.
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  // Friendly aliases for the courses page.
  async redirects() {
    return [
      { source: "/course", destination: "/courses", permanent: true },
      { source: "/course/:slug", destination: "/courses/:slug", permanent: true },
      // The combined Sainik page was split into AISSEE Class 6 and Class 9.
      { source: "/courses/sainik-school-entrance", destination: "/courses/aissee-class-6", permanent: true },
    ];
  },
};

export default nextConfig;

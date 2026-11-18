import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Profile photos are served by Cloudinary.
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  // Browser protections for every page: no framing by other sites, no MIME sniffing, and only
  // the origin sent as referrer. HSTS applies once the site is served over HTTPS.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
  poweredByHeader: false,
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

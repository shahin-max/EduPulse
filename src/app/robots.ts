import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The portal and account pages are private or useless in search results.
      disallow: ["/admin", "/teach", "/student", "/dashboard", "/login", "/register", "/set-password", "/forgot-password", "/verify-email"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

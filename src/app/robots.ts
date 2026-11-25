import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Staging and local copies stay crawlable so search engines can read their "noindex" tag and drop them;
  // they just do not advertise a sitemap.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The portal and account pages are private or useless in search results.
      disallow: ["/admin", "/teach", "/student", "/dashboard", "/login", "/register", "/set-password", "/forgot-password", "/verify-email"],
    },
    ...(INDEXABLE ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}

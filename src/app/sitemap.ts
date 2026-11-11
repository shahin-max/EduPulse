import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { courseHref, programs } from "@/lib/site";

const pages = ["/", "/courses", "/admissions", "/aboutus", "/faculty", "/gallery", "/contact", "/pamphlet"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...pages, ...programs.map(p => courseHref(p.slug))].map(path => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: path === "/admissions" || path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/courses" || path === "/admissions" ? 0.9 : 0.7,
  }));
}

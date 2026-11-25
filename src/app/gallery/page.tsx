import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import AcademySite from "@/components/academy-site";
import { publicData } from "@/lib/api";
import { PAGE_KEYS, parseGalleryPage } from "@/lib/site-pages";
import { readJson } from "@/lib/site-sections";
import Gallery from "./gallery";
import "./gallery.css";

export const metadata: Metadata = pageMetadata({
  title: "Gallery",
  description: "Photos and videos of games days, outings, celebrations and achievements at EduPulse Academy, Aligarh.",
  path: "/gallery",
});

export default async function GalleryPage() {
  const content = parseGalleryPage(readJson(await publicData.content(PAGE_KEYS.gallery), PAGE_KEYS.gallery));
  return <AcademySite><Gallery content={content} /></AcademySite>;
}

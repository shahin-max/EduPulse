import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import AcademySite from "@/components/academy-site";
import AboutPage from "@/components/about-page";
import { publicData } from "@/lib/api";
import { PAGE_KEYS, parseAbout } from "@/lib/site-pages";
import { readJson } from "@/lib/site-sections";
import "../courses/course.css";
import "./aboutus.css";

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description: "Meet the people and purpose behind EduPulse Academy. Discover our leadership, faculty departments, mission, values, and commitment to students in Aligarh.",
  path: "/aboutus",
});

export default async function AboutUs() {
  const content = parseAbout(readJson(await publicData.content(PAGE_KEYS.about), PAGE_KEYS.about));
  return <AcademySite><AboutPage content={content} /></AcademySite>;
}

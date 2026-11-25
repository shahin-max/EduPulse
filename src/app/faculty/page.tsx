import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import AcademySite from "@/components/academy-site";
import { pickedTeachers, publicData } from "@/lib/api";
import { parseHomeSections } from "@/lib/site-sections";
import FacultyPage from "@/components/faculty-page";
import "../courses/course.css";
import "./faculty.css";

export const metadata: Metadata = pageMetadata({
  title: "Faculty",
  description: "Meet the EduPulse Academy faculty in Aligarh: Mathematics, Physics, Chemistry, Biology, English & Communication, and Reasoning & General Awareness departments.",
  path: "/faculty",
});

export default async function Faculty() {
  const [teachers, content] = await Promise.all([publicData.faculty(), publicData.content("home.")]);
  // The same teachers as the home page (picked in Admin → Website → Faculty), all of them here.
  const picked = pickedTeachers(teachers, parseHomeSections(content).faculty.userIds);
  return <AcademySite><FacultyPage teachers={picked} /></AcademySite>;
}

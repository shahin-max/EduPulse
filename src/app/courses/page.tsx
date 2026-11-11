import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import CoursesIndex from "@/components/courses-index";
import { publicData } from "@/lib/api";
import { unlinkedCourses } from "@/lib/site";
import "./course.css";

export const metadata: Metadata = {
  title: "Courses",
  description: "Explore every EduPulse Academy program in Aligarh: Foundation classes (6-10), RMS & Sainik School, JEE, NEET, CUET, CLAT, GATE, AMU & JMI entrance, and Spoken English & IELTS.",
};

// The "more programs" list comes from the LMS catalogue; refreshed every 5 minutes.
export const revalidate = 300;

export default async function CoursesPage() {
  const moreCourses = unlinkedCourses(await publicData.courses());
  return <AcademySite><CoursesIndex moreCourses={moreCourses} /></AcademySite>;
}

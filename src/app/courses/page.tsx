import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import CoursesIndex from "@/components/courses-index";
import "./course.css";

export const metadata: Metadata = {
  title: "Courses",
  description: "Explore every EduPulse Academy program in Aligarh: Foundation classes (6-10), RMS & Sainik School, JEE, NEET, CUET, CLAT, GATE, AMU & JMI entrance, and Spoken English & IELTS.",
};

export default function CoursesPage() {
  return <AcademySite><CoursesIndex /></AcademySite>;
}

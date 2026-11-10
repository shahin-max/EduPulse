import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import FacultyPage from "@/components/faculty-page";
import "../courses/course.css";
import "./faculty.css";

export const metadata: Metadata = {
  title: "Faculty",
  description: "Meet the EduPulse Academy faculty in Aligarh: Mathematics, Physics, Chemistry, Biology, English & Communication, and Reasoning & General Awareness departments.",
};

export default function Faculty() {
  return <AcademySite><FacultyPage /></AcademySite>;
}

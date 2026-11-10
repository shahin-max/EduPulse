import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import AboutPage from "@/components/about-page";
import "../courses/course.css";
import "./aboutus.css";

export const metadata: Metadata = {
  title: "About Us",
  description: "Meet the people and purpose behind EduPulse Academy. Discover our leadership, faculty departments, mission, values, and commitment to students in Aligarh.",
};

export default function AboutUs() {
  return <AcademySite><AboutPage /></AcademySite>;
}

import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import AdmissionsPage from "@/components/admissions-page";
import { publicData } from "@/lib/api";
import "../courses/course.css";
import "../contact/contact.css";
import "./admissions.css";

export const metadata: Metadata = {
  title: "Admissions",
  description: "Apply for admission to EduPulse Academy, Aligarh: AISSEE Class 6 & 9 (Sainik School), AMU entrance, CUET, JEE, NEET and school tuition. See open batches and submit the form online.",
};

// Courses and open batches come from the LMS; refreshed every 5 minutes.
export const revalidate = 300;

export default async function Admissions() {
  const [courses, batches] = await Promise.all([publicData.courses(), publicData.openBatches()]);
  return <AcademySite><AdmissionsPage courses={courses} batches={batches} /></AcademySite>;
}

import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import { RegisterForm } from "@/components/auth-forms";
import "../auth.css";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your EduPulse Academy student account.",
  robots: { index: false },
};

export default function Page() {
  return <AcademySite><RegisterForm /></AcademySite>;
}

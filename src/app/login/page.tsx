import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import { LoginForm } from "@/components/auth-forms";
import "../auth.css";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to the EduPulse Academy student portal.",
  robots: { index: false },
};

export default function Page() {
  return <AcademySite><LoginForm /></AcademySite>;
}

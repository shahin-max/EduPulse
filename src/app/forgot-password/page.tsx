import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import { ForgotPasswordForm } from "@/components/auth-forms";
import "../auth.css";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset the password of your EduPulse Academy account.",
  robots: { index: false },
};

export default function Page() {
  return <AcademySite><ForgotPasswordForm /></AcademySite>;
}

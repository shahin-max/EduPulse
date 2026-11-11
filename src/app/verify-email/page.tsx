import { Suspense } from "react";
import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import { VerifyEmail } from "@/components/auth-forms";
import "../auth.css";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Confirm the email address of your EduPulse Academy account.",
  robots: { index: false },
};

export default function Page() {
  // useSearchParams needs a Suspense boundary so the rest of the page can be prerendered.
  return <AcademySite><Suspense><VerifyEmail /></Suspense></AcademySite>;
}

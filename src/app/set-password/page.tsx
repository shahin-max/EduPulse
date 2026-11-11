import { Suspense } from "react";
import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import { SetPasswordForm } from "@/components/auth-forms";
import "../auth.css";

export const metadata: Metadata = {
  title: "Set Password",
  description: "Set the password for your EduPulse Academy account.",
  robots: { index: false },
};

export default function Page() {
  // useSearchParams needs a Suspense boundary so the rest of the page can be prerendered.
  return <AcademySite><Suspense><SetPasswordForm /></Suspense></AcademySite>;
}

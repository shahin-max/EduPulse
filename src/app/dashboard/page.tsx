import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import { Dashboard } from "@/components/auth-forms";
import "../auth.css";

export const metadata: Metadata = {
  title: "My Account",
  description: "Your EduPulse Academy student account.",
  robots: { index: false },
};

export default function Page() {
  return <AcademySite><Dashboard /></AcademySite>;
}

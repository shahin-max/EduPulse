import type { Metadata } from "next";
import FacultyShell from "@/components/teach/faculty-shell";

export const metadata: Metadata = {
  title: { default: "Faculty", template: "%s | EduPulse Faculty" },
  robots: { index: false, follow: false },
};

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return <FacultyShell>{children}</FacultyShell>;
}

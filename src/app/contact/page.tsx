import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import AcademySite from "@/components/academy-site";
import ContactPage from "@/components/contact-page";
import "../courses/course.css";
import "./contact.css";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description: "Contact EduPulse Academy in Aligarh. Call, WhatsApp, email or visit us at Grand Bazar, Lal Diggi, Civil Lines (open daily, 7 AM to 9 PM), or send an enquiry about any program.",
  path: "/contact",
});

export default function Contact() {
  return <AcademySite><ContactPage /></AcademySite>;
}

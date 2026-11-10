import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import ContactPage from "@/components/contact-page";
import "../courses/course.css";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact EduPulse Academy in Aligarh. Call, WhatsApp, email or visit us at Lal Diggi, Civil Lines, or send an enquiry about any program.",
};

export default function Contact() {
  return <AcademySite><ContactPage /></AcademySite>;
}

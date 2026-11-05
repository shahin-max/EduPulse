import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import Gallery from "./gallery";
import "./gallery.css";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Explore a sample gallery of learning, campus life, and student experiences at EduPulse Academy.",
};

export default function GalleryPage() {
  return <AcademySite><Gallery /></AcademySite>;
}

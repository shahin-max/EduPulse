import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import Gallery from "./gallery";
import "./gallery.css";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos and videos of games days, outings, celebrations and achievements at EduPulse Academy, Aligarh.",
};

export default function GalleryPage() {
  return <AcademySite><Gallery /></AcademySite>;
}

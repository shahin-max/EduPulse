import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AcademySite from "@/components/academy-site";
import CourseDetail from "@/components/course-detail";
import { courseDetails } from "@/lib/courses";
import { programs } from "@/lib/site";
import "../course.css";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return programs.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const program = programs.find(p => p.slug === slug);
  const course = courseDetails[slug];
  if (!program || !course) return {};
  return {
    title: program.title,
    description: course.intro,
    openGraph: { title: `${program.title} | EduPulse Academy`, description: course.intro },
  };
}

export default async function CoursePage({ params }: Params) {
  const { slug } = await params;
  if (!courseDetails[slug] || !programs.some(p => p.slug === slug)) notFound();
  return <AcademySite><CourseDetail slug={slug} /></AcademySite>;
}

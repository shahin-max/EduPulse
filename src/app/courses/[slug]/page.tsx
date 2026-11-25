import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AcademySite from "@/components/academy-site";
import CourseDetail from "@/components/course-detail";
import { publicData } from "@/lib/api";
import { courseDetails } from "@/lib/courses";
import { breadcrumbJsonLd, courseJsonLd, faqJsonLd, jsonLd, pageMetadata } from "@/lib/seo";
import { courseHref, programs } from "@/lib/site";
import "../course.css";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
// Open batches come from the LMS; refreshed every 5 minutes.
export const revalidate = 300;

export function generateStaticParams() {
  return programs.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const program = programs.find(p => p.slug === slug);
  const course = courseDetails[slug];
  if (!program || !course) return {};
  return pageMetadata({ title: `${program.title} Coaching in Aligarh`, description: course.intro, path: courseHref(slug) });
}

export default async function CoursePage({ params }: Params) {
  const { slug } = await params;
  const program = programs.find(p => p.slug === slug);
  const course = courseDetails[slug];
  if (!course || !program) notFound();
  const batches = program.courseSlugs.length
    ? (await publicData.openBatches()).filter(b => program.courseSlugs.includes(b.courses.slug))
    : [];
  const path = courseHref(slug);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(courseJsonLd({ title: program.title, description: course.intro, path }))} />
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Courses", path: "/courses" }, { name: program.title, path }]))} />
    {course.faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqJsonLd(course.faqs))} />}
    <AcademySite><CourseDetail slug={slug} batches={batches} /></AcademySite>
  </>;
}

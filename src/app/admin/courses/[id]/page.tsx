import type { Metadata } from "next";
import CourseDetail from "@/components/admin/courses/course-detail";

export const metadata: Metadata = { title: "Course" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseDetail id={Number(id)} />;
}

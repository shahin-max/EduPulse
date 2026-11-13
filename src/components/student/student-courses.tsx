"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, FileText, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { studentApi } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, PageHeader, Pill, UserAvatar } from "@/components/admin/ui";
import { ProgressBar } from "./shared";

/** The batches the student is currently enrolled in, with teachers and study progress. */
export default function StudentCourses() {
  const { data, error, reload } = useAdminData(studentApi.courses, "student-courses");

  return <>
    <PageHeader title="My courses" description="The batches you are enrolled in, your teachers and how far you are through the study materials." />
    {error && <ErrorAlert message={error} onRetry={reload} />}
    {!data && !error && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>}
    {data?.length === 0 && <Card><EmptyState icon={BookOpen} title="No active courses"
      description="You are not enrolled in a running batch. If you have just joined, the office may still be setting it up."
      action={<Button asChild variant="outline"><Link href="/courses">Browse courses</Link></Button>} /></Card>}
    {data && data.length > 0 && <ul className="grid gap-4 md:grid-cols-2">
      {data.map(c => {
        const pct = c.materials.total ? (c.materials.completed / c.materials.total) * 100 : 0;
        // One row per teacher, listing every subject they take in this batch.
        const teachers = new Map<number, { name: string; photo: string | null; subjects: string[] }>();
        for (const t of c.teachers) {
          const entry = teachers.get(t.user_id) ?? { name: t.full_name, photo: t.photo_url, subjects: [] };
          entry.subjects.push(t.subject.name);
          teachers.set(t.user_id, entry);
        }
        return <li key={c.enrollment_id}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{c.batch.courses.title}</CardTitle>
                <Pill value={c.batch.status} tones={{ ACTIVE: "green", PLANNED: "blue", COMPLETED: "gray", CANCELLED: "red" }} />
              </div>
              <CardDescription>
                {c.batch.name}{c.batch.branches ? ` · ${c.batch.branches.name}` : ""}
                {c.batch.start_date ? ` · ${formatDate(c.batch.start_date)}${c.batch.end_date ? ` – ${formatDate(c.batch.end_date)}` : ""}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <section className="grid gap-2">
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Study materials completed</span><span className="font-medium tabular-nums">{c.materials.completed}/{c.materials.total}</span></p>
                <ProgressBar value={pct} tone={pct >= 100 ? "green" : "primary"} />
              </section>
              <section className="grid gap-2">
                <h3 className="text-sm font-medium">Teachers</h3>
                {teachers.size === 0 ? <p className="text-sm text-muted-foreground">Teachers will be assigned soon.</p>
                  : <ul className="grid gap-2">{[...teachers].map(([id, t]) => <li key={id} className="flex items-center gap-3">
                    <UserAvatar name={t.name} src={t.photo} className="size-8" />
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{t.name}</span><span className="block truncate text-xs text-muted-foreground">{t.subjects.join(", ")}</span></span>
                  </li>)}</ul>}
              </section>
              {c.access_ends_at && <p className="text-xs text-muted-foreground">Your access to this batch ends on {formatDate(c.access_ends_at)}.</p>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button asChild><Link href={`/student/materials?course=${c.batch.courses.id}`}><FileText /> Materials</Link></Button>
                <Button asChild variant="outline"><Link href="/student/assignments"><NotebookPen /> Assignments</Link></Button>
                <Button asChild variant="outline"><Link href="/student/classes"><CalendarDays /> Timetable</Link></Button>
              </div>
            </CardContent>
          </Card>
        </li>;
      })}
    </ul>}
  </>;
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ClipboardList, FileText, Layers, NotebookPen, Phone, Search, TableProperties, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { GradebookCard } from "@/components/staff/reports/gradebook";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, PageHeader, Pill, UserAvatar } from "@/components/admin/ui";
import { useStaffBatches, type StaffBatch } from "@/components/staff/use-staff";
import { BatchCard, mySubjects } from "./faculty-overview";

const ENROLLMENT_TONES = { ACTIVE: "green", PENDING: "amber", PAUSED: "orange", COMPLETED: "blue", CANCELLED: "red" } as const;

type RosterEntry = {
  id: number;
  status: string;
  enrolled_at: string;
  student_profiles: {
    user_id: number;
    admission_number: string | null;
    grade: string | null;
    guardian_name: string | null;
    guardian_mobile: string | null;
    users: { full_name: string; email: string | null; mobile: string | null };
  };
};

/** All batches the teacher is assigned to, current ones first. */
export function FacultyBatches() {
  const { user } = useAuth();
  const staff = useStaffBatches();
  const current = staff.batches.filter(b => b.status === "ACTIVE" || b.status === "PLANNED");
  const past = staff.batches.filter(b => b.status !== "ACTIVE" && b.status !== "PLANNED");

  return <>
    <PageHeader title="My batches" description="Batches you teach, with their students, classes and tests." />
    {staff.error && <ErrorAlert message={staff.error} onRetry={staff.reload} />}
    {!staff.data && !staff.error && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>}
    {staff.data && staff.batches.length === 0 && <Card><EmptyState icon={Layers} title="No batches yet" description="Ask the academy admin to assign you to a batch and subject." /></Card>}
    {current.length > 0 && <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{current.map(b => <li key={b.id}><BatchCard batch={b} userId={user?.id} /></li>)}</ul>}
    {past.length > 0 && <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Completed and cancelled</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{past.map(b => <li key={b.id}><BatchCard batch={b} userId={user?.id} /></li>)}</ul>
    </section>}
  </>;
}

/** One batch, read-only for faculty: details, subjects and teachers, and the student list. */
export function FacultyBatchDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const batch = useAdminData(token => request<StaffBatch>(`/batches/${id}`, { token }), `batch:${id}`);
  const roster = useAdminData(token => request<RosterEntry[]>(`/batches/${id}/students`, { token }), `roster:${id}`);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"students" | "gradebook">("students");

  const students = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (roster.data ?? [])
      .filter(r => r.status === "ACTIVE" || r.status === "PENDING" || r.status === "PAUSED")
      .filter(r => !term || [r.student_profiles.users.full_name, r.student_profiles.admission_number ?? "", r.student_profiles.users.mobile ?? ""].some(v => v.toLowerCase().includes(term)))
      .sort((a, b) => a.student_profiles.users.full_name.localeCompare(b.student_profiles.users.full_name));
  }, [roster.data, search]);

  if (batch.error) return <>
    <BackLink />
    <ErrorAlert title="Batch not available" message={batch.error} onRetry={batch.reload} />
  </>;
  if (!batch.data) return <><BackLink /><LoadingRows rows={4} /></>;
  const b = batch.data;
  const subjects = mySubjects(b, user?.id);
  const links = [
    { label: "Classes", icon: CalendarDays, href: "/teach/classes" },
    { label: "Materials", icon: FileText, href: "/teach/materials" },
    { label: "Assignments", icon: NotebookPen, href: "/teach/assignments" },
    { label: "Exams", icon: ClipboardList, href: "/teach/exams" },
  ];

  return <>
    <BackLink />
    <PageHeader title={b.name} description={`${b.courses.title}${b.branches ? ` · ${b.branches.name}` : ""} · ${b.code}`}
      actions={<Pill value={b.status} tones={{ ACTIVE: "green", PLANNED: "blue", COMPLETED: "gray", CANCELLED: "red" }} />} />

    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-xs text-muted-foreground">Dates</p><p className="font-medium">{formatDate(b.start_date)}{b.end_date ? ` – ${formatDate(b.end_date)}` : ""}</p></CardContent></Card>
      <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-xs text-muted-foreground">Students</p><p className="font-medium tabular-nums">{b.enrolled}</p></CardContent></Card>
      <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-xs text-muted-foreground">You teach</p><p className="truncate font-medium">{subjects.length ? subjects.join(", ") : "—"}</p></CardContent></Card>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {links.map(({ label, icon: Icon, href }) => <Button key={label} asChild variant="outline"><Link href={href}><Icon /> {label}</Link></Button>)}
    </div>

    <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 sm:w-fit" role="tablist" aria-label="Batch view">
      {([["students", "Students & teachers", Users], ["gradebook", "Gradebook", TableProperties]] as const).map(([value, label, Icon]) =>
        <Button key={value} role="tab" aria-selected={view === value} size="sm" variant={view === value ? "secondary" : "ghost"}
          className={cn("flex-1 sm:flex-none", view === value && "bg-background shadow-xs")} onClick={() => setView(value)}>
          <Icon /> {label}
        </Button>)}
    </div>

    {view === "gradebook" ? <GradebookCard batchId={id} /> : <div className="grid gap-6 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2 gap-0 py-0">
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle>Students</CardTitle>
          <CardDescription>{roster.data ? `${students.length} shown` : "Loading…"}</CardDescription>
          <CardAction><Users className="size-4 text-muted-foreground" /></CardAction>
        </CardHeader>
        <div className="border-b p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Search by name, admission no. or mobile" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" aria-label="Search students" />
          </div>
        </div>
        <CardContent className="p-0">
          {roster.error && <div className="p-4"><ErrorAlert message={roster.error} onRetry={roster.reload} /></div>}
          {!roster.data && !roster.error && <LoadingRows rows={5} />}
          {roster.data && students.length === 0 && <EmptyState icon={Users} title={search ? "No students match" : "No students yet"} description={search ? "Try a different search." : "Students appear here once the academy enrols them."} />}
          {students.length > 0 && <ul className="divide-y">
            {students.map(r => {
              const p = r.student_profiles;
              return <li key={r.id} className="flex items-center gap-3 p-4">
                <UserAvatar name={p.users.full_name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/teach/batches/${id}/students/${p.user_id}`} className="block truncate font-medium hover:underline">{p.users.full_name}</Link>
                  <p className="truncate text-xs text-muted-foreground">{[p.admission_number, p.grade && `Class ${p.grade}`, p.guardian_name && `Guardian: ${p.guardian_name}`].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                {r.status !== "ACTIVE" && <Pill value={r.status} tones={ENROLLMENT_TONES} />}
                {(p.guardian_mobile ?? p.users.mobile) && <Button asChild variant="ghost" size="icon" aria-label={`Call about ${p.users.full_name}`}><a href={`tel:${p.guardian_mobile ?? p.users.mobile}`}><Phone /></a></Button>}
              </li>;
            })}
          </ul>}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader><CardTitle>Teachers</CardTitle><CardDescription>Who teaches each subject in this batch.</CardDescription></CardHeader>
        <CardContent>
          {b.faculty.length === 0 ? <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
            : <ul className="grid gap-3">{b.faculty.map(f => <li key={`${f.userId}-${f.subject.id}`} className="flex items-center gap-3">
              <UserAvatar name={f.fullName} className="size-8" />
              <div className="min-w-0"><p className="truncate text-sm font-medium">{f.fullName}{f.userId === user?.id ? " (you)" : ""}</p><p className="truncate text-xs text-muted-foreground">{f.subject.name}</p></div>
            </li>)}</ul>}
        </CardContent>
      </Card>
    </div>}
  </>;
}

function BackLink() {
  return <Link href="/teach/batches" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> My batches</Link>;
}

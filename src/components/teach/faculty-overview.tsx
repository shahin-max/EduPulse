"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, CalendarDays, CalendarPlus, ClipboardCheck, ClipboardList, FilePlus2, GraduationCap, Layers, NotebookPen, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { query } from "@/lib/admin-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, PageHeader, Pill } from "@/components/admin/ui";
import { useStaffBatches, type StaffBatch } from "@/components/staff/use-staff";

type ClassSession = {
  id: number; title: string; starts_at: string; ends_at: string; status: string; meeting_url: string | null;
  batches: { id: number; code: string; name: string }; subjects: { name: string } | null;
  faculty_profiles: { user_id: number; users: { full_name: string } } | null;
};

/** The current time, rounded to the minute and refreshed every minute (render stays pure). */
function useNow(stepMs = 60_000) {
  return useSyncExternalStore(
    onChange => { const timer = setInterval(onChange, stepMs); return () => clearInterval(timer); },
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => 0,
  );
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const CLASS_TONES = { SCHEDULED: "blue", COMPLETED: "green", CANCELLED: "red" } as const;

/** Subjects this teacher teaches in a batch (from batch_faculty). */
export const mySubjects = (batch: StaffBatch, userId: number | undefined) =>
  batch.faculty.filter(f => f.userId === userId).map(f => f.subject.name);

function loadToday(token: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return request<ClassSession[]>(`/class-sessions/timetable${query({ from: start.toISOString(), to: end.toISOString() })}`, { token });
}

export default function FacultyOverview() {
  const { user } = useAuth();
  const staff = useStaffBatches();
  const today = useAdminData(loadToday, "faculty-today");
  const active = staff.batches.filter(b => b.status === "ACTIVE" || b.status === "PLANNED");
  const students = active.reduce((n, b) => n + b.enrolled, 0);
  const now = useNow();

  const stats = [
    { label: "My batches", value: staff.data ? active.length : undefined, icon: Layers, href: "/teach/batches" },
    { label: "Students", value: staff.data ? students : undefined, icon: GraduationCap, href: "/teach/batches" },
    { label: "Classes today", value: today.data ? today.data.filter(c => c.status !== "CANCELLED").length : undefined, icon: CalendarDays, href: "/teach/classes" },
  ];
  const actions = [
    { label: "Schedule a class", icon: CalendarPlus, href: "/teach/classes" },
    { label: "Add study material", icon: FilePlus2, href: "/teach/materials" },
    { label: "New assignment", icon: NotebookPen, href: "/teach/assignments" },
    { label: "Create a test", icon: ClipboardList, href: "/teach/exams" },
  ];

  return <>
    <PageHeader title={`Good to see you, ${user?.full_name.split(" ")[0] ?? "Teacher"}`} description="Your classes, batches and teaching tools in one place." />
    {staff.error && <ErrorAlert message={staff.error} onRetry={staff.reload} />}

    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {stats.map(({ label, value, icon: Icon, href }) => <Link key={label} href={href} className="group rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <Card className="h-full gap-2 py-4 transition-colors group-hover:border-primary/40 sm:gap-3 sm:py-5">
          <CardHeader className="px-3 sm:px-5">
            <CardDescription className="truncate text-xs sm:text-sm">{label}</CardDescription>
            <CardAction className="hidden sm:block"><Icon className="size-4 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent className="px-3 sm:px-5">
            {value === undefined ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>}
          </CardContent>
        </Card>
      </Link>)}
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>Today&apos;s classes</CardTitle>
          <CardDescription>Join online classes and mark attendance.</CardDescription>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/teach/classes">Timetable <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent>
          {today.error ? <ErrorAlert message={today.error} onRetry={today.reload} />
            : !today.data ? <div className="grid gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            : today.data.length === 0 ? <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><CalendarDays className="size-4" /> No classes scheduled for you today.</p>
            : <ul className="grid gap-3">
              {today.data.map(c => {
                const live = c.status !== "CANCELLED" && new Date(c.starts_at).getTime() - 15 * 60_000 <= now && new Date(c.ends_at).getTime() >= now;
                return <li key={c.id} className="grid gap-3 rounded-lg border p-3 sm:flex sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{c.title}</p>
                      {live ? <Pill value="LIVE" label="Live now" tones={{ LIVE: "green" }} /> : <Pill value={c.status} tones={CLASS_TONES} />}
                    </div>
                    <p className="text-sm text-muted-foreground">{time(c.starts_at)}–{time(c.ends_at)} · {c.batches.name}{c.subjects ? ` · ${c.subjects.name}` : ""}</p>
                  </div>
                  {c.status !== "CANCELLED" && <div className="grid grid-cols-2 gap-2 sm:flex">
                    {c.meeting_url && <Button asChild size="sm" variant={live ? "default" : "outline"}><a href={c.meeting_url} target="_blank" rel="noopener noreferrer"><Video /> Join</a></Button>}
                    <Button asChild size="sm" variant="outline" className={c.meeting_url ? "" : "col-span-2"}><Link href={`/teach/classes/${c.id}`}><ClipboardCheck /> Attendance</Link></Button>
                  </div>}
                </li>;
              })}
            </ul>}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {actions.map(({ label, icon: Icon, href }) => <Button key={label} asChild variant="outline" className="justify-start"><Link href={href}><Icon /> {label}</Link></Button>)}
        </CardContent>
      </Card>
    </div>

    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>My batches</CardTitle>
        <CardDescription>Batches you are assigned to teach.</CardDescription>
        <CardAction><Button variant="ghost" size="sm" asChild><Link href="/teach/batches">View all <ArrowRight /></Link></Button></CardAction>
      </CardHeader>
      <CardContent>
        {!staff.data ? <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
          : active.length === 0 ? <EmptyState icon={Layers} title="No batches yet" description="Ask the academy admin to assign you to a batch and subject." />
          : <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.map(b => <li key={b.id}><BatchCard batch={b} userId={user?.id} /></li>)}
          </ul>}
      </CardContent>
    </Card>
  </>;
}

export function BatchCard({ batch, userId }: { batch: StaffBatch; userId: number | undefined }) {
  const subjects = mySubjects(batch, userId);
  return <Link href={`/teach/batches/${batch.id}`} className="grid h-full gap-1 rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
    <div className="flex items-start justify-between gap-2">
      <p className="truncate font-medium">{batch.name}</p>
      <Pill value={batch.status} tones={{ ACTIVE: "green", PLANNED: "blue", COMPLETED: "gray", CANCELLED: "red" }} />
    </div>
    <p className="truncate text-sm text-muted-foreground">{batch.courses.title}{batch.branches ? ` · ${batch.branches.name}` : ""}</p>
    <p className="text-sm"><span className="font-medium tabular-nums">{batch.enrolled}</span> <span className="text-muted-foreground">students</span></p>
    {subjects.length > 0 && <p className="truncate text-xs text-muted-foreground">You teach: {subjects.join(", ")}</p>}
  </Link>;
}

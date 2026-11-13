"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CalendarCheck, CalendarDays, ClipboardList, IndianRupee, Megaphone, NotebookPen, PlayCircle, Trophy, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { KIND_LABEL, rupees, studentApi } from "@/lib/student-api";
import { LOW_ATTENDANCE, num } from "@/lib/teaching-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, PageHeader, Pill } from "@/components/admin/ui";
import { isJoinable, relative, timeOf, useNow } from "./shared";

function loadToday(token: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return studentApi.timetable(token, start, new Date(start.getTime() + 24 * 60 * 60 * 1000));
}

const listLink = "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40";

/** The student's home: today's classes, work due, tests, fees, notices and recent results at a glance. */
export default function StudentHome() {
  const { user } = useAuth();
  const now = useNow();
  const courses = useAdminData(studentApi.courses, "student-courses");
  const today = useAdminData(loadToday, "student-today");
  const assignments = useAdminData(studentApi.assignments, "student-assignments");
  const exams = useAdminData(studentApi.availableExams, "student-exams");
  const attendance = useAdminData(studentApi.attendance, "student-attendance");
  const invoices = useAdminData(studentApi.invoices, "student-invoices");
  const feed = useAdminData(token => studentApi.feed(token, 3), "student-feed");
  const attempts = useAdminData(token => studentApi.myAttempts(token), "student-attempts");

  const notEnrolled = courses.data?.length === 0;
  const toDo = (assignments.data ?? []).filter(a => a.status === "PUBLISHED" && (a.state === "MISSING" || a.state === "NOT_DUE"));
  const openTests = (exams.data ?? []).filter(e => e.window === "OPEN" && (e.in_progress_attempt_id || e.attempts_remaining > 0));
  const att = (attendance.data ?? []).reduce((s, b) => ({ attended: s.attended + b.summary.present + b.summary.late, counted: s.counted + b.summary.present + b.summary.late + b.summary.absent }), { attended: 0, counted: 0 });
  const attPct = att.counted ? Math.round((att.attended / att.counted) * 1000) / 10 : null;
  const dueInvoices = (invoices.data ?? []).filter(i => i.status === "ISSUED" || i.status === "PART_PAID");
  const balance = dueInvoices.reduce((sum, i) => sum + Number(i.balance_due), 0);
  const recentResults = (attempts.data ?? []).filter(a => a.score !== undefined && a.score !== null).slice(0, 3);

  const stats = [
    { label: "Attendance", value: attendance.data ? (attPct === null ? "—" : `${attPct}%`) : undefined, icon: CalendarCheck, href: "/student/attendance", alert: attPct !== null && attPct < LOW_ATTENDANCE },
    { label: "Assignments to do", value: assignments.data ? String(toDo.length) : undefined, icon: NotebookPen, href: "/student/assignments", alert: toDo.some(a => a.state === "MISSING") },
    { label: "Tests open", value: exams.data ? String(openTests.length) : undefined, icon: ClipboardList, href: "/student/tests", alert: openTests.length > 0 },
    { label: "Fees due", value: invoices.data ? (balance ? rupees(balance) : "Nil") : undefined, icon: IndianRupee, href: "/student/fees", alert: dueInvoices.some(i => i.due_date && new Date(i.due_date).getTime() < now) },
  ];

  return <>
    <PageHeader title={`Hello, ${user?.full_name.split(" ")[0] ?? "there"}`} description="Your classes, work and results in one place." />
    {courses.error && <ErrorAlert message={courses.error} onRetry={courses.reload} />}
    {notEnrolled && <Card><EmptyState icon={BookOpen} title="You are not in a batch yet"
      description="Once the academy enrols you in a batch, your classes, study materials, assignments and tests appear here. Call or visit the office if you have already paid."
      action={<Button asChild variant="outline"><Link href="/courses">Browse courses</Link></Button>} /></Card>}

    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, href, alert }) => <Link key={label} href={href} className="group rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <Card className={cn("h-full gap-2 py-4 transition-colors group-hover:border-primary/40 sm:gap-3 sm:py-5", alert && "border-amber-500/40")}>
          <CardHeader className="px-3 sm:px-5">
            <CardDescription className="truncate text-xs sm:text-sm">{label}</CardDescription>
            <CardAction><Icon className={cn("size-4", alert ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} /></CardAction>
          </CardHeader>
          <CardContent className="px-3 sm:px-5">
            {value === undefined ? <Skeleton className="h-8 w-14" /> : <p className="truncate text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>}
          </CardContent>
        </Card>
      </Link>)}
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>Today&apos;s classes</CardTitle>
          <CardDescription>Online classes open 15 minutes before they start.</CardDescription>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/student/classes">Timetable <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent>
          {today.error ? <ErrorAlert message={today.error} onRetry={today.reload} />
            : !today.data ? <div className="grid gap-3">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            : today.data.length === 0 ? <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><CalendarDays className="size-4" /> No classes today.</p>
            : <ul className="grid gap-3">
              {today.data.map(c => {
                const live = isJoinable(c, now);
                return <li key={c.id} className="grid gap-3 rounded-lg border p-3 sm:flex sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("truncate font-medium", c.status === "CANCELLED" && "line-through opacity-70")}>{c.title}</p>
                      {c.status === "CANCELLED" ? <Pill value="CANCELLED" label="Cancelled" tones={{ CANCELLED: "red" }} />
                        : live ? <Pill value="LIVE" label="Live now" tones={{ LIVE: "green" }} /> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{timeOf(c.starts_at)}–{timeOf(c.ends_at)}{c.subjects ? ` · ${c.subjects.name}` : ""}{c.faculty_profiles ? ` · ${c.faculty_profiles.users.full_name}` : ""}</p>
                  </div>
                  {c.status !== "CANCELLED" && c.meeting_url && <Button asChild size="sm" variant={live ? "default" : "outline"} className="sm:w-auto">
                    <a href={c.meeting_url} target="_blank" rel="noopener noreferrer"><Video /> {live ? "Join now" : "Class link"}</a>
                  </Button>}
                  {c.recording_url && <Button asChild size="sm" variant="outline"><a href={c.recording_url} target="_blank" rel="noopener noreferrer"><PlayCircle /> Recording</a></Button>}
                </li>;
              })}
            </ul>}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Notice board</CardTitle>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/student/notices">All <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent>
          {!feed.data ? <div className="grid gap-3">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : feed.data.data.length === 0 ? <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Megaphone className="size-4" /> No announcements yet.</p>
            : <ul className="grid gap-3">
              {feed.data.data.map(a => <li key={a.id}>
                <Link href="/student/notices" className="grid gap-0.5 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                  <span className="truncate text-sm font-medium">{a.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{a.body}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(a.publish_at ?? a.created_at)}</span>
                </Link>
              </li>)}
            </ul>}
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Assignments to do</CardTitle>
          <CardDescription>Overdue work first. Late work is still accepted until the teacher closes it.</CardDescription>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/student/assignments">All <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent>
          {assignments.error ? <ErrorAlert message={assignments.error} onRetry={assignments.reload} />
            : !assignments.data ? <div className="grid gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : toDo.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Nothing to hand in. Well done!</p>
            : <ul className="grid gap-2">
              {toDo.slice(0, 5).map(a => <li key={a.id}>
                <Link href={`/student/assignments/${a.id}`} className={listLink}>
                  <NotebookPen className={cn("size-4 shrink-0", a.state === "MISSING" ? "text-red-600 dark:text-red-400" : "text-muted-foreground")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{a.subjects?.name ?? a.batches.name}</span>
                  </span>
                  <span className={cn("shrink-0 text-xs", a.state === "MISSING" ? "font-medium text-red-700 dark:text-red-400" : "text-muted-foreground")}>
                    {a.due_at ? (a.state === "MISSING" ? `Overdue ${relative(a.due_at, now).replace(" ago", "")}` : `Due ${relative(a.due_at, now)}`) : "No due date"}
                  </span>
                </Link>
              </li>)}
            </ul>}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Tests</CardTitle>
          <CardDescription>Open now and coming up.</CardDescription>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/student/tests">All <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {exams.error ? <ErrorAlert message={exams.error} onRetry={exams.reload} />
            : !exams.data ? <div className="grid gap-3">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : exams.data.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No tests scheduled right now.</p>
            : <ul className="grid gap-2">
              {exams.data.slice(0, 4).map(e => <li key={e.id}>
                <Link href={e.in_progress_attempt_id ? `/student/tests/attempt/${e.in_progress_attempt_id}` : "/student/tests"} className={listLink}>
                  <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {KIND_LABEL[e.kind]} · {e.duration_minutes} min · {e.window === "OPEN" ? (e.closes_at ? `closes ${formatDate(e.closes_at, true)}` : "open now") : `opens ${formatDate(e.opens_at, true)}`}
                    </span>
                  </span>
                  {e.in_progress_attempt_id ? <Pill value="RESUME" label="Resume" tones={{ RESUME: "amber" }} />
                    : e.window === "OPEN" ? <Pill value="OPEN" label="Open" tones={{ OPEN: "green" }} /> : <Pill value="SOON" label="Upcoming" tones={{ SOON: "blue" }} />}
                </Link>
              </li>)}
            </ul>}
          {recentResults.length > 0 && <section className="grid gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium"><Trophy className="size-4 text-amber-500" /> Recent results</h3>
            <ul className="grid gap-2">
              {recentResults.map(a => <li key={a.id}>
                <Link href={`/student/tests/attempt/${a.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted/40">
                  <span className="min-w-0 truncate">{a.exam.title}</span>
                  <span className="shrink-0 tabular-nums font-medium">{num(a.score)} / {num(a.max_score)} <span className="text-xs font-normal text-muted-foreground">({num(a.percentage)}%)</span></span>
                </Link>
              </li>)}
            </ul>
          </section>}
        </CardContent>
      </Card>
    </div>
  </>;
}

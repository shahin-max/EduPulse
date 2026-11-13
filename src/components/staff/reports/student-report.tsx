"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck, ClipboardList, FileText, Mail, NotebookPen, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LOW_ATTENDANCE, num, SUBMISSION_LABEL, teachingApi } from "@/lib/teaching-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, formatDate, Pill, titleCase, UserAvatar, type Tone } from "@/components/admin/ui";
import { usePortal } from "@/components/portal/portal-shell";

const ATTENDANCE_TONES: Record<string, Tone> = { PRESENT: "green", LATE: "amber", ABSENT: "red", EXCUSED: "blue", UNMARKED: "gray" };
const STATE_TONES: Record<string, Tone> = { REVIEWED: "green", SUBMITTED: "blue", LATE: "amber", MISSING: "red", NOT_DUE: "gray" };
const ATTEMPT_TONES: Record<string, Tone> = { SUBMITTED: "green", AUTO_SUBMITTED: "blue", IN_PROGRESS: "amber", INVALIDATED: "red" };

/** One student's progress in one batch, for the batch's faculty and admins. */
export function StudentReport({ batchId, userId }: { batchId: number; userId: number }) {
  const { base } = usePortal();
  const { data, error, reload } = useAdminData(token => teachingApi.studentReport(token, batchId, userId), `report:${batchId}:${userId}`);
  const back = <Link href={`${base}/batches/${batchId}`} className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground print:hidden">
    <ArrowLeft className="size-4" /> {data ? data.batch.name : "Back to batch"}
  </Link>;

  if (error) return <>{back}<ErrorAlert title="Report not available" message={error} onRetry={reload} /></>;
  if (!data) return <>{back}<div className="grid gap-4"><Skeleton className="h-28 rounded-xl" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-64 rounded-xl" /></div></>;

  const { student, attendance, assignments, exams, materials } = data;
  const due = assignments.filter(a => a.state !== "NOT_DUE");
  const handedIn = due.filter(a => a.state !== "MISSING").length;
  const taken = exams.filter(e => e.best);
  const examAverage = taken.length ? taken.reduce((sum, e) => sum + Number(e.best!.percentage ?? 0), 0) / taken.length : null;
  const lowAttendance = attendance.percentage !== null && attendance.percentage < LOW_ATTENDANCE;

  const stats = [
    { label: "Attendance", value: attendance.percentage === null ? "—" : `${attendance.percentage}%`, sub: `${attendance.present + attendance.late} of ${attendance.present + attendance.late + attendance.absent} classes`, icon: CalendarCheck, alert: lowAttendance },
    { label: "Assignments handed in", value: due.length ? `${handedIn}/${due.length}` : "—", sub: due.length - handedIn ? `${due.length - handedIn} missing` : "Nothing missing", icon: NotebookPen, alert: due.length - handedIn > 0 },
    { label: "Test average", value: examAverage === null ? "—" : `${Math.round(examAverage * 10) / 10}%`, sub: `${taken.length} of ${exams.length} tests taken`, icon: ClipboardList, alert: false },
    { label: "Study materials", value: `${materials.completed}/${materials.total}`, sub: materials.in_progress ? `${materials.in_progress} in progress` : "completed", icon: FileText, alert: false },
  ];

  return <>
    {back}
    <Card>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <UserAvatar name={student.users.full_name} src={student.users.photo_url} className="size-16 text-lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{student.users.full_name}</h1>
            <Pill value={data.enrollment.status} tones={{ ACTIVE: "green", PAUSED: "orange", COMPLETED: "blue", CANCELLED: "red", PENDING: "amber" }} />
          </div>
          <p className="text-sm text-muted-foreground">{[student.admission_number, student.grade && `Class ${student.grade}`, student.school_name].filter(Boolean).join(" · ") || "No admission details"}</p>
          <p className="text-sm text-muted-foreground">{data.batch.courses.title} · {data.batch.name} · enrolled {formatDate(data.enrollment.enrolled_at)}</p>
        </div>
        <div className="grid gap-2 text-sm sm:min-w-56 print:hidden">
          {student.users.mobile && <Button asChild variant="outline" size="sm" className="justify-start"><a href={`tel:${student.users.mobile}`}><Phone /> Student: {student.users.mobile}</a></Button>}
          {student.guardian_mobile && <Button asChild variant="outline" size="sm" className="justify-start"><a href={`tel:${student.guardian_mobile}`}><Phone /> {student.guardian_name ?? "Guardian"}: {student.guardian_mobile}</a></Button>}
          {student.users.email && <Button asChild variant="ghost" size="sm" className="justify-start"><a href={`mailto:${student.users.email}`}><Mail /> <span className="truncate">{student.users.email}</span></a></Button>}
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, sub, icon: Icon, alert }) => <Card key={label} className={cn("gap-1 py-4", alert && "border-red-500/40")}>
        <CardContent className="grid gap-1 px-4">
          <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">{label}<Icon className="size-4" /></p>
          <p className={cn("text-2xl font-semibold tabular-nums", alert && "text-red-700 dark:text-red-400")}>{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>)}
    </div>

    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="border-b py-4 [.border-b]:pb-4"><CardTitle>Assignments</CardTitle><CardDescription>Published assignments for the batch, newest first.</CardDescription></CardHeader>
      <CardContent className="p-0">
        {assignments.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No assignments yet.</p> : <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Assignment</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Marks</TableHead><TableHead className="hidden pr-4 md:table-cell">Feedback</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {assignments.map(a => <TableRow key={a.id}>
              <TableCell className="max-w-56 pl-4"><Link href={`${base}/assignments/${a.id}`} className="block truncate font-medium hover:underline">{a.title}</Link>{a.subjects && <span className="text-xs text-muted-foreground">{a.subjects.name}</span>}</TableCell>
              <TableCell className="text-muted-foreground">{a.due_at ? formatDate(a.due_at, true) : "—"}</TableCell>
              <TableCell><Pill value={a.state} label={SUBMISSION_LABEL[a.state]} tones={STATE_TONES} /></TableCell>
              <TableCell className="tabular-nums">{a.submission?.marks_awarded != null ? `${num(a.submission.marks_awarded)}${a.max_marks ? ` / ${num(a.max_marks)}` : ""}` : "—"}</TableCell>
              <TableCell className="hidden max-w-64 truncate pr-4 text-muted-foreground md:table-cell">{a.submission?.feedback || "—"}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>}
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="min-w-0 gap-0 py-0">
        <CardHeader className="border-b py-4 [.border-b]:pb-4"><CardTitle>Tests</CardTitle><CardDescription>Best graded attempt, with every attempt listed.</CardDescription></CardHeader>
        <CardContent className="p-0">
          {exams.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No tests assigned to this batch yet.</p> : <ul className="divide-y">
            {exams.map(e => <li key={e.id} className="grid gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`${base}/exams/${e.id}`} className="block truncate font-medium hover:underline">{e.title}</Link>
                  <p className="text-xs text-muted-foreground">{titleCase(e.kind)} · out of {num(e.total_marks)}</p>
                </div>
                <p className="shrink-0 text-right tabular-nums">{e.best ? <><span className="font-semibold">{num(e.best.score)}</span><span className="text-xs text-muted-foreground"> ({num(e.best.percentage)}%)</span></> : <span className="text-sm text-muted-foreground">Not taken</span>}</p>
              </div>
              {e.attempts.length > 0 && <ul className="flex flex-wrap gap-2 text-xs">
                {e.attempts.map(t => <li key={t.id} className="flex items-center gap-1.5 rounded-md border px-2 py-1">
                  <span>#{t.attempt_number}</span>
                  <Pill value={t.status} tones={ATTEMPT_TONES} />
                  {t.score !== null && <span className="tabular-nums">{num(t.score)} · ✓{t.correct_count} ✗{t.wrong_count} –{t.unanswered_count}</span>}
                </li>)}
              </ul>}
            </li>)}
          </ul>}
        </CardContent>
      </Card>

      <Card className="min-w-0 gap-0 py-0">
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle>Attendance</CardTitle>
          <CardDescription>{attendance.present} present · {attendance.late} late · {attendance.absent} absent · {attendance.excused} excused</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {attendance.sessions.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No classes held yet.</p> : <ul className="max-h-[28rem] divide-y overflow-y-auto">
            {attendance.sessions.map(s => <li key={s.id}>
              <Link href={`${base}/classes/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{formatDate(s.starts_at, true)}{s.subjects ? ` · ${s.subjects.name}` : ""}</span>
                </span>
                <Pill value={s.attendance ?? "UNMARKED"} label={s.attendance ? undefined : "Not marked"} tones={ATTENDANCE_TONES} />
              </Link>
            </li>)}
          </ul>}
        </CardContent>
      </Card>
    </div>
  </>;
}

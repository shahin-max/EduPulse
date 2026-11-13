"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AlarmClock, ArrowRight, CalendarClock, ClipboardList, History, Loader2, Play, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { KIND_LABEL, studentApi, type AvailableExam } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, errorText, formatDate, PageHeader, Pill } from "@/components/admin/ui";

/** "16.00" -> "16". */
const n = (value: string | number) => String(Number(value));

const attemptHref = (id: number) => `/student/tests/attempt/${id}`;

/** Tests the student can take now or soon (GET /exams/available), with start and resume. */
export default function TestsPage() {
  const router = useRouter();
  const { withToken } = useAuth();
  const { data, error, reload } = useAdminData(studentApi.availableExams, "student-exams");
  const [confirm, setConfirm] = useState<AvailableExam | null>(null);
  const [starting, setStarting] = useState(false);
  // A student in two batches taking the same test chooses which batch the attempt counts for.
  const [batchId, setBatchId] = useState("");
  const ask = (exam: AvailableExam) => { setBatchId(exam.my_batches.length === 1 ? String(exam.my_batches[0].id) : ""); setConfirm(exam); };

  const open = data?.filter(e => e.window === "OPEN") ?? [];
  const upcoming = data?.filter(e => e.window === "UPCOMING") ?? [];

  async function start(exam: AvailableExam) {
    setStarting(true);
    try {
      const attempt = await withToken(token => studentApi.startAttempt(token, exam.id, exam.my_batches.length > 1 ? Number(batchId) : undefined));
      router.push(attemptHref(attempt.id));
    } catch (e) {
      // 409: an attempt is already running (e.g. started in another tab): offer to resume it instead.
      if (e instanceof ApiError && e.status === 409) {
        const fresh = await withToken(studentApi.availableExams).catch(() => null);
        const resumeId = fresh?.find(x => x.id === exam.id)?.in_progress_attempt_id;
        if (resumeId) return router.push(attemptHref(resumeId));
        reload();
      }
      toast.error(errorText(e, "Could not start the test."));
      setStarting(false);
      setConfirm(null);
    }
  }

  return <>
    <PageHeader title="Tests" description="Online tests for your batches. The timer starts as soon as you begin."
      actions={<Button variant="outline" asChild><Link href="/student/results"><History /> Past attempts</Link></Button>} />
    {error && <ErrorAlert message={error} onRetry={reload} />}
    {!data && !error && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>}

    {data && data.length === 0 && <Card><EmptyState icon={ClipboardList} title="No tests right now" description="When your teachers publish a test for your batch, it shows up here." /></Card>}

    {open.length > 0 && <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Open now</h2>
      <ul className="grid gap-4 md:grid-cols-2">{open.map(e => <li key={e.id} id={`exam-${e.id}`} className="scroll-mt-20"><ExamCard exam={e} onStart={() => ask(e)} /></li>)}</ul>
    </section>}
    {upcoming.length > 0 && <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
      <ul className="grid gap-4 md:grid-cols-2">{upcoming.map(e => <li key={e.id} id={`exam-${e.id}`} className="scroll-mt-20"><ExamCard exam={e} onStart={() => ask(e)} /></li>)}</ul>
    </section>}

    <AlertDialog open={!!confirm} onOpenChange={o => { if (!o && !starting) setConfirm(null); }}>
      <AlertDialogContent>
        {confirm && <>
          <AlertDialogHeader>
            <AlertDialogTitle>Start “{confirm.title}”?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ul className="grid list-disc gap-1.5 pl-5 text-left text-sm text-muted-foreground">
                <li>You have <strong>{confirm.duration_minutes} minutes</strong>{confirm.closes_at ? `, or until the test closes at ${formatDate(confirm.closes_at, true)} if that is sooner` : ""}.</li>
                <li>The timer keeps running if you leave the page or close the browser. When it reaches zero, your answers are submitted automatically.</li>
                <li>Each answer is saved the moment you choose it.</li>
                {Number(confirm.negative_marks_per_wrong) > 0
                  ? <li>Wrong answers cost <strong>{n(confirm.negative_marks_per_wrong)} marks</strong>. Leave a question blank if you are unsure.</li>
                  : <li>There is no negative marking.</li>}
                <li>This uses 1 of your {confirm.attempts_remaining} remaining {confirm.attempts_remaining === 1 ? "attempt" : "attempts"}.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm.my_batches.length > 1 && <div className="grid gap-2">
            <label htmlFor="test-batch" className="text-sm font-medium">Which batch is this attempt for?</label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger id="test-batch" className="w-full"><SelectValue placeholder="Choose your batch" /></SelectTrigger>
              <SelectContent>{confirm.my_batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Your score is ranked with that batch.</p>
          </div>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={starting}>Not now</AlertDialogCancel>
            <AlertDialogAction disabled={starting || (confirm.my_batches.length > 1 && !batchId)} onClick={ev => { ev.preventDefault(); void start(confirm); }}>
              {starting ? <Loader2 className="animate-spin" /> : <Play />}Start test
            </AlertDialogAction>
          </AlertDialogFooter>
        </>}
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function ExamCard({ exam: e, onStart }: { exam: AvailableExam; onStart: () => void }) {
  const isOpen = e.window === "OPEN";
  const negative = Number(e.negative_marks_per_wrong) > 0;
  return <Card className="h-full gap-4">
    <CardHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Pill value={e.kind} label={KIND_LABEL[e.kind]} tones={{ DAILY_PRACTICE: "gray", CHAPTER_TEST: "blue", MOCK_TEST: "violet", OMR_PRACTICE: "amber" }} />
        {e.in_progress_attempt_id && <Pill value="RUNNING" label="In progress" tones={{ RUNNING: "amber" }} />}
      </div>
      <CardTitle className="text-lg leading-snug">{e.title}</CardTitle>
      <p className="text-sm text-muted-foreground">{e.subjects?.name ? `${e.subjects.name} · ` : ""}{e.courses.title}</p>
    </CardHeader>
    <CardContent className="grid gap-3 text-sm">
      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
        <div><dt className="text-xs text-muted-foreground">Questions</dt><dd className="font-semibold tabular-nums">{e._count.exam_questions}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Time</dt><dd className="font-semibold tabular-nums">{e.duration_minutes} min</dd></div>
        <div><dt className="text-xs text-muted-foreground">Marks</dt><dd className="font-semibold tabular-nums">{n(e.total_marks)}</dd></div>
      </dl>
      {negative && <p className="text-xs text-amber-700 dark:text-amber-400">Negative marking: −{n(e.negative_marks_per_wrong)} for each wrong answer.</p>}
      <p className="flex items-center gap-2 text-muted-foreground">
        <CalendarClock className="size-4 shrink-0" />
        {isOpen
          ? e.closes_at ? `Closes ${formatDate(e.closes_at, true)}` : "Open, no closing time"
          : `Opens ${formatDate(e.opens_at, true)}`}
      </p>
      <p className="flex items-center gap-2 text-muted-foreground">
        <RotateCcw className="size-4 shrink-0" />
        {e.attempts_used} of {e.max_attempts} {e.max_attempts === 1 ? "attempt" : "attempts"} used
      </p>
    </CardContent>
    <CardFooter className="mt-auto flex flex-wrap gap-2">
      {e.in_progress_attempt_id
        ? <Button asChild><Link href={attemptHref(e.in_progress_attempt_id)}><AlarmClock /> Resume test</Link></Button>
        : isOpen && e.attempts_remaining > 0
          ? <Button onClick={onStart}><Play /> Start test</Button>
          : isOpen
            ? <p className="text-sm text-muted-foreground">You have used all your attempts.</p>
            : <p className="text-sm text-muted-foreground">You can start when it opens.</p>}
      {e.attempts_used > 0 && <Button variant="ghost" asChild><Link href="/student/results">My results <ArrowRight /></Link></Button>}
    </CardFooter>
  </Card>;
}

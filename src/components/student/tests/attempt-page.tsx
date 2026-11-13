"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Bookmark, Check, CheckCircle2, Clock, Eraser, Grid3x3, History, Loader2, Send, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { KIND_LABEL, studentApi, type Attempt, type AttemptQuestion } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, errorText, formatDate, Pill } from "@/components/admin/ui";
import { LeaderboardButton } from "./leaderboard";

const n = (value: string | number | null | undefined) => value === null || value === undefined ? "—" : String(Number(value));
const STATUS_TONES = { IN_PROGRESS: "amber", SUBMITTED: "green", AUTO_SUBMITTED: "blue", INVALIDATED: "red" } as const;
const STATUS_LABEL = { IN_PROGRESS: "In progress", SUBMITTED: "Submitted", AUTO_SUBMITTED: "Submitted when time ran out", INVALIDATED: "Cancelled by teacher" } as const;

/** One attempt: the test itself while it runs, the result afterwards. */
export default function AttemptPage({ attemptId }: { attemptId: number }) {
  const { data, error, reload, setData } = useAdminData(token => studentApi.attempt(token, attemptId), `attempt:${attemptId}`);

  const back = <Link href="/student/tests" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Tests</Link>;
  if (error) return <>{back}<ErrorAlert title="Test not available" message={error} onRetry={reload} /></>;
  if (!data) return <div className="grid gap-4"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div>;
  if (data.status === "IN_PROGRESS") return <TestRunner key={data.id} attempt={data} onFinished={setData} />;
  return <>{back}<AttemptResult attempt={data} /></>;
}

// ---------------------------------------------------------------- taking the test

type Answer = { selected: number | null; marked: boolean };

function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function TestRunner({ attempt, onFinished }: { attempt: Attempt; onFinished: (attempt: Attempt) => void }) {
  const { withToken } = useAuth();
  const questions = attempt.questions;
  const [answers, setAnswers] = useState<Record<number, Answer>>(() =>
    Object.fromEntries(questions.map(q => [q.question_id, { selected: q.selected_option_id, marked: q.is_marked_for_review }])));
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The deadline comes from the server's seconds_remaining (not expires_at) so a wrong device clock
  // cannot shorten or stretch the test; every save re-syncs it. Set when the countdown starts (0 = not yet).
  const deadline = useRef(0);
  const [remaining, setRemaining] = useState(attempt.seconds_remaining);
  const finishing = useRef(false);
  // Saves for one question run one after another, so a quick change of mind is stored in order.
  const queue = useRef(new Map<number, Promise<unknown>>());

  /** Submits once. On "already submitted" or "time is up" the finished attempt is loaded instead. */
  const finish = useCallback(async (auto: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    setSubmitting(true);
    await Promise.allSettled(queue.current.values());
    try {
      const done = await withToken(token => studentApi.submitAttempt(token, attempt.id));
      toast.success(auto ? "Time is up. Your answers were submitted." : "Test submitted");
      onFinished(done);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const done = await withToken(token => studentApi.attempt(token, attempt.id)).catch(() => null);
        if (done && done.status !== "IN_PROGRESS") return onFinished(done);
      }
      toast.error(errorText(e, "Could not submit the test. Check your connection and try again."));
      finishing.current = false;
      setSubmitting(false);
    }
  }, [withToken, attempt.id, onFinished]);

  // Countdown; at zero the test is submitted once (the server would also close it on the next request).
  useEffect(() => {
    if (!deadline.current) deadline.current = Date.now() + attempt.seconds_remaining * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) void finish(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [finish, attempt.seconds_remaining]);

  // Leaving the page does not stop the timer, so warn before closing or reloading.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (!finishing.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function save(questionId: number, next: Answer, input: { selectedOptionId?: number | null; isMarkedForReview?: boolean }) {
    if (finishing.current) return;
    const previous = answers[questionId];
    setAnswers(a => ({ ...a, [questionId]: next }));
    setSaving(s => s + 1);
    const run = (queue.current.get(questionId) ?? Promise.resolve()).then(async () => {
      try {
        const saved = await withToken(token => studentApi.saveAnswer(token, attempt.id, questionId, input));
        deadline.current = Date.now() + saved.seconds_remaining * 1000;
      } catch (e) {
        setAnswers(a => ({ ...a, [questionId]: previous }));
        if (e instanceof ApiError && e.status === 409) {
          // Time ran out or the attempt was closed elsewhere: show the finished attempt.
          finishing.current = true;
          const done = await withToken(token => studentApi.attempt(token, attempt.id)).catch(() => null);
          toast.error(e.message);
          if (done) onFinished(done);
        } else toast.error(errorText(e, "That answer was not saved. Please choose it again."));
      } finally {
        setSaving(s => s - 1);
      }
    });
    queue.current.set(questionId, run);
  }

  const q = questions[index];
  const answer = answers[q.question_id];
  const answered = questions.filter(x => answers[x.question_id].selected !== null).length;
  const marked = questions.filter(x => answers[x.question_id].marked).length;
  const urgent = remaining <= 60;
  const low = remaining <= 300;

  const palette = <QuestionPalette questions={questions} answers={answers} current={index} onPick={i => { setIndex(i); setPaletteOpen(false); }} />;

  return <>
    <div className="sticky top-14 z-[5] -mx-4 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{attempt.exam.title}</p>
        <p className="text-xs text-muted-foreground">{KIND_LABEL[attempt.exam.kind]} · attempt {attempt.attempt_number} · {answered}/{questions.length} answered
          <span className="ml-2" aria-live="polite">{saving > 0 ? "Saving…" : "All answers saved"}</span>
        </p>
      </div>
      <div role="timer" aria-label={`Time left ${formatClock(remaining)}`}
        className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-lg font-semibold tabular-nums",
          urgent ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300" : low ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "")}>
        <Clock className="size-4" />{formatClock(remaining)}
      </div>
      <Button onClick={() => setConfirming(true)} disabled={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <Send />}Submit</Button>
    </div>

    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Question {index + 1} of {questions.length}</CardTitle>
            <span className="text-xs text-muted-foreground">+{n(q.marks)} marks{Number(q.negative_marks) > 0 ? ` · −${n(q.negative_marks)} if wrong` : ""}</span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <p className="text-base leading-relaxed break-words whitespace-pre-wrap">{q.question_text}</p>
          <div role="radiogroup" aria-label={`Answers for question ${index + 1}`} className="grid gap-2">
            {q.options.map(o => {
              const chosen = answer.selected === o.id;
              return <button key={o.id} type="button" role="radio" aria-checked={chosen} disabled={submitting}
                onClick={() => { if (!chosen) save(q.question_id, { ...answer, selected: o.id }, { selectedOptionId: o.id }); }}
                className={cn("flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-4",
                  chosen && "border-primary bg-primary/10 hover:bg-primary/10")}>
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", chosen && "border-primary bg-primary text-primary-foreground")}>{o.option_label}</span>
                <span className="min-w-0 flex-1 pt-0.5 break-words whitespace-pre-wrap">{o.option_text}</span>
              </button>;
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={answer.marked ? "secondary" : "outline"} size="sm" disabled={submitting} aria-pressed={answer.marked}
              onClick={() => save(q.question_id, { ...answer, marked: !answer.marked }, { isMarkedForReview: !answer.marked })}>
              <Bookmark className={cn(answer.marked && "fill-current")} />{answer.marked ? "Marked for review" : "Mark for review"}
            </Button>
            {answer.selected !== null && <Button variant="ghost" size="sm" disabled={submitting}
              onClick={() => save(q.question_id, { ...answer, selected: null }, { selectedOptionId: null })}><Eraser /> Clear answer</Button>}
          </div>
          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIndex(i => i - 1)} disabled={index === 0}><ArrowLeft /> Previous</Button>
            <Button variant="outline" className="lg:hidden" onClick={() => setPaletteOpen(true)}><Grid3x3 /> {index + 1}/{questions.length}</Button>
            {index < questions.length - 1
              ? <Button onClick={() => setIndex(i => i + 1)}>Next <ArrowRight /></Button>
              : <Button onClick={() => setConfirming(true)} disabled={submitting}><Send /> Finish</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="hidden h-fit lg:sticky lg:top-36 lg:flex">
        <CardHeader><CardTitle className="text-base">Questions</CardTitle><CardDescription>{answered} answered · {marked} marked</CardDescription></CardHeader>
        <CardContent>{palette}</CardContent>
      </Card>
    </div>

    <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
      <SheetContent side="bottom" className="max-h-[80svh] gap-0 overflow-y-auto">
        <SheetHeader><SheetTitle>Questions</SheetTitle><SheetDescription>{answered} answered · {marked} marked for review</SheetDescription></SheetHeader>
        <div className="px-4 pb-6">{palette}</div>
      </SheetContent>
    </Sheet>

    <AlertDialog open={confirming} onOpenChange={o => { if (!submitting) setConfirming(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit your test?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                <div><dt className="text-xs">Answered</dt><dd className="text-lg font-semibold text-foreground tabular-nums">{answered}</dd></div>
                <div><dt className="text-xs">Not answered</dt><dd className="text-lg font-semibold text-foreground tabular-nums">{questions.length - answered}</dd></div>
                <div><dt className="text-xs">Marked</dt><dd className="text-lg font-semibold text-foreground tabular-nums">{marked}</dd></div>
              </dl>
              <p>You still have {formatClock(remaining)} left. After submitting you cannot change your answers.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Keep working</AlertDialogCancel>
          <AlertDialogAction disabled={submitting} onClick={e => { e.preventDefault(); void finish(false); }}>
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}Submit test
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function QuestionPalette({ questions, answers, current, onPick }: {
  questions: AttemptQuestion[]; answers: Record<number, Answer>; current: number; onPick: (index: number) => void;
}) {
  return <div className="grid gap-4">
    <ol className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
      {questions.map((q, i) => {
        const a = answers[q.question_id];
        const state = a.marked ? "marked" : a.selected !== null ? "answered" : "empty";
        return <li key={q.question_id}>
          <button type="button" onClick={() => onPick(i)} aria-current={i === current ? "step" : undefined}
            aria-label={`Question ${i + 1}: ${state === "marked" ? "marked for review" : state === "answered" ? "answered" : "not answered"}`}
            className={cn("relative flex aspect-square w-full items-center justify-center rounded-md border text-sm font-medium tabular-nums transition-colors",
              state === "answered" && "border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
              state === "marked" && "border-violet-500/50 bg-violet-500/15 text-violet-800 dark:text-violet-200",
              state === "empty" && "hover:bg-muted",
              i === current && "ring-2 ring-primary ring-offset-1 ring-offset-background")}>
            {i + 1}
            {state === "marked" && a.selected !== null && <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
          </button>
        </li>;
      })}
    </ol>
    <ul className="grid gap-1.5 text-xs text-muted-foreground">
      <li className="flex items-center gap-2"><span className="size-3 rounded-sm border border-emerald-500/50 bg-emerald-500/15" /> Answered</li>
      <li className="flex items-center gap-2"><span className="size-3 rounded-sm border border-violet-500/50 bg-violet-500/15" /> Marked for review (dot: answered)</li>
      <li className="flex items-center gap-2"><span className="size-3 rounded-sm border" /> Not answered</li>
    </ul>
  </div>;
}

// ---------------------------------------------------------------- after the test

function AttemptResult({ attempt: a }: { attempt: Attempt }) {
  const tiles = [
    { label: "Score", value: `${n(a.score)} / ${n(a.max_score)}` },
    { label: "Percentage", value: a.percentage == null ? "—" : `${n(a.percentage)}%` },
    { label: "Correct", value: a.correct_count ?? "—", tone: "text-emerald-700 dark:text-emerald-400" },
    { label: "Wrong", value: a.wrong_count ?? "—", tone: "text-red-700 dark:text-red-400" },
    { label: "Not answered", value: a.unanswered_count ?? "—", tone: "text-muted-foreground" },
  ];
  return <>
    <Card>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill value={a.status} label={STATUS_LABEL[a.status]} tones={STATUS_TONES} />
          <span className="text-xs text-muted-foreground">{KIND_LABEL[a.exam.kind]} · attempt {a.attempt_number}{a.submitted_at ? ` · ${formatDate(a.submitted_at, true)}` : ""}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{a.exam.title}</h1>
        {a.status === "INVALIDATED"
          ? <p className="text-sm text-muted-foreground">Your teacher cancelled this attempt, so it does not count. It does not use up one of your attempts.</p>
          : a.results_visible
            ? <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {tiles.map(t => <div key={t.label} className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{t.label}</dt>
                <dd className={cn("text-xl font-semibold tabular-nums", t.tone)}>{t.value}</dd>
              </div>)}
            </dl>
            : <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              Your answers are submitted. Your score will appear here once your teacher releases the results.</p>}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/student/tests"><ArrowLeft /> Tests</Link></Button>
          <Button asChild variant="outline"><Link href="/student/results"><History /> My results</Link></Button>
          {a.results_visible && <LeaderboardButton examId={a.exam.id} title={a.exam.title} />}
        </div>
      </CardContent>
    </Card>

    {a.review_visible
      ? <section className="grid gap-4">
        <h2 className="text-lg font-semibold">Answer review</h2>
        <ol className="grid gap-4">{a.questions.map((q, i) => <ReviewQuestion key={q.question_id} question={q} number={i + 1} />)}</ol>
      </section>
      : a.results_visible && a.status !== "INVALIDATED" && <p className="text-sm text-muted-foreground">The correct answers for this test are not available to review yet.</p>}
  </>;
}

function ReviewQuestion({ question: q, number }: { question: AttemptQuestion; number: number }) {
  const answered = q.selected_option_id !== null;
  const verdict = !answered ? { label: "Not answered", tone: "gray" as const } : q.is_correct ? { label: "Correct", tone: "green" as const } : { label: "Wrong", tone: "red" as const };
  return <li>
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Question {number}</CardTitle>
          <span className="flex items-center gap-2">
            <Pill value={verdict.label} tones={{ [verdict.label]: verdict.tone }} />
            <span className="text-sm tabular-nums text-muted-foreground">{q.marks_awarded !== undefined ? `${Number(q.marks_awarded) > 0 ? "+" : ""}${n(q.marks_awarded)}` : ""} / {n(q.marks)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="break-words whitespace-pre-wrap">{q.question_text}</p>
        <ul className="grid gap-2">
          {q.options.map(o => {
            const chosen = q.selected_option_id === o.id;
            return <li key={o.id} className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm",
              o.is_correct && "border-emerald-500/60 bg-emerald-500/10",
              chosen && !o.is_correct && "border-red-500/60 bg-red-500/10")}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">{o.option_label}</span>
              <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">{o.option_text}</span>
              {o.is_correct && <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><Check className="size-3.5" /> {chosen ? "Your answer · Correct" : "Correct"}</span>}
              {chosen && !o.is_correct && <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400"><X className="size-3.5" /> Your answer</span>}
            </li>;
          })}
        </ul>
        {q.explanation && <div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="mb-1 text-xs font-medium text-muted-foreground">Explanation</p><p className="break-words whitespace-pre-wrap">{q.explanation}</p></div>}
      </CardContent>
    </Card>
  </li>;
}

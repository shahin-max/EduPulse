"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CircleCheck, CircleX, Eye, Loader2, Printer, Trophy } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import {
  ATTEMPT_STATUSES, attemptsApi, examsApi, type AttemptStatus, type ExamAttempt, type ExamDetail, type LeaderboardEntry,
} from "@/lib/staff-exams-api";
import { EmptyState, ErrorAlert, errorText, LoadingRows, Pager } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ALL, AttemptStatusPill, formatDateTime, formatDuration, formatMarks, POLICY_HELP, SegmentedTabs, Stat } from "./exam-shared";

type View = "ranks" | "attempts";

export function ExamResultsPanel({ exam }: { exam: ExamDetail }) {
  const [view, setView] = useState<View>("ranks");
  const [batchId, setBatchId] = useState<number | undefined>();
  const [passPercent, setPassPercent] = useState("33");
  const [viewing, setViewing] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const batchCode = new Map(exam.exam_batches.map(b => [b.batches.id, b.batches.code]));

  const lbKey = JSON.stringify({ id: exam.id, batchId, version });
  const leaderboard = useAdminData(token => examsApi.leaderboard(token, exam.id, { batchId, limit: 1000 }), lbKey);
  const entries = leaderboard.data?.entries ?? [];
  const refresh = () => setVersion(v => v + 1);

  return <div className="grid gap-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <SegmentedTabs label="Results views" value={view} onChange={setView} tabs={[{ value: "ranks", label: "Rank list" }, { value: "attempts", label: "All attempts" }]} />
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select value={batchId ? String(batchId) : ALL} onValueChange={v => setBatchId(v === ALL ? undefined : Number(v))}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by batch"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All batches</SelectItem>
            {exam.exam_batches.map(({ batches: b }) => <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</SelectItem>)}
          </SelectContent>
        </Select>
        {view === "ranks" && <Button variant="outline" onClick={() => window.print()} disabled={!entries.length}><Printer /> Print</Button>}
      </div>
    </div>

    <Summary entries={entries} attempts={exam._count.exam_attempts} totalMarks={exam.total_marks} passPercent={passPercent} setPassPercent={setPassPercent} />

    {view === "ranks"
      ? <RankList exam={exam} batchId={batchId} batchCode={batchCode} entries={entries} loading={leaderboard.loading} error={leaderboard.error} reload={leaderboard.reload}
        passPercent={Number(passPercent)} onView={setViewing} />
      : <AttemptsList exam={exam} batchId={batchId} batchCode={batchCode} version={version} onView={setViewing} onChanged={refresh} />}

    {viewing !== null && <AttemptDialog attemptId={viewing} onClose={() => setViewing(null)} />}
  </div>;
}

/** Figures over the ranked attempts (one per student, by the exam's ranking policy). */
function Summary({ entries, attempts, totalMarks, passPercent, setPassPercent }: {
  entries: LeaderboardEntry[]; attempts: number; totalMarks: string; passPercent: string; setPassPercent: (v: string) => void;
}) {
  const scores = entries.map(e => Number(e.score ?? 0));
  const percents = entries.map(e => Number(e.percentage ?? 0));
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const avgPct = percents.length ? percents.reduce((a, b) => a + b, 0) / percents.length : null;
  const pass = Number(passPercent);
  const passValid = Number.isFinite(pass) && pass >= 0 && pass <= 100;
  const passed = passValid ? percents.filter(p => p >= pass).length : 0;

  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
    <Stat label="Students ranked" value={entries.length} hint={`${attempts} attempts in total`} />
    <Stat label="Average score" value={avg === null ? "—" : formatMarks(avg)} hint={avgPct === null ? `out of ${formatMarks(totalMarks)}` : `${formatMarks(avgPct)}% of the maximum`} />
    <Stat label="Highest" value={scores.length ? formatMarks(Math.max(...scores)) : "—"} hint={`out of ${formatMarks(totalMarks)}`} />
    <Stat label="Lowest" value={scores.length ? formatMarks(Math.min(...scores)) : "—"} hint="Scores can be negative" />
    <div className="col-span-2 rounded-lg border p-3 lg:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Pass / fail</p>
        <div className="flex items-center gap-1 print:hidden">
          <Label htmlFor="pass-mark" className="text-xs font-normal text-muted-foreground">Pass at</Label>
          <Input id="pass-mark" value={passPercent} onChange={e => setPassPercent(e.target.value)} inputMode="decimal" className="h-7 w-14 px-1.5 text-xs" aria-label="Pass percentage" />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        <span className="text-emerald-700 dark:text-emerald-300">{entries.length && passValid ? passed : "—"}</span>
        {" / "}
        <span className="text-red-700 dark:text-red-300">{entries.length && passValid ? entries.length - passed : "—"}</span>
      </p>
      <p className="text-xs text-muted-foreground">Exams have no pass mark; this uses {passValid ? `${pass}%` : "a valid percentage"}.</p>
    </div>
  </div>;
}

function RankList({ exam, batchId, batchCode, entries, loading, error, reload, passPercent, onView }: {
  exam: ExamDetail; batchId?: number; batchCode: Map<number, string>; entries: LeaderboardEntry[]; loading: boolean; error: string; reload: () => void;
  passPercent: number; onView: (attemptId: number) => void;
}) {
  const batch = exam.exam_batches.find(b => b.batches.id === batchId)?.batches;
  return <Card className="gap-0 py-0 print:border-0 print:shadow-none">
    <div className="border-b p-4">
      <p className="font-medium">Rank list{batch && ` · ${batch.name}`}</p>
      <p className="text-xs text-muted-foreground">{POLICY_HELP[exam.ranking_attempt_policy]}. Ties go to whoever submitted first. In-progress and invalidated attempts are not ranked.</p>
      <p className="hidden text-xs text-muted-foreground print:block">Printed {formatDateTime(new Date().toISOString())}</p>
    </div>
    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {loading && !entries.length && <LoadingRows rows={4} />}
      {!loading && !error && !entries.length && <EmptyState icon={Trophy} title="No submitted attempts yet" description="Students appear here once they submit (or the timer submits for them)." />}
      {entries.length > 0 && <Table className={loading ? "opacity-60" : undefined}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 pl-4">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden sm:table-cell">Batch</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="hidden text-right sm:table-cell">%</TableHead>
            <TableHead className="hidden md:table-cell">Submitted</TableHead>
            <TableHead className="w-10 pr-4 print:hidden"><span className="sr-only">View</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(e => {
            const failed = Number.isFinite(passPercent) && Number(e.percentage ?? 0) < passPercent;
            return <TableRow key={e.student_user_id} className="break-inside-avoid">
              <TableCell className="pl-4 font-semibold tabular-nums">{e.rank}</TableCell>
              <TableCell className="max-w-[10rem] whitespace-normal sm:max-w-none">
                <span className="font-medium break-words">{e.full_name}</span>
                <span className="block text-xs text-muted-foreground sm:hidden">{batchCode.get(e.batch_id) ?? ""} · {formatMarks(e.percentage)}%</span>
              </TableCell>
              <TableCell className="hidden font-mono text-xs sm:table-cell">{batchCode.get(e.batch_id) ?? e.batch_id}</TableCell>
              <TableCell className={failed ? "text-right text-red-700 tabular-nums dark:text-red-300" : "text-right tabular-nums"}>{formatMarks(e.score)}<span className="text-muted-foreground">/{formatMarks(e.max_score)}</span></TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatMarks(e.percentage)}</TableCell>
              <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{formatDateTime(e.submitted_at)}</TableCell>
              <TableCell className="pr-4 print:hidden">
                {e.attempt_id !== undefined && <Button size="icon" variant="ghost" className="size-8" onClick={() => onView(e.attempt_id!)} aria-label={`View ${e.full_name}'s answers`}><Eye /></Button>}
              </TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table>}
    </CardContent>
  </Card>;
}

function AttemptsList({ exam, batchId, batchCode, version, onView, onChanged }: {
  exam: ExamDetail; batchId?: number; batchCode: Map<number, string>; version: number; onView: (id: number) => void; onChanged: () => void;
}) {
  const [status, setStatus] = useState<AttemptStatus | undefined>();
  const [page, setPage] = useState(1);
  const [invalidating, setInvalidating] = useState<ExamAttempt | null>(null);
  const params = { batchId, status, page, limit: 20 };
  const { data, error, loading, reload } = useAdminData(token => examsApi.attempts(token, exam.id, params), JSON.stringify({ ...params, version, id: exam.id }));

  const statusLabel = (s: AttemptStatus) => s === "AUTO_SUBMITTED" ? "Auto-submitted" : s === "IN_PROGRESS" ? "In progress" : s[0] + s.slice(1).toLowerCase();

  return <Card className="gap-0 py-0 print:hidden">
    <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Every attempt, newest first. Invalidate an attempt (e.g. malpractice) to remove it from rankings and give the attempt back.</p>
      <Select value={status ?? ALL} onValueChange={v => { setStatus(v === ALL ? undefined : v as AttemptStatus); setPage(1); }}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {ATTEMPT_STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows rows={4} />}
      {data && data.data.length === 0 && <EmptyState icon={Trophy} title="No attempts" description={status || batchId ? "None match these filters." : "Nobody has attempted this exam yet."} />}
      {data && data.data.length > 0 && <div className={loading ? "opacity-60" : undefined}>
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Student</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="hidden text-center lg:table-cell">✓ / ✗ / –</TableHead>
              <TableHead className="hidden xl:table-cell">Time taken</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map(a => <TableRow key={a.id}>
              <TableCell className="pl-4">
                <p className="font-medium">{a.enrollments.student_profiles.users.full_name}</p>
                <p className="text-xs text-muted-foreground">{a.enrollments.student_profiles.admission_number ?? "No admission no."} · attempt {a.attempt_number} · {formatDateTime(a.started_at)}</p>
              </TableCell>
              <TableCell className="font-mono text-xs">{a.exam_batches.batches.code ?? batchCode.get(a.batch_id)}</TableCell>
              <TableCell><AttemptStatusPill status={a.status} /></TableCell>
              <TableCell className="text-right tabular-nums">{a.score === null ? "—" : <>{formatMarks(a.score)}<span className="text-muted-foreground">/{formatMarks(a.max_score)}</span></>}</TableCell>
              <TableCell className="hidden text-center tabular-nums lg:table-cell">{a.correct_count} / {a.wrong_count} / {a.unanswered_count}</TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDuration(a.started_at, a.submitted_at)}</TableCell>
              <TableCell className="pr-4"><AttemptActions attempt={a} onView={onView} onInvalidate={setInvalidating} /></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
        <ul className="divide-y md:hidden">
          {data.data.map(a => <li key={a.id} className="grid gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{a.enrollments.student_profiles.users.full_name}</p>
                <p className="text-xs text-muted-foreground">{a.exam_batches.batches.code} · attempt {a.attempt_number}</p>
              </div>
              <AttemptStatusPill status={a.status} />
            </div>
            <p className="text-sm tabular-nums">
              {a.score === null ? "Not graded" : <>Score <strong>{formatMarks(a.score)}</strong>/{formatMarks(a.max_score)}</>}
              <span className="text-muted-foreground"> · ✓{a.correct_count} ✗{a.wrong_count} –{a.unanswered_count} · {formatDuration(a.started_at, a.submitted_at)}</span>
            </p>
            <AttemptActions attempt={a} onView={onView} onInvalidate={setInvalidating} labels />
          </li>)}
        </ul>
      </div>}
    </CardContent>
    {data && data.meta.totalPages > 1 && <div className="border-t p-4"><Pager meta={data.meta} onPage={setPage} /></div>}
    {invalidating && <InvalidateDialog attempt={invalidating} onClose={() => setInvalidating(null)} onDone={() => { reload(); onChanged(); }} />}
  </Card>;
}

function AttemptActions({ attempt, onView, onInvalidate, labels }: { attempt: ExamAttempt; onView: (id: number) => void; onInvalidate: (a: ExamAttempt) => void; labels?: boolean }) {
  const name = attempt.enrollments.student_profiles.users.full_name;
  return <div className={labels ? "grid grid-cols-2 gap-2" : "flex justify-end gap-1"}>
    <Button size={labels ? "sm" : "icon"} variant={labels ? "outline" : "ghost"} className={labels ? undefined : "size-8"} onClick={() => onView(attempt.id)} aria-label={`View ${name}'s answers`}><Eye />{labels && "Answers"}</Button>
    <Button size={labels ? "sm" : "icon"} variant={labels ? "outline" : "ghost"} disabled={attempt.status === "INVALIDATED"} onClick={() => onInvalidate(attempt)}
      className={labels ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"} aria-label={`Invalidate ${name}'s attempt`}>
      <Ban />{labels && "Invalidate"}
    </Button>
  </div>;
}

function InvalidateDialog({ attempt, onClose, onDone }: { attempt: ExamAttempt; onClose: () => void; onDone: () => void }) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = attempt.enrollments.student_profiles.users.full_name;

  async function invalidate() {
    setBusy(true);
    setError("");
    try {
      await withToken(token => attemptsApi.invalidate(token, attempt.id));
      toast.success(`${name}'s attempt ${attempt.attempt_number} invalidated`);
      onDone();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not invalidate the attempt."));
    } finally {
      setBusy(false);
    }
  }

  return <AlertDialog open onOpenChange={open => { if (!open) onClose(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Invalidate {name}’s attempt {attempt.attempt_number}?</AlertDialogTitle>
        <AlertDialogDescription>
          The attempt no longer counts towards the attempt limit or the rank list, so the student may attempt again if the exam is still open.
          This cannot be undone, and no reason is recorded by the system; note it elsewhere if needed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {error && <ErrorAlert message={error} title="Not invalidated" />}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void invalidate(); }} className="bg-destructive text-white hover:bg-destructive/90">
          {busy && <Loader2 className="animate-spin" />} Invalidate
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

/** One attempt with every question, the student's choice and the correct option. */
function AttemptDialog({ attemptId, onClose }: { attemptId: number; onClose: () => void }) {
  const { data: a, error, loading, reload } = useAdminData(token => attemptsApi.get(token, attemptId), `attempt:${attemptId}`);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{a ? `Attempt ${a.attempt_number}` : "Attempt"}</DialogTitle>
        <DialogDescription>{a ? `${a.exam.title} · started ${formatDateTime(a.started_at)}${a.submitted_at ? ` · submitted ${formatDateTime(a.submitted_at)}` : ""}` : "Loading…"}</DialogDescription>
      </DialogHeader>
      {error && <ErrorAlert message={error} onRetry={reload} />}
      {!a && loading && <LoadingRows rows={4} />}
      {a && <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <AttemptStatusPill status={a.status} />
          {a.score !== undefined && a.score !== null && <Badge variant="outline">Score {formatMarks(a.score)}/{formatMarks(a.max_score)} ({formatMarks(a.percentage)}%)</Badge>}
          {a.correct_count !== undefined && <span className="text-muted-foreground">✓ {a.correct_count} · ✗ {a.wrong_count} · – {a.unanswered_count}</span>}
          <span className="text-muted-foreground">Time {formatDuration(a.started_at, a.submitted_at)}</span>
        </div>
        <ol className="grid gap-3">
          {a.questions.map((q, i) => <li key={q.question_id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium break-words whitespace-pre-line"><span className="text-muted-foreground">{i + 1}. </span>{q.question_text}</p>
              <span className={q.is_correct === true ? "shrink-0 text-sm font-medium text-emerald-700 tabular-nums dark:text-emerald-300" : q.is_correct === false ? "shrink-0 text-sm font-medium text-red-700 tabular-nums dark:text-red-300" : "shrink-0 text-sm text-muted-foreground tabular-nums"}>
                {q.marks_awarded !== undefined && q.marks_awarded !== null ? formatMarks(q.marks_awarded) : q.selected_option_id === null ? "0" : "—"}
              </span>
            </div>
            <ul className="mt-2 grid gap-1 text-sm">
              {q.options.map(o => {
                const chosen = o.id === q.selected_option_id;
                return <li key={o.id} className={o.is_correct ? "flex gap-1.5 text-emerald-700 dark:text-emerald-300" : chosen ? "flex gap-1.5 text-red-700 dark:text-red-300" : "flex gap-1.5 text-muted-foreground"}>
                  <span className="shrink-0">{o.option_label}.</span>
                  <span className="min-w-0 break-words">{o.option_text}</span>
                  {chosen && (o.is_correct ? <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-label="Chosen, correct" /> : <CircleX className="mt-0.5 size-3.5 shrink-0" aria-label="Chosen, wrong" />)}
                  {chosen && <span className="shrink-0 text-xs">(chosen)</span>}
                </li>;
              })}
            </ul>
            {q.selected_option_id === null && <p className="mt-1 text-xs text-muted-foreground">Not answered{q.is_marked_for_review && " · marked for review"}</p>}
            {q.explanation && <p className="mt-2 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{q.explanation}</p>}
          </li>)}
        </ol>
      </div>}
    </DialogContent>
  </Dialog>;
}

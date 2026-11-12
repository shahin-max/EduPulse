"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, Globe, Loader2, Lock, RotateCcw, Save, Trash2, Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { examsApi, type Exam, type ExamDetail as ExamDetailData, type ExamStatus } from "@/lib/staff-exams-api";
import { EmptyState, ErrorAlert, errorText } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { usePortal } from "@/components/portal/portal-shell";
import { batchLabel, useStaffBatches } from "@/components/staff/use-staff";
import { ExamStatusPill, formatDateTime, formatMarks, KIND_LABEL, SegmentedTabs, STATUS_HELP } from "./exam-shared";
import { ExamFormFields, examFormToInput, examToForm, validateExamForm, type ExamFormState } from "./exam-form";
import { ExamQuestionsPanel } from "./exam-questions";
import { ExamResultsPanel } from "./exam-results";

type Tab = "questions" | "batches" | "settings" | "results";

/** One exam: questions, batches, settings, publishing and results. Shared by both portals. */
export default function ExamDetail({ id }: { id: number }) {
  const { base } = usePortal();
  const { data: exam, error, loading, reload, setData } = useAdminData(token => examsApi.get(token, id), `exam:${id}`);
  const [tab, setTab] = useState<Tab>("questions");
  const [tabChosen, setTabChosen] = useState(false);

  // Exams that already have attempts open on Results the first time.
  const activeTab: Tab = !tabChosen && exam && exam._count.exam_attempts > 0 ? "results" : tab;
  const chooseTab = (t: Tab) => { setTab(t); setTabChosen(true); };
  /** PATCH responses carry no questions; keep the ones we have. */
  const mergeExam = (updated: Exam) => setData(current => current ? { ...current, ...updated } : current);

  return <>
    <div className="print:hidden">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/exams`}><ArrowLeft /> All exams</Link></Button>
    </div>

    {error && <ErrorAlert message={error} onRetry={reload} title={exam ? "Could not refresh the exam" : "Could not load the exam"} />}
    {!exam && loading && <div className="grid gap-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-40 w-full" /></div>}

    {exam && <>
      <ExamHeader exam={exam} onChanged={mergeExam} reload={reload} />
      <div className="print:hidden">
        <SegmentedTabs label="Exam sections" value={activeTab} onChange={chooseTab} tabs={[
          { value: "questions", label: <>Questions <Badge variant="secondary" className="px-1.5">{exam._count.exam_questions}</Badge></> },
          { value: "batches", label: <>Batches <Badge variant="secondary" className="px-1.5">{exam.exam_batches.length}</Badge></> },
          { value: "settings", label: "Settings" },
          { value: "results", label: <>Results <Badge variant="secondary" className="px-1.5">{exam._count.exam_attempts}</Badge></> },
        ]} />
      </div>
      {activeTab === "questions" && <ExamQuestionsPanel exam={exam} onExam={setData} reload={reload} />}
      {activeTab === "batches" && <BatchesPanel exam={exam} onExam={setData} reload={reload} />}
      {activeTab === "settings" && <SettingsPanel key={exam.updated_at} exam={exam} onChanged={mergeExam} />}
      {activeTab === "results" && <ExamResultsPanel exam={exam} />}
    </>}
  </>;
}

// ---------------------------------------------------------------------------
// Header: status and publishing
// ---------------------------------------------------------------------------

function publishChecklist(exam: ExamDetailData) {
  return [
    { done: exam._count.exam_questions > 0, text: "At least one question" },
    { done: Number(exam.total_marks) > 0, text: "Total marks above 0" },
    { done: exam.exam_batches.length > 0, text: "At least one batch assigned" },
  ];
}

type StatusAction = { to: ExamStatus; label: string; confirm: string; icon: typeof Globe; variant: "default" | "outline" };

function statusActions(exam: ExamDetailData): StatusAction[] {
  const attempts = exam._count.exam_attempts > 0;
  const backToDraft: StatusAction = { to: "DRAFT", label: "Back to draft", icon: RotateCcw, variant: "outline", confirm: "Students will no longer see this exam." };
  if (exam.status === "DRAFT") return [{ to: "PUBLISHED", label: "Publish", icon: Globe, variant: "default", confirm: "Students of the assigned batches will be able to take it inside its open/close window." }];
  if (exam.status === "PUBLISHED") return [
    { to: "CLOSED", label: "Close exam", icon: Lock, variant: "outline", confirm: "No new attempts can start. Results and the rank list stay available." },
    ...(attempts ? [] : [backToDraft]),
  ];
  return [
    { to: "PUBLISHED", label: "Reopen", icon: Globe, variant: "outline", confirm: "Students can start attempts again (within the window and attempt limit)." },
    ...(attempts ? [] : [backToDraft]),
  ];
}

function ExamHeader({ exam, onChanged, reload }: { exam: ExamDetailData; onChanged: (exam: Exam) => void; reload: () => void }) {
  const { withToken } = useAuth();
  const { base } = usePortal();
  const router = useRouter();
  const [pending, setPending] = useState<StatusAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const checklist = publishChecklist(exam);
  const ready = checklist.every(c => c.done);
  const attempts = exam._count.exam_attempts;

  async function changeStatus(action: StatusAction) {
    setBusy(true);
    setStatusError("");
    try {
      const updated = await withToken(token => examsApi.update(token, exam.id, { status: action.to }));
      onChanged(updated);
      toast.success(action.to === "PUBLISHED" ? "Exam published" : action.to === "CLOSED" ? "Exam closed" : "Exam moved back to draft");
      setPending(null);
    } catch (e) {
      setStatusError(errorText(e, "Could not change the status."));
      setPending(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await withToken(token => examsApi.remove(token, exam.id));
      toast.success("Exam deleted");
      router.push(`${base}/exams`);
    } catch (e) {
      toast.error(errorText(e, "Could not delete the exam."));
      setDeleting(false);
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{exam.title}</h1>
          <ExamStatusPill status={exam.status} className="print:hidden" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {KIND_LABEL[exam.kind]} · {exam.courses.title}{exam.subjects && ` · ${exam.subjects.name}`} · {exam.duration_minutes} min · {formatMarks(exam.total_marks)} marks
          {Number(exam.negative_marks_per_wrong) > 0 && ` · −${formatMarks(exam.negative_marks_per_wrong)} per wrong`}
        </p>
        <p className="text-xs text-muted-foreground">
          {exam.opens_at || exam.closes_at ? `Window: ${exam.opens_at ? formatDateTime(exam.opens_at) : "anytime"} – ${exam.closes_at ? formatDateTime(exam.closes_at) : "no end"}` : "No time window"}
          {" · "}{exam.max_attempts} {exam.max_attempts === 1 ? "attempt" : "attempts"} allowed
        </p>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        {statusActions(exam).map(a => <Button key={a.to} variant={a.variant} disabled={busy} onClick={() => { setStatusError(""); setPending(a); }}><a.icon /> {a.label}</Button>)}
        {attempts === 0 && <Button variant="outline" disabled={busy} onClick={() => setDeleting(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Delete exam"><Trash2 /></Button>}
      </div>
    </div>

    {statusError && <div className="print:hidden"><ErrorAlert title="The status was not changed" message={statusError} /></div>}

    {exam.status === "DRAFT" && <Alert className="print:hidden">
      {ready ? <CheckCircle2 className="text-emerald-600" /> : <Circle />}
      <AlertTitle>{ready ? "Ready to publish" : "Before publishing"}</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 grid gap-1 sm:grid-cols-3">
          {checklist.map(c => <li key={c.text} className={c.done ? "flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300" : "flex items-center gap-1.5"}>
            {c.done ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}{c.text}
          </li>)}
        </ul>
        <p className="mt-2 text-xs">{STATUS_HELP.DRAFT} Once a student has attempted it, its questions and marks are locked and it cannot go back to draft or be deleted.</p>
      </AlertDescription>
    </Alert>}
    {exam.status !== "DRAFT" && attempts > 0 && <p className="flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
      <Lock className="size-3.5" /> {attempts} {attempts === 1 ? "attempt" : "attempts"} so far: questions and marks are locked, and the exam can no longer go back to draft or be deleted.
    </p>}

    {pending && <AlertDialog open onOpenChange={open => { if (!open) setPending(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending.label}?</AlertDialogTitle>
          <AlertDialogDescription>{pending.confirm}</AlertDialogDescription>
        </AlertDialogHeader>
        {pending.to === "PUBLISHED" && !ready && <p className="text-sm text-amber-700 dark:text-amber-300">The checklist is not complete; the server will refuse to publish until it is.</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void changeStatus(pending); }}>{busy && <Loader2 className="animate-spin" />} {pending.label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}

    {deleting && <AlertDialog open onOpenChange={open => { if (!open) setDeleting(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{exam.title}”?</AlertDialogTitle>
          <AlertDialogDescription>The exam and its question list are removed. Questions stay in the bank.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void remove(); }} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />} Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}
  </div>;
}

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

function BatchesPanel({ exam, onExam, reload }: { exam: ExamDetailData; onExam: (exam: ExamDetailData) => void; reload: () => void }) {
  const { withToken } = useAuth();
  const { batches, loading, error } = useStaffBatches();
  const [busy, setBusy] = useState<number | null>(null);
  const attached = new Set(exam.exam_batches.map(b => b.batches.id));
  const courseBatches = batches.filter(b => b.courses.id === exam.course_id);
  // Batches attached by someone else that are not in my list (e.g. faculty viewing an admin's exam).
  const others = exam.exam_batches.map(b => b.batches).filter(b => !courseBatches.some(c => c.id === b.id));

  async function toggle(batchId: number, attach: boolean) {
    setBusy(batchId);
    try {
      if (attach) {
        onExam(await withToken(token => examsApi.attachBatch(token, exam.id, batchId)));
        toast.success("Batch assigned");
      } else {
        await withToken(token => examsApi.detachBatch(token, exam.id, batchId));
        toast.success("Batch removed");
        reload();
      }
    } catch (e) {
      toast.error(errorText(e, attach ? "Could not assign the batch." : "Could not remove the batch."));
    } finally {
      setBusy(null);
    }
  }

  const row = (b: { id: number; code: string; name: string }, meta: string | null, canAct: boolean) => {
    const on = attached.has(b.id);
    return <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-medium break-words">{batchLabel(b)}</p>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      <div className="flex items-center gap-2">
        {on && <Badge variant="outline" className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Assigned</Badge>}
        {canAct && <Button size="sm" variant={on ? "outline" : "default"} disabled={busy !== null} onClick={() => void toggle(b.id, !on)}>
          {busy === b.id && <Loader2 className="animate-spin" />}{on ? "Remove" : "Assign"}
        </Button>}
      </div>
    </li>;
  };

  return <Card className="gap-0 py-0">
    <CardHeader className="border-b p-4 [.border-b]:pb-4">
      <CardTitle className="text-base">Batches taking this exam</CardTitle>
      <CardDescription>Only batches of {exam.courses.title}. A batch cannot be removed once its students have attempted the exam. Faculty can assign only the batches they teach.</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} /></div>}
      {loading && !batches.length && <div className="grid gap-3 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}
      {!loading && !courseBatches.length && !others.length && <EmptyState icon={Users} title="No batches for this course" description="Create a batch for this course first (or ask an admin to assign you to one)." />}
      <ul className="divide-y">
        {courseBatches.map(b => row(b, `${b.status[0]}${b.status.slice(1).toLowerCase()} · ${b.enrolled} enrolled${b.branches ? ` · ${b.branches.name}` : ""}`, true))}
        {others.map(b => row(b, "Not one of your batches", false))}
      </ul>
    </CardContent>
  </Card>;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function SettingsPanel({ exam, onChanged }: { exam: ExamDetailData; onChanged: (exam: Exam) => void }) {
  const { withToken } = useAuth();
  const [form, setFormState] = useState<ExamFormState>(() => examToForm(exam));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setForm = (patch: Partial<ExamFormState>) => setFormState(f => ({ ...f, ...patch }));
  const attempts = exam._count.exam_attempts;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateExamForm(form);
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await withToken(token => examsApi.update(token, exam.id, examFormToInput(form)));
      onChanged(updated);
      toast.success("Settings saved");
    } catch (err) {
      setError(errorText(err, "Could not save the settings."));
    } finally {
      setSaving(false);
    }
  }

  return <Card className="gap-0 py-0">
    <CardHeader className="border-b p-4 [.border-b]:pb-4">
      <CardTitle className="text-base">Settings</CardTitle>
      <CardDescription>Total marks ({formatMarks(exam.total_marks)}) are the sum of the question marks and update automatically.</CardDescription>
    </CardHeader>
    <CardContent className="p-4">
      <form className="grid gap-4" onSubmit={submit}>
        {error && <ErrorAlert message={error} title="Settings not saved" />}
        {attempts > 0 && <Alert>
          <Lock />
          <AlertTitle>Students have already attempted this exam</AlertTitle>
          <AlertDescription>
            Settings can still be changed, but finished attempts are not re-graded: a new duration or attempt limit applies to new attempts only.
            The default negative marks only apply to questions added later (and questions are locked now).
          </AlertDescription>
        </Alert>}
        {exam.status === "PUBLISHED" && attempts === 0 && <p className="text-sm text-muted-foreground">The exam is live: students see changes immediately.</p>}
        <ExamFormFields form={form} setForm={setForm} courseLocked courseLabel={exam.courses.title} />
        {form.subjectId !== (exam.subject_id ?? undefined) && exam._count.exam_questions > 0 && <p className="text-sm text-amber-700 dark:text-amber-300">
          Changing the subject does not remove questions already in the exam; it only limits the questions you can add from now on.
        </p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save settings</Button>
        </div>
      </form>
    </CardContent>
  </Card>;
}

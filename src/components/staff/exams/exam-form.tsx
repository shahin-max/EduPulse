"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  EXAM_KINDS, examsApi, RANKING_POLICIES, type Exam, type ExamKind, type ExamSettingsInput, type RankingPolicy,
} from "@/lib/staff-exams-api";
import { ErrorAlert, errorText, Field, Optional } from "@/components/admin/ui";
import { usePortal } from "@/components/portal/portal-shell";
import { useIsAdmin, useStaffBatches } from "@/components/staff/use-staff";
import { fromLocalInput, KIND_LABEL, MARKS_PATTERN, POLICY_HELP, toLocalInput, useCourses } from "./exam-shared";

const NONE = "none";

export type ExamFormState = {
  courseId?: number;
  subjectId?: number;
  title: string;
  kind: ExamKind;
  duration: string;
  negative: string;
  maxAttempts: string;
  opensAt: string;
  closesAt: string;
  resultsReleaseAt: string;
  answerReviewReleaseAt: string;
  policy: RankingPolicy;
  showImmediately: boolean;
};

export const emptyExamForm = (): ExamFormState => ({
  title: "", kind: "CHAPTER_TEST", duration: "60", negative: "0", maxAttempts: "1",
  opensAt: "", closesAt: "", resultsReleaseAt: "", answerReviewReleaseAt: "", policy: "FIRST", showImmediately: true,
});

export const examToForm = (exam: Exam): ExamFormState => ({
  courseId: exam.course_id,
  subjectId: exam.subject_id ?? undefined,
  title: exam.title,
  kind: exam.kind,
  duration: String(exam.duration_minutes),
  negative: String(Number(exam.negative_marks_per_wrong)),
  maxAttempts: String(exam.max_attempts),
  opensAt: toLocalInput(exam.opens_at),
  closesAt: toLocalInput(exam.closes_at),
  resultsReleaseAt: toLocalInput(exam.results_release_at),
  answerReviewReleaseAt: toLocalInput(exam.answer_review_release_at),
  policy: exam.ranking_attempt_policy,
  showImmediately: exam.show_result_immediately,
});

/** Client-side checks mirroring the API (DTO limits and chk_exam_window); returns the first problem. */
export function validateExamForm(f: ExamFormState): string {
  if (!f.courseId) return "Choose the course.";
  if (f.title.trim().length < 2 || f.title.trim().length > 200) return "The title must be 2 to 200 characters.";
  const duration = Number(f.duration);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) return "Duration must be a whole number of minutes from 1 to 1440.";
  if (!new RegExp(`^${MARKS_PATTERN}$`).test(f.negative.trim())) return "Negative marks must be a number with up to 2 decimals (0 for none).";
  const attempts = Number(f.maxAttempts);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100) return "Max attempts must be from 1 to 100.";
  if (f.opensAt && f.closesAt && new Date(f.closesAt) <= new Date(f.opensAt)) return "The exam must close after it opens.";
  return "";
}

/** The settings part of the body (shared by POST and PATCH). */
export function examFormToInput(f: ExamFormState): ExamSettingsInput & { title: string; kind: ExamKind; durationMinutes: number } {
  return {
    subjectId: f.subjectId ?? null,
    title: f.title.trim(),
    kind: f.kind,
    durationMinutes: Number(f.duration),
    negativeMarksPerWrong: Number(f.negative.trim()),
    maxAttempts: Number(f.maxAttempts),
    opensAt: fromLocalInput(f.opensAt),
    closesAt: fromLocalInput(f.closesAt),
    resultsReleaseAt: fromLocalInput(f.resultsReleaseAt),
    answerReviewReleaseAt: fromLocalInput(f.answerReviewReleaseAt),
    rankingAttemptPolicy: f.policy,
    showResultImmediately: f.showImmediately,
  };
}

/** Plain-language consequences of the visibility settings (see exam-rules.ts resultsVisible/reviewVisible). */
function visibilityNotes(f: ExamFormState): string[] {
  const notes: string[] = [];
  if (f.showImmediately) notes.push("Students see their score as soon as they submit.");
  else if (f.resultsReleaseAt) notes.push("Students see scores and the rank list from the results release time.");
  else notes.push("Results are hidden from students until you set a results release time or turn on “Show result immediately”.");
  if (!f.answerReviewReleaseAt) notes.push("Correct answers and explanations stay hidden until you set an answer review release time.");
  else notes.push("Correct answers and explanations appear from the answer review time, and never before results are visible.");
  return notes;
}

/** The exam settings fields. `courseLocked` shows the course as text (it cannot change after creation). */
export function ExamFormFields({ form, setForm, courseLocked, courseLabel }: {
  form: ExamFormState;
  setForm: (patch: Partial<ExamFormState>) => void;
  courseLocked?: boolean;
  courseLabel?: string;
}) {
  const admin = useIsAdmin();
  const { courses } = useCourses();
  const { batches } = useStaffBatches();
  // Faculty can only attach batches they teach, so offer the courses of those batches.
  const teachingCourseIds = new Set(batches.map(b => b.courses.id));
  const courseOptions = admin || teachingCourseIds.size === 0 ? courses : courses.filter(c => teachingCourseIds.has(c.id));
  const course = courses.find(c => c.id === form.courseId);
  const subjects = course?.course_subjects ?? [];

  return <div className="grid gap-4">
    <div className="grid gap-4 sm:grid-cols-2">
      {courseLocked
        ? <Field id="exam-course" label="Course" hint="The course cannot change after the exam is created.">
          <Input id="exam-course" readOnly value={courseLabel ?? course?.title ?? ""} className="bg-muted" />
        </Field>
        : <Field id="exam-course" label="Course">
          <Select value={form.courseId ? String(form.courseId) : ""} onValueChange={v => setForm({ courseId: Number(v), subjectId: undefined })}>
            <SelectTrigger id="exam-course" className="w-full"><SelectValue placeholder="Choose a course" /></SelectTrigger>
            <SelectContent>{courseOptions.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
        </Field>}
      <Field id="exam-subject" label={<>Subject <Optional /></>} hint="Set for a single-subject test; only that subject’s questions can be added.">
        <Select value={form.subjectId ? String(form.subjectId) : NONE} disabled={!form.courseId} onValueChange={v => setForm({ subjectId: v === NONE ? undefined : Number(v) })}>
          <SelectTrigger id="exam-subject" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.subject_id} value={String(s.subject_id)}>{s.subjects.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>

    <Field id="exam-title" label="Title">
      <Input id="exam-title" required minLength={2} maxLength={200} value={form.title} onChange={e => setForm({ title: e.target.value })} placeholder="Physics Chapter Test: Laws of Motion" />
    </Field>

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Field id="exam-kind" label="Kind" className="col-span-2">
        <Select value={form.kind} onValueChange={v => setForm({ kind: v as ExamKind })}>
          <SelectTrigger id="exam-kind" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{EXAM_KINDS.map(k => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field id="exam-duration" label="Duration (min)">
        <Input id="exam-duration" type="number" min={1} max={1440} step={1} required value={form.duration} onChange={e => setForm({ duration: e.target.value })} />
      </Field>
      <Field id="exam-attempts" label="Max attempts">
        <Input id="exam-attempts" type="number" min={1} max={100} step={1} required value={form.maxAttempts} onChange={e => setForm({ maxAttempts: e.target.value })} />
      </Field>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="exam-negative" label="Negative marks per wrong answer" hint="Copied to each question when it is added; 0 for no negative marking. Scores can go below zero.">
        <Input id="exam-negative" inputMode="decimal" pattern={MARKS_PATTERN} required value={form.negative} onChange={e => setForm({ negative: e.target.value })} />
      </Field>
      <Field id="exam-policy" label="Rank by" hint="Which attempt counts on the rank list when several are allowed.">
        <Select value={form.policy} onValueChange={v => setForm({ policy: v as RankingPolicy })}>
          <SelectTrigger id="exam-policy" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{RANKING_POLICIES.map(p => <SelectItem key={p} value={p}>{POLICY_HELP[p]}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </div>

    <fieldset className="grid gap-4 rounded-lg border p-3 sm:p-4">
      <legend className="px-1 text-sm font-medium">Schedule and visibility</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="exam-opens" label={<>Opens at <Optional /></>} hint="Empty: open as soon as it is published.">
          <Input id="exam-opens" type="datetime-local" value={form.opensAt} onChange={e => setForm({ opensAt: e.target.value })} />
        </Field>
        <Field id="exam-closes" label={<>Closes at <Optional /></>} hint="Running attempts end at this time.">
          <Input id="exam-closes" type="datetime-local" value={form.closesAt} min={form.opensAt || undefined} onChange={e => setForm({ closesAt: e.target.value })} />
        </Field>
        <Field id="exam-results" label={<>Results release at <Optional /></>}>
          <Input id="exam-results" type="datetime-local" value={form.resultsReleaseAt} disabled={form.showImmediately} onChange={e => setForm({ resultsReleaseAt: e.target.value })} />
        </Field>
        <Field id="exam-review" label={<>Answer review release at <Optional /></>}>
          <Input id="exam-review" type="datetime-local" value={form.answerReviewReleaseAt} onChange={e => setForm({ answerReviewReleaseAt: e.target.value })} />
        </Field>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="exam-immediate" checked={form.showImmediately} onCheckedChange={v => setForm({ showImmediately: v === true })} className="mt-0.5" />
        <Label htmlFor="exam-immediate" className="leading-snug font-normal">Show result immediately after submitting</Label>
      </div>
      <Alert>
        <Info />
        <AlertDescription>
          <ul className="list-disc space-y-1 pl-4">{visibilityNotes(form).map(n => <li key={n}>{n}</li>)}</ul>
        </AlertDescription>
      </Alert>
    </fieldset>
  </div>;
}

/** New exam dialog (mount only while open). New exams start as drafts; opens the exam afterwards. */
export function CreateExamDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { withToken } = useAuth();
  const { base } = usePortal();
  const router = useRouter();
  const [form, setFormState] = useState<ExamFormState>(emptyExamForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setForm = (patch: Partial<ExamFormState>) => setFormState(f => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateExamForm(form);
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError("");
    try {
      const exam = await withToken(token => examsApi.create(token, { ...examFormToInput(form), courseId: form.courseId! }));
      toast.success("Exam created as a draft. Add questions and batches, then publish.");
      onOpenChange(false);
      router.push(`${base}/exams/${exam.id}`);
    } catch (err) {
      setError(errorText(err, "Could not create the exam."));
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>New exam</DialogTitle>
        <DialogDescription>It starts as a draft. Total marks are the sum of the questions you add. To publish it needs at least one question and one batch.</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4" onSubmit={submit}>
        {error && <ErrorAlert message={error} title="Cannot create the exam" />}
        <ExamFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Create draft</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

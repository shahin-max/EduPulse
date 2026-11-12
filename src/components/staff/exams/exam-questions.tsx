"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CircleCheck, FileQuestion, Loader2, Lock, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { DIFFICULTIES, examsApi, questionsApi, type Difficulty, type ExamDetail, type ExamQuestion } from "@/lib/staff-exams-api";
import { EmptyState, ErrorAlert, errorText, LoadingRows, Pager, titleCase } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ALL, DifficultyPill, formatMarks, MARKS_PATTERN, sumMarks, useCurriculum } from "./exam-shared";
import { QuestionDialog } from "./question-dialog";

export function ExamQuestionsPanel({ exam, onExam, reload }: { exam: ExamDetail; onExam: (exam: ExamDetail) => void; reload: () => void }) {
  const { withToken } = useAuth();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const locked = exam._count.exam_attempts > 0;
  const questions = exam.exam_questions;
  const running = sumMarks(questions.map(q => q.marks));
  const negativeTotal = questions.some(q => Number(q.negative_marks) > 0);

  async function run(key: string, action: () => Promise<void>, failure: string) {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      toast.error(errorText(e, failure));
      reload();
    } finally {
      setBusy(null);
    }
  }

  const move = (index: number, delta: number) => run(`move:${index}`, async () => {
    const ids = questions.map(q => q.question_id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    onExam(await withToken(token => examsApi.reorder(token, exam.id, ids)));
  }, "Could not reorder the questions.");

  const remove = (q: ExamQuestion) => run(`remove:${q.question_id}`, async () => {
    await withToken(token => examsApi.removeQuestion(token, exam.id, q.question_id));
    toast.success("Question removed from the exam");
    reload();
  }, "Could not remove the question.");

  const saveMarks = (q: ExamQuestion, marks: number, negativeMarks: number) => run(`marks:${q.question_id}`, async () => {
    onExam(await withToken(token => examsApi.updateQuestion(token, exam.id, q.question_id, { marks, negativeMarks })));
    toast.success("Marks updated");
  }, "Could not update the marks.");

  return <Card className="gap-0 py-0">
    <CardHeader className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between [.border-b]:pb-4">
      <div className="min-w-0">
        <CardTitle className="text-base">Questions</CardTitle>
        <CardDescription>
          {questions.length} {questions.length === 1 ? "question" : "questions"} · running total <strong className="text-foreground tabular-nums">{formatMarks(running)}</strong> marks
          {" "}(exam total {formatMarks(exam.total_marks)}{running !== Number(exam.total_marks) && ", refresh to update"}).
          {negativeTotal ? " Wrong answers lose their negative marks." : " No negative marking."}
          {" "}Students get the questions in a shuffled order.
        </CardDescription>
      </div>
      {!locked && <Button onClick={() => setPicking(true)} className="shrink-0"><Plus /> Add from bank</Button>}
    </CardHeader>
    <CardContent className="p-0">
      {locked && <p className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground"><Lock className="size-4" /> Students have attempted this exam, so its questions and marks are locked.</p>}
      {questions.length === 0 && <EmptyState icon={FileQuestion} title="No questions yet" description="Pick questions from the question bank. An exam needs at least one to be published."
        action={!locked && <Button onClick={() => setPicking(true)}><Plus /> Add from bank</Button>} />}
      <ol className="divide-y">
        {questions.map((q, i) => <QuestionLine key={`${q.question_id}:${q.marks}:${q.negative_marks}`} q={q} index={i} count={questions.length} locked={locked} busy={busy}
          onMove={d => void move(i, d)} onRemove={() => void remove(q)} onMarks={(m, n) => void saveMarks(q, m, n)} />)}
      </ol>
    </CardContent>
    {picking && <QuestionPicker exam={exam} onClose={() => setPicking(false)} onExam={onExam} />}
  </Card>;
}

function QuestionLine({ q, index, count, locked, busy, onMove, onRemove, onMarks }: {
  q: ExamQuestion; index: number; count: number; locked: boolean; busy: string | null;
  onMove: (delta: number) => void; onRemove: () => void; onMarks: (marks: number, negative: number) => void;
}) {
  const [marks, setMarks] = useState(String(Number(q.marks)));
  const [negative, setNegative] = useState(String(Number(q.negative_marks)));
  const pattern = new RegExp(`^${MARKS_PATTERN}$`);
  const valid = pattern.test(marks.trim()) && pattern.test(negative.trim());
  const dirty = Number(marks) !== Number(q.marks) || Number(negative) !== Number(q.negative_marks);
  const correct = q.questions.question_options.find(o => o.is_correct);
  const disabled = busy !== null;

  return <li className="grid gap-3 p-4 lg:grid-cols-[auto_1fr_auto] lg:items-start">
    <span className="flex size-7 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">{index + 1}</span>
    <div className="min-w-0">
      <p className="break-words whitespace-pre-line">{q.questions.question_text}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {correct && <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CircleCheck className="size-3.5" /> {correct.option_label}. <span className="max-w-[16rem] truncate">{correct.option_text}</span></span>}
        <DifficultyPill value={q.questions.difficulty} />
        {!q.questions.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive in bank</Badge>}
      </div>
    </div>
    <div className="flex flex-wrap items-end gap-2">
      {locked
        ? <p className="text-sm tabular-nums">+{formatMarks(q.marks)}{Number(q.negative_marks) > 0 && <span className="text-muted-foreground"> / −{formatMarks(q.negative_marks)}</span>}</p>
        : <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); if (valid && dirty) onMarks(Number(marks), Number(negative)); }}>
          <label className="grid gap-1 text-xs text-muted-foreground">Marks
            <Input value={marks} onChange={e => setMarks(e.target.value)} inputMode="decimal" className="h-8 w-16 px-2 tabular-nums" aria-invalid={!pattern.test(marks.trim())} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">Negative
            <Input value={negative} onChange={e => setNegative(e.target.value)} inputMode="decimal" className="h-8 w-16 px-2 tabular-nums" aria-invalid={!pattern.test(negative.trim())} />
          </label>
          {dirty && <Button type="submit" size="sm" disabled={!valid || disabled}>{busy === `marks:${q.question_id}` && <Loader2 className="animate-spin" />}Save</Button>}
        </form>}
      {!locked && <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="size-8" disabled={disabled || index === 0} onClick={() => onMove(-1)} aria-label={`Move question ${index + 1} up`}><ArrowUp /></Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={disabled || index === count - 1} onClick={() => onMove(1)} aria-label={`Move question ${index + 1} down`}><ArrowDown /></Button>
        <Button size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={disabled} onClick={onRemove} aria-label={`Remove question ${index + 1}`}>
          {busy === `remove:${q.question_id}` ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </div>}
    </div>
  </li>;
}

/** Filtered picker over the bank: active questions of the exam's course (and subject, if set). Adds one by one. */
function QuestionPicker({ exam, onClose, onExam }: { exam: ExamDetail; onClose: () => void; onExam: (exam: ExamDetail) => void }) {
  const { withToken } = useAuth();
  const { subjects } = useCurriculum(exam.course_id);
  const subjectOptions = exam.subject_id ? subjects.filter(s => s.subject_id === exam.subject_id) : subjects;
  const [courseSubjectId, setCourseSubjectId] = useState<number | undefined>();
  const [chapterId, setChapterId] = useState<number | undefined>();
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<number, string>>(new Map());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const inExam = new Set(exam.exam_questions.map(q => q.question_id));
  const chapters = subjectOptions.find(s => s.id === courseSubjectId)?.chapters ?? [];

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const params = { courseId: exam.course_id, subjectId: exam.subject_id ?? undefined, courseSubjectId, chapterId, difficulty, search, isActive: true, page, limit: 20 };
  const { data, error: loadError, loading, reload } = useAdminData(token => questionsApi.list(token, params), JSON.stringify(params));

  const toggle = (id: number, marks: string) => setSelected(current => {
    const next = new Map(current);
    if (next.has(id)) next.delete(id); else next.set(id, marks);
    return next;
  });
  const selectedMarks = sumMarks([...selected.values()]);

  async function add() {
    setAdding(true);
    setError("");
    let added = 0;
    const failures: string[] = [];
    let latest: ExamDetail | null = null;
    // The API adds one question per request, in the order picked.
    for (const questionId of selected.keys()) {
      try {
        latest = await withToken(token => examsApi.addQuestion(token, exam.id, { questionId }));
        added += 1;
      } catch (e) {
        failures.push(`#${questionId}: ${errorText(e, "not added")}`);
      }
    }
    if (latest) onExam(latest);
    setAdding(false);
    if (added) toast.success(`${added} ${added === 1 ? "question" : "questions"} added`);
    if (failures.length) {
      setError(failures.join("; "));
      setSelected(new Map());
    } else onClose();
  }

  return <Dialog open onOpenChange={open => { if (!open && !adding) onClose(); }}>
    <DialogContent className="flex max-h-[92svh] flex-col gap-4 sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Add questions from the bank</DialogTitle>
        <DialogDescription>
          Active questions of {exam.courses.title}{exam.subjects && ` (${exam.subjects.name} only)`}. Marks come from each question’s default and
          negative marks from the exam ({formatMarks(exam.negative_marks_per_wrong)}); you can change both after adding.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search question text" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search questions" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Select value={courseSubjectId ? String(courseSubjectId) : ALL} onValueChange={v => { setCourseSubjectId(v === ALL ? undefined : Number(v)); setChapterId(undefined); setPage(1); }}>
            <SelectTrigger className="w-full" aria-label="Filter by subject"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All subjects</SelectItem>
              {subjectOptions.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjects.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={chapterId ? String(chapterId) : ALL} disabled={!courseSubjectId} onValueChange={v => { setChapterId(v === ALL ? undefined : Number(v)); setPage(1); }}>
            <SelectTrigger className="w-full" aria-label="Filter by chapter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All chapters</SelectItem>
              {chapters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={difficulty ?? ALL} onValueChange={v => { setDifficulty(v === ALL ? undefined : v as Difficulty); setPage(1); }}>
            <SelectTrigger className="col-span-2 w-full sm:col-span-1" aria-label="Filter by difficulty"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any difficulty</SelectItem>
              {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{titleCase(d)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <ErrorAlert title="Some questions were not added" message={error} />}
      {loadError && <ErrorAlert message={loadError} onRetry={reload} />}

      <div className="-mx-6 min-h-0 flex-1 overflow-y-auto border-y px-6">
        {!data && loading && <LoadingRows rows={4} />}
        {data && data.data.length === 0 && <EmptyState icon={FileQuestion} title="No matching questions" description="Change the filters or write a new question."
          action={<Button variant="outline" onClick={() => setCreating(true)}><Plus /> New question</Button>} />}
        {data && data.data.length > 0 && <ul className={loading ? "divide-y opacity-60" : "divide-y"}>
          {data.data.map(q => {
            const already = inExam.has(q.id);
            const correct = q.question_options.find(o => o.is_correct);
            return <li key={q.id}>
              <label className={already ? "flex cursor-not-allowed gap-3 py-3 opacity-60" : "flex cursor-pointer gap-3 py-3"}>
                <Checkbox checked={already || selected.has(q.id)} disabled={already} onCheckedChange={() => toggle(q.id, q.marks_default)} className="mt-0.5" aria-label={`Select question ${q.id}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm break-words">{q.question_text}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{q.course_subjects.subjects.name}{q.chapters && ` · ${q.chapters.title}`}</span>
                    <DifficultyPill value={q.difficulty} />
                    <span>{formatMarks(q.marks_default)} marks</span>
                    {correct && <span className="text-emerald-700 dark:text-emerald-300">Answer: {correct.option_label}</span>}
                    {already && <Badge variant="secondary">In exam</Badge>}
                  </span>
                </span>
              </label>
            </li>;
          })}
        </ul>}
      </div>
      {data && data.meta.totalPages > 1 && <Pager meta={data.meta} onPage={setPage} />}

      <DialogFooter className="items-center gap-2 sm:justify-between">
        <p className="text-sm text-muted-foreground">{selected.size} selected{selected.size > 0 && ` · +${formatMarks(selectedMarks)} marks`}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setCreating(true)} disabled={adding}><Plus /> New question</Button>
          <Button onClick={() => void add()} disabled={!selected.size || adding}>{adding && <Loader2 className="animate-spin" />} Add {selected.size || ""} to exam</Button>
        </div>
      </DialogFooter>
    </DialogContent>
    {creating && <QuestionDialog defaults={{ courseId: exam.course_id, courseSubjectId: subjectOptions.length === 1 ? subjectOptions[0]!.id : courseSubjectId, chapterId }}
      onOpenChange={open => { if (!open) setCreating(false); }} onSaved={() => reload()} />}
  </Dialog>;
}

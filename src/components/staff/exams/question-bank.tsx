"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CircleCheck, Eye, EyeOff, FileQuestion, FileUp, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { RowActions as ActionMenu } from "@/components/portal/row-actions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { DIFFICULTIES, questionsApi, type Difficulty, type Question } from "@/lib/staff-exams-api";
import { MathText } from "@/components/portal/math-text";
import { AssetImage } from "@/components/portal/asset-image";
import { EmptyState, ErrorAlert, errorText, LoadingRows, Pager, titleCase } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { useIsHeadOffice } from "@/components/staff/use-staff";
import { ALL, DifficultyPill, formatMarks, useCourses, useCurriculum } from "./exam-shared";
import { QuestionDialog, type QuestionDefaults } from "./question-dialog";
import { QuestionImportDialog } from "./question-import";

type ActiveFilter = "active" | "inactive" | typeof ALL;

export function QuestionBank() {
  const { withToken, user } = useAuth();
  const admin = useIsHeadOffice();
  const { courses } = useCourses();
  const [courseId, setCourseId] = useState<number | undefined>();
  const [courseSubjectId, setCourseSubjectId] = useState<number | undefined>();
  const [chapterId, setChapterId] = useState<number | undefined>();
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ question?: Question } | null>(null);
  const [defaults, setDefaults] = useState<QuestionDefaults>({});
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [importing, setImporting] = useState(false);
  const { subjects } = useCurriculum(courseId);
  const chapters = subjects.find(s => s.id === courseSubjectId)?.chapters ?? [];

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const params = {
    courseId, courseSubjectId, chapterId, difficulty, search, page, limit: 20,
    isActive: activeFilter === ALL ? undefined : activeFilter === "active",
  };
  const { data, error, loading, reload } = useAdminData(token => questionsApi.list(token, params), JSON.stringify(params));
  const filtered = !!(courseId || difficulty || search || activeFilter !== "active");

  const canEdit = (q: Question) => admin || (q.created_by !== null && q.created_by === user?.id);
  const openNew = () => setForm({});
  const actions: RowActions = {
    canEdit,
    edit: q => setForm({ question: q }),
    remove: q => setDeleting(q),
    toggleActive: async q => {
      try {
        await withToken(token => questionsApi.update(token, q.id, { isActive: !q.is_active }));
        toast.success(q.is_active ? "Question deactivated" : "Question reactivated");
        reload();
      } catch (e) {
        toast.error(errorText(e, "Could not change the question."));
      }
    },
  };

  return <Card className="gap-0 py-0">
    <div className="grid gap-3 border-b p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search question text" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search questions" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => setImporting(true)}><FileUp /> Import from Excel/CSV</Button>
          <Button onClick={openNew}><Plus /> New question</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Select value={courseId ? String(courseId) : ALL} onValueChange={v => { setCourseId(v === ALL ? undefined : Number(v)); setCourseSubjectId(undefined); setChapterId(undefined); setPage(1); }}>
          <SelectTrigger className="w-full" aria-label="Filter by course"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All courses</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={courseSubjectId ? String(courseSubjectId) : ALL} disabled={!courseId} onValueChange={v => { setCourseSubjectId(v === ALL ? undefined : Number(v)); setChapterId(undefined); setPage(1); }}>
          <SelectTrigger className="w-full" aria-label="Filter by subject"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjects.name}</SelectItem>)}
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
          <SelectTrigger className="w-full" aria-label="Filter by difficulty"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any difficulty</SelectItem>
            {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{titleCase(d)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={v => { setActiveFilter(v as ActiveFilter); setPage(1); }}>
          <SelectTrigger className="w-full" aria-label="Filter by active"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
            <SelectItem value={ALL}>Active and inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows />}
      {data && data.data.length === 0 && <EmptyState icon={FileQuestion}
        title={filtered ? "No questions match these filters" : "The question bank is empty"}
        description={filtered ? "Try a different search or clear the filters." : "Add questions here, then pick them into exams."}
        action={!filtered && <Button onClick={openNew}><Plus /> New question</Button>} />}
      {data && data.data.length > 0 && <ul className={loading ? "divide-y opacity-60 transition-opacity" : "divide-y transition-opacity"}>
        {data.data.map(q => <QuestionRow key={q.id} question={q} actions={actions} />)}
      </ul>}
    </CardContent>

    {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}

    {form && <QuestionDialog question={form.question} defaults={defaults} onOpenChange={open => { if (!open) setForm(null); }}
      onSaved={q => {
        if (!form.question) setDefaults({ courseId: q.course_subjects.courses.id, courseSubjectId: q.course_subject_id, chapterId: q.chapter_id ?? undefined });
        reload();
      }} />}
    {/* Imports go to the course/subject/chapter chosen in the filters (or the last one used). */}
    <QuestionImportDialog open={importing} onOpenChange={setImporting} onImported={reload}
      defaults={courseId ? { courseId, courseSubjectId, chapterId } : defaults} />
    {deleting && <DeleteQuestionDialog question={deleting} onClose={() => setDeleting(null)} onDone={reload} />}
  </Card>;
}

type RowActions = {
  canEdit: (q: Question) => boolean;
  edit: (q: Question) => void;
  remove: (q: Question) => void;
  toggleActive: (q: Question) => Promise<void>;
};

/** One question with its options; stacked layout that works from 360px up. */
function QuestionRow({ question: q, actions }: { question: Question; actions: RowActions }) {
  const editable = actions.canEdit(q);
  const locked = editable ? undefined : "Only the question's author or an admin can change it";
  return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
    <div className="min-w-0">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-mono">#{q.id}</span>
        <span>·</span>
        <span className="truncate">{q.course_subjects.courses.code} · {q.course_subjects.subjects.name}{q.chapters && ` · ${q.chapters.title}`}</span>
      </div>
      <p className="font-medium"><MathText text={q.question_text} /></p>
      {q.image_asset_id && <AssetImage assetId={q.image_asset_id} alt={`Figure for question ${q.id}`} size="sm" className="mt-2" />}
      <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {q.question_options.map(o => <li key={o.id} className={o.is_correct ? "flex gap-1.5 font-medium text-emerald-700 dark:text-emerald-300" : "flex gap-1.5 text-muted-foreground"}>
          <span className="shrink-0">{o.option_label}.</span>
          <span className="grid min-w-0 gap-1">
            {o.option_text && <MathText text={o.option_text} />}
            {o.image_asset_id && <AssetImage assetId={o.image_asset_id} alt={`Option ${o.option_label} of question ${q.id}`} size="sm" />}
          </span>
          {o.is_correct && <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-label="Correct" />}
        </li>)}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DifficultyPill value={q.difficulty} />
        <Badge variant="outline">{formatMarks(q.marks_default)} {Number(q.marks_default) === 1 ? "mark" : "marks"}</Badge>
        {!q.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
      </div>
    </div>
    <ActionMenu label={`question #${q.id}`} items={[
      { label: "Edit", icon: Pencil, onSelect: () => actions.edit(q), disabled: !editable, hint: locked },
      { label: q.is_active ? "Deactivate" : "Activate", icon: q.is_active ? EyeOff : Eye, onSelect: () => void actions.toggleActive(q), disabled: !editable,
        hint: editable ? (q.is_active ? "Hide it from new exams" : "Use it in exams again") : undefined },
      { label: "Delete", icon: Trash2, onSelect: () => actions.remove(q), disabled: !editable, destructive: true },
    ]} />
  </li>;
}

function DeleteQuestionDialog({ question, onClose, onDone }: { question: Question; onClose: () => void; onDone: () => void }) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inExam, setInExam] = useState(false);

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await withToken(token => questionsApi.remove(token, question.id));
      toast.success("Question deleted");
      onDone();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setInExam(true);
      setError(errorText(e, "Could not delete the question."));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      await withToken(token => questionsApi.update(token, question.id, { isActive: false }));
      toast.success("Question deactivated");
      onDone();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not deactivate the question."));
    } finally {
      setBusy(false);
    }
  }

  return <AlertDialog open onOpenChange={open => { if (!open) onClose(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete this question?</AlertDialogTitle>
        <AlertDialogDescription className="line-clamp-3">{question.question_text}</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <ErrorAlert message={error} title="Not deleted" />}
      <p className="text-sm text-muted-foreground">Only questions that are not in any exam can be deleted. Questions used in exams can be deactivated so nobody picks them again.</p>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        {inExam && question.is_active
          ? <Button disabled={busy} onClick={() => void deactivate()}>{busy && <Loader2 className="animate-spin" />} Deactivate instead</Button>
          : <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void remove(); }} className="bg-destructive text-white hover:bg-destructive/90">
            {busy && <Loader2 className="animate-spin" />} Delete
          </AlertDialogAction>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

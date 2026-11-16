"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { DIFFICULTIES, questionsApi, type Difficulty, type Question, type QuestionOptionInput } from "@/lib/staff-exams-api";
import { ErrorAlert, errorText, Field, Optional, titleCase } from "@/components/admin/ui";
import { MARKS_PATTERN, useCourses, useCurriculum } from "./exam-shared";
import { OptionImagePreview, QuestionImageField } from "./question-image-field";
import { hasMath, MathText } from "@/components/portal/math-text";

const NONE = "none";
const LABELS = "ABCDEFGH";
const blankOptions = (): QuestionOptionInput[] => Array.from({ length: 4 }, (_, i) => ({ optionLabel: LABELS[i]!, optionText: "", imageAssetId: null, isCorrect: false }));

/** Remembered between "Save and add another" rounds. */
export type QuestionDefaults = { courseId?: number; courseSubjectId?: number; chapterId?: number };

/**
 * Create or edit a single-choice question. Mount only while open.
 * Create mode keeps the course, subject, chapter, difficulty and marks after "Save and add another".
 */
export function QuestionDialog({ question, defaults, onOpenChange, onSaved }: {
  question?: Question;
  defaults?: QuestionDefaults;
  onOpenChange: (open: boolean) => void;
  onSaved: (question: Question) => void;
}) {
  const { withToken } = useAuth();
  const editing = !!question;
  const { courses } = useCourses();
  const [courseId, setCourseId] = useState<number | undefined>(question?.course_subjects.courses.id ?? defaults?.courseId);
  const [courseSubjectId, setCourseSubjectId] = useState<number | undefined>(question?.course_subject_id ?? defaults?.courseSubjectId);
  const [chapterId, setChapterId] = useState<number | undefined>(question ? question.chapter_id ?? undefined : defaults?.chapterId);
  const { subjects, loading: curriculumLoading } = useCurriculum(courseId);
  const [text, setText] = useState(question?.question_text ?? "");
  const [image, setImage] = useState<number | null>(question?.image_asset_id ?? null);
  const [options, setOptions] = useState<QuestionOptionInput[]>(() => question
    ? question.question_options.map(o => ({ optionLabel: o.option_label, optionText: o.option_text, imageAssetId: o.image_asset_id, isCorrect: o.is_correct }))
    : blankOptions());
  // Picture uploads in flight; saving waits until they finish.
  const [uploads, setUploads] = useState(0);
  const trackUpload = (busy: boolean) => setUploads(n => Math.max(0, n + (busy ? 1 : -1)));
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty ?? "MEDIUM");
  const [marks, setMarks] = useState(question ? String(Number(question.marks_default)) : "1");
  const [active, setActive] = useState(question?.is_active ?? true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<false | "close" | "next">(false);
  const [count, setCount] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const chapters = subjects.find(s => s.id === courseSubjectId)?.chapters ?? [];
  const correctIndex = options.findIndex(o => o.isCorrect);

  const setOption = (index: number, patch: Partial<QuestionOptionInput>) =>
    setOptions(list => list.map((o, i) => i === index ? { ...o, ...patch } : patch.isCorrect ? { ...o, isCorrect: false } : o));
  const addOption = () => setOptions(list => {
    const used = new Set(list.map(o => o.optionLabel));
    const label = [...LABELS].find(l => !used.has(l)) ?? String(list.length + 1);
    return [...list, { optionLabel: label, optionText: "", imageAssetId: null, isCorrect: false }];
  });
  const removeOption = (index: number) => setOptions(list => list.filter((_, i) => i !== index));

  function validate(): string {
    if (!courseSubjectId) return "Choose the course and subject.";
    if (!text.trim()) return "Type the question.";
    if (options.length < 2 || options.length > 8) return "A question needs 2 to 8 options.";
    if (options.some(o => !o.optionText.trim() && !o.imageAssetId)) return "Every option needs text or a picture (remove the empty ones).";
    if (options.some(o => !/^[A-Z0-9]{1,8}$/.test(o.optionLabel.trim().toUpperCase()))) return "Option labels must be 1-8 letters or digits, e.g. A.";
    if (new Set(options.map(o => o.optionLabel.trim().toUpperCase())).size !== options.length) return "Option labels must be unique.";
    if (correctIndex < 0) return "Mark the correct option.";
    if (!new RegExp(`^${MARKS_PATTERN}$`).test(marks.trim())) return "Default marks must be a number with up to 2 decimals, e.g. 4 or 2.5.";
    return "";
  }

  async function save(next: boolean) {
    const problem = validate();
    if (problem) { setError(problem); return; }
    if (uploads) { setError("Wait for the pictures to finish uploading."); return; }
    setError("");
    setSaving(next ? "next" : "close");
    const cleanOptions = options.map((o, i) => ({ optionLabel: o.optionLabel.trim().toUpperCase(), optionText: o.optionText.trim(), imageAssetId: o.imageAssetId ?? null, isCorrect: o.isCorrect, sortOrder: i }));
    try {
      let saved: Question;
      if (question) {
        const original = question.question_options.map((o, i) => ({ optionLabel: o.option_label, optionText: o.option_text, imageAssetId: o.image_asset_id ?? null, isCorrect: o.is_correct, sortOrder: i }));
        const optionsChanged = JSON.stringify(original) !== JSON.stringify(cleanOptions);
        saved = await withToken(token => questionsApi.update(token, question.id, {
          questionText: text.trim(),
          ...(image !== (question.image_asset_id ?? null) ? { imageAssetId: image } : {}),
          explanation: explanation.trim() || null,
          difficulty,
          marksDefault: Number(marks.trim()),
          isActive: active,
          chapterId: chapterId ?? null,
          // Options are locked once the question appeared in an attempt; only send them when they changed.
          ...(optionsChanged ? { options: cleanOptions } : {}),
        }));
      } else {
        saved = await withToken(token => questionsApi.create(token, {
          courseSubjectId: courseSubjectId!,
          chapterId: chapterId ?? null,
          questionText: text.trim(),
          imageAssetId: image,
          explanation: explanation.trim() || null,
          difficulty,
          marksDefault: Number(marks.trim()),
          isActive: active,
          options: cleanOptions,
        }));
      }
      onSaved(saved);
      if (next) {
        toast.success(`Question saved (${count + 1} this session). Type the next one.`);
        setCount(c => c + 1);
        setText("");
        setImage(null);
        setExplanation("");
        setOptions(blankOptions());
        textRef.current?.focus();
      } else {
        toast.success(editing ? "Question updated" : "Question added to the bank");
        onOpenChange(false);
      }
    } catch (e) {
      setError(errorText(e, "Could not save the question."));
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit question" : "New question"}</DialogTitle>
        <DialogDescription>Single choice: 2 to 8 options, exactly one correct. Press Ctrl+Enter to save.</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4" onSubmit={e => { e.preventDefault(); void save(!editing); }}
        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void save(!editing); } }}>
        {error && <ErrorAlert message={error} title="Cannot save" />}

        {editing
          ? <p className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Course and subject: </span>
            {question.course_subjects.courses.title} · {question.course_subjects.subjects.name}
            <span className="block text-xs text-muted-foreground">These cannot change after the question is created.</span>
          </p>
          : <div className="grid gap-4 sm:grid-cols-2">
            <Field id="q-course" label="Course">
              <Select value={courseId ? String(courseId) : ""} onValueChange={v => { setCourseId(Number(v)); setCourseSubjectId(undefined); setChapterId(undefined); }}>
                <SelectTrigger id="q-course" className="w-full"><SelectValue placeholder="Choose a course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field id="q-subject" label="Subject">
              <Select value={courseSubjectId ? String(courseSubjectId) : ""} disabled={!courseId || curriculumLoading} onValueChange={v => { setCourseSubjectId(Number(v)); setChapterId(undefined); }}>
                <SelectTrigger id="q-subject" className="w-full"><SelectValue placeholder={courseId && !curriculumLoading && !subjects.length ? "No subjects in this course" : "Choose a subject"} /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjects.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>}

        <Field id="q-chapter" label={<>Chapter <Optional /></>}>
          <Select value={chapterId ? String(chapterId) : NONE} disabled={!courseSubjectId} onValueChange={v => setChapterId(v === NONE ? undefined : Number(v))}>
            <SelectTrigger id="q-chapter" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No chapter</SelectItem>
              {chapters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field id="q-text" label="Question" hint={<>Write maths between $ signs, e.g. <code className="rounded bg-muted px-1">{"$x^2 + \\frac{1}{2}$"}</code>; use $$ … $$ for a formula on its own line.</>}>
          <Textarea id="q-text" ref={textRef} autoFocus rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={20000} placeholder="Type the question" />
        </Field>
        {hasMath(text) && <div className="grid gap-1 rounded-md border bg-muted/30 p-3" aria-live="polite">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <MathText text={text} className="text-sm" />
        </div>}
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Picture <span className="font-normal text-muted-foreground">(optional: a figure, diagram or graph)</span></p>
          <QuestionImageField value={image} onChange={setImage} onBusyChange={trackUpload} label="the question" />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Options <span className="font-normal text-muted-foreground">(select the correct one)</span></legend>
          {options.map((o, i) => <div key={i} className="grid gap-1.5"><div className="flex items-center gap-2">
            <input type="radio" name="correct-option" aria-label={`Option ${o.optionLabel} is correct`} checked={o.isCorrect}
              onChange={() => setOption(i, { isCorrect: true })} className="size-4 shrink-0 accent-primary" />
            <Input aria-label={`Label of option ${i + 1}`} value={o.optionLabel} maxLength={8} onChange={e => setOption(i, { optionLabel: e.target.value.toUpperCase() })} className="w-12 shrink-0 px-2 text-center" />
            <Input aria-label={`Text of option ${o.optionLabel}`} value={o.optionText} onChange={e => setOption(i, { optionText: e.target.value })}
              className={o.isCorrect ? "min-w-0 flex-1 border-emerald-500/60" : "min-w-0 flex-1"} placeholder={o.imageAssetId ? "Optional text" : `Option ${o.optionLabel}`} />
            <QuestionImageField compact value={o.imageAssetId ?? null} onChange={id => setOption(i, { imageAssetId: id })} onBusyChange={trackUpload} label={`option ${o.optionLabel}`} />
            <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={options.length <= 2} onClick={() => removeOption(i)} aria-label={`Remove option ${o.optionLabel}`}><X /></Button>
          </div>
          {o.imageAssetId && <OptionImagePreview assetId={o.imageAssetId} label={`option ${o.optionLabel}`} onRemove={() => setOption(i, { imageAssetId: null })} />}
          </div>)}
          <p className="text-xs text-muted-foreground">Use the picture button on a row for figure options (e.g. non-verbal reasoning); text is then optional.</p>
          <div><Button type="button" variant="outline" size="sm" disabled={options.length >= 8} onClick={addOption}><Plus /> Add option</Button></div>
          {editing && <p className="text-xs text-muted-foreground">Options cannot change once the question has appeared in a student’s attempt; deactivate it and create a new one instead.</p>}
        </fieldset>

        <Field id="q-explanation" label={<>Explanation <Optional /></>} hint="Shown to students when answer review is released.">
          <Textarea id="q-explanation" rows={2} value={explanation} onChange={e => setExplanation(e.target.value)} maxLength={20000} />
        </Field>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field id="q-difficulty" label="Difficulty">
            <Select value={difficulty} onValueChange={v => setDifficulty(v as Difficulty)}>
              <SelectTrigger id="q-difficulty" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{titleCase(d)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="q-marks" label="Default marks">
            <Input id="q-marks" inputMode="decimal" pattern={MARKS_PATTERN} required value={marks} onChange={e => setMarks(e.target.value)} />
          </Field>
          <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:pt-6">
            <Checkbox id="q-active" checked={active} onCheckedChange={v => setActive(v === true)} />
            <Label htmlFor="q-active" className="font-normal">Active</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{count ? "Done" : "Cancel"}</Button>
          {editing
            ? <Button type="submit" disabled={!!saving || uploads > 0}>{saving && <Loader2 className="animate-spin" />} Save changes</Button>
            : <>
              <Button type="button" variant="secondary" disabled={!!saving || uploads > 0} onClick={() => void save(false)}>{saving === "close" && <Loader2 className="animate-spin" />} Save and close</Button>
              <Button type="submit" disabled={!!saving || uploads > 0}>{saving === "next" && <Loader2 className="animate-spin" />} Save and add another</Button>
            </>}
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileUp, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { DIFFICULTIES, questionsApi, type CreateQuestionInput, type Difficulty } from "@/lib/staff-exams-api";
import { downloadCsv } from "@/lib/teaching-api";
import { cn } from "@/lib/utils";
import { ErrorAlert, errorText, Field, Optional } from "@/components/admin/ui";
import { useCourses, useCurriculum } from "./exam-shared";

const NONE = "none";
const LABELS = ["A", "B", "C", "D"] as const;
const HEADER = ["question", "option_a", "option_b", "option_c", "option_d", "correct", "marks", "explanation", "difficulty"];
const EXAMPLE = ["What is the SI unit of force?", "Newton", "Joule", "Watt", "Pascal", "A", "4", "Force is measured in newtons (N).", "EASY"];
/** Above this many rows, pause between requests to stay under the API's 120 requests a minute. */
const THROTTLE_ABOVE = 60;
const PAUSE_MS = 600;

/**
 * RFC 4180 CSV: commas, double quotes ("" inside quotes), line breaks inside quotes, CRLF or LF,
 * and the UTF-8 byte-order mark Excel adds to "CSV UTF-8" files. Fully empty rows are skipped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim())) rows.push(row);
  return rows;
}

type Row = { line: number; input?: Omit<CreateQuestionInput, "courseSubjectId" | "chapterId">; preview: string[]; errors: string[] };
type Result = { line: number; ok: boolean; message?: string };

/** Turns CSV rows (after the header) into question bodies, collecting every problem per row. */
function validate(rows: string[][]): Row[] {
  const [head, ...body] = rows;
  const index = Object.fromEntries((head ?? []).map((h, i) => [h.trim().toLowerCase(), i]));
  const get = (r: string[], key: string) => (index[key] === undefined ? "" : (r[index[key]] ?? "")).trim();
  return body.map((r, i) => {
    const errors: string[] = [];
    const question = get(r, "question");
    const options = LABELS.map(l => ({ label: l, text: get(r, `option_${l.toLowerCase()}`) })).filter(o => o.text);
    const correct = get(r, "correct").toUpperCase();
    const marksText = get(r, "marks");
    const marks = marksText ? Number(marksText) : 1;
    const difficulty = get(r, "difficulty").toUpperCase();
    const explanation = get(r, "explanation");
    if (!question) errors.push("Question text is empty");
    else if (question.length > 5000) errors.push("Question is longer than 5000 characters");
    if (options.length < 2) errors.push("Needs at least two options");
    if (!LABELS.includes(correct as (typeof LABELS)[number])) errors.push("Correct must be A, B, C or D");
    else if (!options.some(o => o.label === correct)) errors.push(`Option ${correct} is empty`);
    if (!Number.isFinite(marks) || marks <= 0 || marks > 9999 || Math.round(marks * 100) !== marks * 100) errors.push("Marks must be a number above 0 (up to 2 decimals)");
    if (difficulty && !DIFFICULTIES.includes(difficulty as Difficulty)) errors.push("Difficulty must be EASY, MEDIUM or HARD");
    return {
      line: i + 2,
      preview: [question, options.map(o => `${o.label}. ${o.text}`).join("  "), correct, marksText || "1"],
      errors,
      input: errors.length ? undefined : {
        questionText: question,
        explanation: explanation || undefined,
        difficulty: (difficulty || undefined) as Difficulty | undefined,
        marksDefault: marks,
        options: options.map((o, k) => ({ optionLabel: o.label, optionText: o.text, isCorrect: o.label === correct, sortOrder: k })),
      },
    };
  });
}

/** "Import from Excel/CSV": template, upload, preview with per-row errors, then one POST per valid row. */
export function QuestionImportDialog({ open, onOpenChange, defaults, onImported }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: { courseId?: number; courseSubjectId?: number; chapterId?: number };
  onImported: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
      {open && <ImportForm defaults={defaults} onImported={onImported} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function ImportForm({ defaults, onImported, onClose }: {
  defaults: { courseId?: number; courseSubjectId?: number; chapterId?: number };
  onImported: () => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const { courses } = useCourses();
  const [courseId, setCourseId] = useState(defaults.courseId);
  const [courseSubjectId, setCourseSubjectId] = useState(defaults.courseSubjectId);
  const [chapterId, setChapterId] = useState(defaults.chapterId);
  const { subjects, loading: curriculumLoading } = useCurriculum(courseId);
  const chapters = subjects.find(s => s.id === courseSubjectId)?.chapters ?? [];
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const valid = rows?.filter(r => r.input) ?? [];
  const invalid = rows?.filter(r => !r.input) ?? [];
  const importing = !!progress && !results;

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    setError(""); setResults(null); setRows(null); setFileName(file.name);
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return setError("Choose a .csv file. In Excel use File → Save As → CSV UTF-8.");
    if (file.size > 2 * 1024 * 1024) return setError("The file is larger than 2 MB. Split it into smaller files.");
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) return setError("The file has no questions under the header row.");
    if (!parsed[0].map(h => h.trim().toLowerCase()).includes("question")) return setError("The first row must be the header from the template (question, option_a, …).");
    if (parsed.length - 1 > 500) return setError("Import at most 500 questions at a time.");
    setRows(validate(parsed));
  }

  async function run() {
    if (!courseSubjectId) return setError("Choose the course and subject the questions belong to.");
    setError("");
    const out: Result[] = [];
    setProgress({ done: 0, total: valid.length });
    for (const [i, row] of valid.entries()) {
      try {
        await withToken(token => questionsApi.create(token, { ...row.input!, courseSubjectId, chapterId: chapterId ?? undefined }));
        out.push({ line: row.line, ok: true });
      } catch (e) {
        out.push({ line: row.line, ok: false, message: errorText(e, "Could not save") });
      }
      setProgress({ done: i + 1, total: valid.length });
      if (valid.length > THROTTLE_ABOVE && i < valid.length - 1) await new Promise(r => setTimeout(r, PAUSE_MS));
    }
    setResults(out);
    const ok = out.filter(r => r.ok).length;
    if (ok) { toast.success(`${ok} ${ok === 1 ? "question" : "questions"} imported`); onImported(); }
  }

  const template = () => downloadCsv("question-import-template.csv", [HEADER, EXAMPLE]);

  return <>
    <DialogHeader>
      <DialogTitle>Import questions from Excel or CSV</DialogTitle>
      <DialogDescription>Single-choice questions with 2 to 4 options. Fill in the template in Excel, then use File → Save As → <strong>CSV UTF-8</strong> and upload that file.</DialogDescription>
    </DialogHeader>

    <div className="grid gap-4 sm:grid-cols-3">
      <Field id="qi-course" label="Course">
        <Select value={courseId ? String(courseId) : ""} disabled={importing} onValueChange={v => { setCourseId(Number(v)); setCourseSubjectId(undefined); setChapterId(undefined); }}>
          <SelectTrigger id="qi-course" className="w-full"><SelectValue placeholder="Choose a course" /></SelectTrigger>
          <SelectContent>{courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field id="qi-subject" label="Subject">
        <Select value={courseSubjectId ? String(courseSubjectId) : ""} disabled={!courseId || curriculumLoading || importing} onValueChange={v => { setCourseSubjectId(Number(v)); setChapterId(undefined); }}>
          <SelectTrigger id="qi-subject" className="w-full"><SelectValue placeholder={curriculumLoading ? "Loading…" : "Choose a subject"} /></SelectTrigger>
          <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjects.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field id="qi-chapter" label={<>Chapter <Optional /></>}>
        <Select value={chapterId ? String(chapterId) : NONE} disabled={!courseSubjectId || importing} onValueChange={v => setChapterId(v === NONE ? undefined : Number(v))}>
          <SelectTrigger id="qi-chapter" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No chapter</SelectItem>
            {chapters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={template}><Download /> Download template</Button>
      <Button type="button" onClick={() => input.current?.click()} disabled={importing}><FileUp /> {rows ? "Choose another file" : "Choose CSV file"}</Button>
      {fileName && <span className="truncate text-sm text-muted-foreground">{fileName}</span>}
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} onChange={e => void pick(e.target.files?.[0])} />
    </div>
    <p className="text-xs text-muted-foreground">Columns: question, option_a … option_d, correct (A–D), marks (default 1), explanation and difficulty (EASY, MEDIUM or HARD) are optional. Empty options are skipped.</p>

    {error && <ErrorAlert title="Cannot import" message={error} />}

    {rows && !results && <section className="grid gap-2">
      <p className="text-sm"><span className="font-medium text-emerald-700 dark:text-emerald-400">{valid.length} ready</span>
        {invalid.length > 0 && <> · <span className="font-medium text-red-700 dark:text-red-400">{invalid.length} with problems</span> (skipped)</>}</p>
      <div className="max-h-72 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-left text-xs"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Question</th><th className="hidden px-3 py-2 md:table-cell">Options</th><th className="px-3 py-2">Answer</th><th className="px-3 py-2">Marks</th></tr></thead>
          <tbody className="divide-y">
            {rows.map(r => <tr key={r.line} className={cn(r.errors.length && "bg-red-500/5")}>
              <td className="px-3 py-2 align-top tabular-nums text-muted-foreground">{r.line}</td>
              <td className="max-w-64 px-3 py-2 align-top">
                <span className="line-clamp-2 break-words">{r.preview[0] || <span className="text-muted-foreground">—</span>}</span>
                {r.errors.length > 0 && <span className="mt-1 block text-xs text-red-700 dark:text-red-400">{r.errors.join(". ")}.</span>}
              </td>
              <td className="hidden max-w-72 px-3 py-2 align-top text-xs text-muted-foreground md:table-cell"><span className="line-clamp-2">{r.preview[1]}</span></td>
              <td className="px-3 py-2 align-top">{r.preview[2]}</td>
              <td className="px-3 py-2 align-top tabular-nums">{r.preview[3]}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>}

    {progress && <div className="grid gap-1.5" aria-live="polite">
      <p className="flex items-center gap-2 text-sm">{!results && <Loader2 className="size-4 animate-spin" />}{results ? "Finished" : "Importing"} {progress.done} of {progress.total}</p>
      <span className="block h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></span>
    </div>}

    {results && <section className="grid gap-2">
      <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4 text-emerald-600" /> {results.filter(r => r.ok).length} imported
        {results.some(r => !r.ok) && <><XCircle className="ml-2 size-4 text-red-600" /> {results.filter(r => !r.ok).length} failed</>}
        {invalid.length > 0 && <span className="font-normal text-muted-foreground"> · {invalid.length} skipped for problems in the file</span>}</p>
      {results.some(r => !r.ok) && <ul className="max-h-40 overflow-auto rounded-lg border text-sm">
        {results.filter(r => !r.ok).map(r => <li key={r.line} className="border-b px-3 py-2 last:border-0"><span className="text-muted-foreground">Row {r.line}:</span> {r.message}</li>)}
      </ul>}
    </section>}

    <DialogFooter className="gap-2">
      <Button type="button" variant="outline" onClick={onClose} disabled={importing}>{results ? "Close" : "Cancel"}</Button>
      {!results && <Button type="button" onClick={() => void run()} disabled={!valid.length || !courseSubjectId || importing}>
        {importing ? <Loader2 className="animate-spin" /> : <Upload />}Import {valid.length || ""} {valid.length === 1 ? "question" : "questions"}
      </Button>}
    </DialogFooter>
  </>;
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, CheckCircle2, ChevronDown, Circle, CircleDot, Download, ExternalLink, FileText, FolderOpen, Loader2, NotebookText, ScrollText, Video,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { fetchFileBlob, formatBytes } from "@/lib/staff-learning-api";
import {
  MATERIAL_LABEL, studentApi,
  type CourseMaterials, type MaterialKind, type ProgressStatus, type StudentMaterial,
} from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, errorText, PageHeader, Pill } from "@/components/admin/ui";
import { useOpenFile } from "@/components/staff/materials/files";

const KIND_ICON: Record<MaterialKind, LucideIcon> = {
  PDF_NOTE: FileText, WORKSHEET: NotebookText, PREVIOUS_PAPER: ScrollText, VIDEO_LINK: Video, OTHER: FolderOpen,
};
const PROGRESS_TONES = { NOT_STARTED: "gray", IN_PROGRESS: "blue", COMPLETED: "green" } as const;
const PROGRESS_LABEL: Record<ProgressStatus, string> = { NOT_STARTED: "Not started", IN_PROGRESS: "In progress", COMPLETED: "Done" };

const allMaterials = (data: CourseMaterials) => data.subjects.flatMap(s => s.chapters.flatMap(c => c.materials));

/** Study materials of one enrolled course (?course=<courseId>), by subject and chapter, with the student's progress. */
export default function StudentMaterials() {
  const router = useRouter();
  const params = useSearchParams();
  const courses = useAdminData(studentApi.courses, "student-courses");

  // Several batches can share a course; list each course once.
  const options = [...new Map((courses.data ?? []).map(c => [c.batch.courses.id, c.batch.courses])).values()];
  const requested = Number(params.get("course"));
  const courseId = options.some(o => o.id === requested) ? requested : options[0]?.id;

  return <>
    <PageHeader title="Study materials" description="Notes, worksheets, past papers and videos from your teachers. Mark each one done as you finish it."
      actions={options.length > 1 && courseId ? <Select value={String(courseId)} onValueChange={v => router.replace(`/student/materials?course=${v}`)}>
        <SelectTrigger className="w-full sm:w-64" aria-label="Course"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.title}</SelectItem>)}</SelectContent>
      </Select> : undefined} />
    {courses.error && <ErrorAlert message={courses.error} onRetry={courses.reload} />}
    {!courses.data && !courses.error && <div className="grid gap-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>}
    {courses.data && options.length === 0 && <Card><EmptyState icon={BookOpen} title="You are not enrolled in a course yet"
      description="Once the academy enrols you in a batch, its study materials appear here." /></Card>}
    {courseId && <CourseMaterialsView key={courseId} courseId={courseId} />}
  </>;
}

function CourseMaterialsView({ courseId }: { courseId: number }) {
  const { withToken } = useAuth();
  const { data, error, reload, setData } = useAdminData(token => studentApi.courseMaterials(token, courseId), `materials:${courseId}`);
  const [saving, setSaving] = useState<number | null>(null);

  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  if (!data) return <div className="grid gap-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;

  const materials = allMaterials(data);
  const done = materials.filter(m => m.progress === "COMPLETED").length;
  const percent = materials.length ? Math.round((done / materials.length) * 100) : 0;

  const setLocal = (id: number, progress: ProgressStatus) => setData({
    ...data,
    subjects: data.subjects.map(s => ({ ...s, chapters: s.chapters.map(c => ({ ...c, materials: c.materials.map(m => m.id === id ? { ...m, progress } : m) })) })),
  });

  /** Optimistic: shows the new status at once and puts the old one back if the API refuses. */
  async function setProgress(m: StudentMaterial, progress: ProgressStatus, quiet = false) {
    const previous = m.progress;
    setLocal(m.id, progress);
    if (!quiet) setSaving(m.id);
    try {
      await withToken(token => studentApi.setProgress(token, m.id, progress));
    } catch (e) {
      setLocal(m.id, previous);
      if (!quiet) toast.error(errorText(e, "Could not save your progress."));
    } finally {
      if (!quiet) setSaving(null);
    }
  }

  if (!materials.length) return <Card><EmptyState icon={FolderOpen} title={`No materials in ${data.course.title} yet`} description="Your teachers have not published any study materials for this course. Check back later." /></Card>;

  return <>
    <Card className="gap-3 py-5">
      <CardContent className="grid gap-2 px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{data.course.title}</p>
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{done}</span> of {materials.length} done · {percent}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Materials completed">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </CardContent>
    </Card>

    {data.subjects.map(s => <Card key={s.id} className="gap-0 py-0">
      <CardHeader className="border-b py-4 [.border-b]:pb-4">
        <CardTitle>{s.subject.name}</CardTitle>
        <CardDescription>{s.chapters.length} {s.chapters.length === 1 ? "chapter" : "chapters"}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {s.chapters.map((c, i) => <Chapter key={c.id} chapter={c} defaultOpen={i === 0 || c.materials.some(m => m.progress === "IN_PROGRESS")}
          saving={saving} onProgress={setProgress} />)}
      </CardContent>
    </Card>)}
  </>;
}

function Chapter({ chapter, defaultOpen, saving, onProgress }: {
  chapter: CourseMaterials["subjects"][number]["chapters"][number];
  defaultOpen: boolean;
  saving: number | null;
  onProgress: (m: StudentMaterial, p: ProgressStatus, quiet?: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const done = chapter.materials.filter(m => m.progress === "COMPLETED").length;
  const all = chapter.materials.length;
  return <section>
    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:px-6">
      {all && done === all ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <BookOpen className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{chapter.title}</span>
        {chapter.description && <span className="block truncate text-xs text-muted-foreground">{chapter.description}</span>}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{all ? `${done}/${all} done` : "No materials yet"}</span>
      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
    </button>
    {open && all > 0 && <ul className="divide-y border-t bg-muted/20">
      {chapter.materials.map(m => <MaterialRow key={m.id} material={m} saving={saving === m.id} onProgress={onProgress} />)}
    </ul>}
  </section>;
}

function MaterialRow({ material: m, saving, onProgress }: { material: StudentMaterial; saving: boolean; onProgress: (m: StudentMaterial, p: ProgressStatus, quiet?: boolean) => void }) {
  const { withToken } = useAuth();
  const { open, busy } = useOpenFile();
  const [downloading, setDownloading] = useState(false);
  const Icon = KIND_ICON[m.kind];
  const done = m.progress === "COMPLETED";

  function openMaterial() {
    if (m.file_assets) void open(m.file_assets);
    else if (m.external_url) window.open(m.external_url, "_blank", "noopener,noreferrer");
    else return;
    // Opening counts as starting; done stays done.
    if (m.progress === "NOT_STARTED") onProgress(m, "IN_PROGRESS", true);
  }

  async function download() {
    if (!m.file_assets) return;
    setDownloading(true);
    try {
      const blob = await withToken(token => fetchFileBlob(token, m.file_assets!.id));
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: m.file_assets.original_filename });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (m.progress === "NOT_STARTED") onProgress(m, "IN_PROGRESS", true);
    } catch (e) {
      toast.error(errorText(e, "Could not download the file."));
    } finally {
      setDownloading(false);
    }
  }

  const canOpen = !!m.file_assets || !!m.external_url;
  return <li className="grid gap-3 px-4 py-3 sm:flex sm:items-center sm:px-6">
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border"><Icon className="size-4 text-muted-foreground" /></span>
      <div className="min-w-0">
        <p className="truncate font-medium">{m.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{MATERIAL_LABEL[m.kind]}</span>
          {m.file_assets && <span>{formatBytes(m.file_assets.size_bytes)}</span>}
          {!m.file_assets && m.external_url && <span>External link</span>}
          <Pill value={m.progress} label={PROGRESS_LABEL[m.progress]} tones={PROGRESS_TONES} />
        </p>
      </div>
    </div>
    <div className="flex flex-wrap gap-2 sm:shrink-0">
      <Button size="sm" onClick={openMaterial} disabled={!canOpen || busy === m.file_assets?.id}>
        {busy === m.file_assets?.id ? <Loader2 className="animate-spin" /> : <ExternalLink />}Open
      </Button>
      {m.is_downloadable && m.file_assets && <Button size="sm" variant="outline" onClick={() => void download()} disabled={downloading}>
        {downloading ? <Loader2 className="animate-spin" /> : <Download />}Download
      </Button>}
      <Button size="sm" variant={done ? "secondary" : "outline"} disabled={saving} aria-pressed={done}
        onClick={() => onProgress(m, done ? "IN_PROGRESS" : "COMPLETED")}>
        {saving ? <Loader2 className="animate-spin" /> : done ? <CheckCircle2 className="text-emerald-600" /> : m.progress === "IN_PROGRESS" ? <CircleDot /> : <Circle />}
        {done ? "Done" : "Mark as done"}
      </Button>
    </div>
  </li>;
}

/** Link from other student pages, e.g. a course card. */
export function MaterialsLink({ courseId, children, className }: { courseId: number; children: React.ReactNode; className?: string }) {
  return <Link href={`/student/materials?course=${courseId}`} className={className}>{children}</Link>;
}

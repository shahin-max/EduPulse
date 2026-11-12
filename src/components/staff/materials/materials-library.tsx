"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, ChevronDown, Download, Eye, EyeOff, FileText, FolderOpen, Layers, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { EmptyState, ErrorAlert, errorText, LoadingRows, PageHeader, Pill } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { useIsAdmin, useStaffBatches } from "@/components/staff/use-staff";
import { coursesApi, type Chapter } from "@/lib/admin-catalog-api";
import { MATERIAL_KIND_LABEL, materialsApi, type MaterialKind, type StudyMaterial } from "@/lib/staff-learning-api";
import { AddChapterDialog, DeleteMaterialDialog, MaterialFormDialog } from "./material-dialogs";
import { FileLink } from "./files";
import ProgressReport from "./progress-report";
import { cn } from "@/lib/utils";

type CourseOption = { id: number; code: string; title: string };

const KIND_TONES: Partial<Record<MaterialKind, "blue" | "violet" | "amber" | "red" | "gray">> = {
  PDF_NOTE: "blue", WORKSHEET: "violet", PREVIOUS_PAPER: "amber", VIDEO_LINK: "red", OTHER: "gray",
};

/** Study material library: course -> subject -> chapter -> materials. Used in the admin and faculty portals. */
export default function MaterialsLibrary() {
  const admin = useIsAdmin();
  const staff = useStaffBatches();
  // Admins can work on any course; faculty on the courses of the batches they teach.
  const allCourses = useAdminData(token => admin ? coursesApi.list(token) : Promise.resolve([]), `materials-courses:${admin}`);
  const courses = useMemo<CourseOption[]>(() => {
    if (admin) return (allCourses.data ?? []).filter(c => c.status !== "ARCHIVED").map(c => ({ id: c.id, code: c.code, title: c.title }));
    const seen = new Map<number, CourseOption>();
    for (const b of staff.batches) if (!seen.has(b.courses.id)) seen.set(b.courses.id, { id: b.courses.id, code: b.courses.code, title: b.courses.title });
    return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [admin, allCourses.data, staff.batches]);

  const [picked, setPicked] = useState<number | null>(null);
  const courseId = picked !== null && courses.some(c => c.id === picked) ? picked : courses[0]?.id ?? null;
  const listLoading = admin ? allCourses.loading : staff.loading;
  const listError = admin ? allCourses.error : staff.error;

  return <>
    <PageHeader title="Study materials" description="Notes, worksheets, previous papers and recorded lectures, chapter by chapter." />

    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <span className="text-sm font-medium sm:w-16">Course</span>
        <Select value={courseId ? String(courseId) : ""} onValueChange={v => setPicked(Number(v))} disabled={!courses.length}>
          <SelectTrigger className="w-full sm:w-80" aria-label="Course"><SelectValue placeholder={listLoading ? "Loading courses…" : "No courses"} /></SelectTrigger>
          <SelectContent>{courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title} ({c.code})</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <CardContent className="p-0">
        {listError && <div className="p-4"><ErrorAlert message={listError} onRetry={admin ? allCourses.reload : staff.reload} /></div>}
        {!listError && listLoading && !courses.length && <LoadingRows rows={3} />}
        {!listLoading && !listError && !courses.length && <EmptyState icon={BookOpen} title="No courses yet"
          description={admin ? "Create a course first, then add chapters and materials." : "You are not assigned to any batch yet. Ask an admin to add you to a batch."} />}
        {courseId && <Curriculum key={courseId} courseId={courseId} />}
      </CardContent>
    </Card>

    {courseId && <ProgressReport key={`p${courseId}`} batches={staff.batches.filter(b => b.courses.id === courseId)} />}
  </>;
}

function Curriculum({ courseId }: { courseId: number }) {
  const { data, error, loading, reload } = useAdminData(token => coursesApi.curriculum(token, courseId), `curriculum:${courseId}`);
  const [subjectPick, setSubjectPick] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [addingChapter, setAddingChapter] = useState(false);

  if (error) return <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>;
  if (!data) return loading ? <LoadingRows rows={4} /> : null;
  if (!data.subjects.length) return <EmptyState icon={Layers} title="No subjects on this course" description="An admin attaches subjects (Physics, Maths…) to the course on the Courses screen." />;

  const subject = data.subjects.find(s => s.id === subjectPick) ?? data.subjects[0]!;
  const toggle = (id: number) => setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const nextOrder = subject.chapters.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;

  return <>
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
      <span className="text-sm font-medium sm:w-16">Subject</span>
      <Select value={String(subject.id)} onValueChange={v => setSubjectPick(Number(v))}>
        <SelectTrigger className="w-full sm:w-80" aria-label="Subject"><SelectValue /></SelectTrigger>
        <SelectContent>{data.subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjects.name} ({s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"})</SelectItem>)}</SelectContent>
      </Select>
      <Button variant="outline" className="sm:ml-auto" onClick={() => setAddingChapter(true)}><Plus /> Add chapter</Button>
    </div>

    {subject.chapters.length === 0
      ? <EmptyState icon={FolderOpen} title={`No chapters in ${subject.subjects.name} yet`} description="Add a chapter, then add materials to it."
          action={<Button onClick={() => setAddingChapter(true)}><Plus /> Add chapter</Button>} />
      : <ul className="divide-y">
          {subject.chapters.map(ch => <li key={ch.id}>
            <button type="button" onClick={() => toggle(ch.id)} aria-expanded={expanded.has(ch.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !expanded.has(ch.id) && "-rotate-90")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{ch.title}</span>
                {ch.description && <span className="block truncate text-xs text-muted-foreground">{ch.description}</span>}
              </span>
              {!ch.is_published && <Pill value="HIDDEN" tones={{ HIDDEN: "gray" }} label="Chapter hidden" />}
            </button>
            {expanded.has(ch.id) && <ChapterMaterials chapter={ch} />}
          </li>)}
        </ul>}

    <AddChapterDialog open={addingChapter} onOpenChange={setAddingChapter} courseId={courseId} subject={{ id: subject.subjects.id, name: subject.subjects.name }}
      nextOrder={nextOrder} onSaved={ch => { reload(); setExpanded(prev => new Set(prev).add(ch.id)); }} />
  </>;
}

function ChapterMaterials({ chapter }: { chapter: Chapter }) {
  const { withToken } = useAuth();
  const { data, error, loading, reload, setData } = useAdminData(token => materialsApi.list(token, chapter.id), `materials:${chapter.id}`);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudyMaterial | undefined>();
  const [deleting, setDeleting] = useState<StudyMaterial | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const materials = data ?? [];
  const nextOrder = materials.reduce((max, m) => Math.max(max, m.sort_order), 0) + 1;

  async function togglePublished(m: StudyMaterial) {
    setToggling(m.id);
    try {
      const saved = await withToken(token => materialsApi.update(token, m.id, { isPublished: !m.is_published }));
      setData(list => list?.map(x => x.id === m.id ? saved : x) ?? null);
      toast.success(saved.is_published ? `${m.title} published` : `${m.title} hidden from students`);
    } catch (e) {
      toast.error(errorText(e, "Could not update the material."));
    } finally {
      setToggling(null);
    }
  }

  return <div className="bg-muted/30 px-4 pb-4 sm:pl-11">
    {error && <ErrorAlert message={error} onRetry={reload} />}
    {!data && loading && <LoadingRows rows={2} />}
    {data && materials.length === 0 && <p className="py-3 text-sm text-muted-foreground">No materials in this chapter yet.</p>}
    {materials.length > 0 && <ul className="grid gap-2 py-2">
      {materials.map(m => <li key={m.id} className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {m.file_assets ? <FileText className="size-4 text-muted-foreground" /> : <Link2 className="size-4 text-muted-foreground" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium break-words">{m.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Pill value={m.kind} tones={KIND_TONES} label={MATERIAL_KIND_LABEL[m.kind]} />
              <Pill value={m.is_published ? "PUBLISHED" : "DRAFT"} tones={{ PUBLISHED: "green", DRAFT: "gray" }} />
              {m.is_downloadable && <Badge variant="outline" className="gap-1 font-normal text-muted-foreground"><Download className="size-3" /> Downloadable</Badge>}
              <span className="text-xs text-muted-foreground">Order {m.sort_order}</span>
            </div>
            <div className="mt-1 min-w-0">
              {m.file_assets
                ? <FileLink file={m.file_assets} className="text-xs" />
                : m.external_url && <a href={m.external_url} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">{m.external_url}</a>}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-1">
          <IconAction label={m.is_published ? "Hide from students" : "Publish"} onClick={() => togglePublished(m)} disabled={toggling === m.id}>
            {m.is_published ? <EyeOff /> : <Eye />}
          </IconAction>
          <IconAction label="Edit" onClick={() => { setEditing(m); setFormOpen(true); }}><Pencil /></IconAction>
          <IconAction label="Delete" onClick={() => setDeleting(m)} destructive><Trash2 /></IconAction>
        </div>
      </li>)}
    </ul>}
    <Button size="sm" variant="outline" className="mt-1" onClick={() => { setEditing(undefined); setFormOpen(true); }}><Plus /> Add material</Button>

    <MaterialFormDialog open={formOpen} onOpenChange={setFormOpen} chapter={chapter} material={editing} nextOrder={nextOrder} onSaved={reload} />
    <DeleteMaterialDialog material={deleting} open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} onDone={reload} />
  </div>;
}

function IconAction({ label, onClick, children, disabled, destructive }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; destructive?: boolean }) {
  return <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} disabled={disabled}
        className={destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}>{children}</Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}


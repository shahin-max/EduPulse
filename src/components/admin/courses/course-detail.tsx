"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpDown, Eye, EyeOff, Globe, Layers, Loader2, MoreHorizontal, Pencil, Plus, Save, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { chaptersApi, coursesApi, type Chapter, type Course, type CourseSubject, type CourseWithSubjects, type Curriculum } from "@/lib/admin-catalog-api";
import { cn } from "@/lib/utils";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, errorText, formatDate, Pill } from "../ui";
import {
  archiveAction, CourseFields, courseFormValue, coursePatch, courseSaveError, CourseStatusPill, DeleteCourseDialog, primaryStatusAction, STATUS_HELP, useCourseStatus,
} from "./course-shared";
import { ChapterDialog, CourseSubjectDialog, DeleteChapterDialog, DetachSubjectDialog } from "./syllabus-dialogs";

type Loaded = { course: CourseWithSubjects; curriculum: Curriculum };
type SyllabusSubject = Curriculum["subjects"][number];

const nextOrder = (items: { sort_order: number }[]) => items.reduce((max, item) => Math.max(max, item.sort_order + 1), 0);

export default function CourseDetail({ id }: { id: number }) {
  const router = useRouter();
  const { data, error, loading, reload, setData } = useAdminData<Loaded>(
    token => Promise.all([coursesApi.get(token, id), coursesApi.curriculum(token, id)]).then(([course, curriculum]) => ({ course, curriculum })),
    String(id),
  );
  const [deleting, setDeleting] = useState(false);
  const updateCourse = (course: Course) => setData(current => current && { ...current, course: { ...current.course, ...course } });
  const { pending, setStatus } = useCourseStatus(updateCourse);

  const back = <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground"><Link href="/admin/courses"><ArrowLeft /> All courses</Link></Button>;

  if (!Number.isInteger(id) || id < 1) return <>{back}<ErrorAlert title="Not found" message="This course id is not valid." /></>;
  if (loading && !data) return <>{back}<DetailSkeleton /></>;
  if (error && !data) return <>{back}<ErrorAlert message={error} onRetry={reload} /></>;
  if (!data) return null;

  const { course, curriculum } = data;
  const primary = primaryStatusAction(course.status);
  const busy = pending === course.id;
  const live = course.status === "PUBLISHED";

  return <>
    {back}

    <Card>
      <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{course.title}</h1>
            <CourseStatusPill status={course.status} />
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{course.code} · /{course.slug}</p>
          <p className={cn("flex items-center gap-1.5 text-sm", live ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
            {live ? <Globe className="size-4 shrink-0" /> : <EyeOff className="size-4 shrink-0" />}
            {STATUS_HELP[course.status]}{!live && " Only published courses appear on the website."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant={primary.variant} disabled={busy} onClick={() => setStatus(course, primary.to)} title={primary.tip}>
            {busy ? <Loader2 className="animate-spin" /> : <primary.icon />}{primary.label}
          </Button>
          {course.status === "ARCHIVED"
            ? <Button variant="outline" disabled={busy} onClick={() => setStatus(course, "PUBLISHED")}><Globe /> Publish</Button>
            : <Button variant="outline" disabled={busy} onClick={() => setStatus(course, archiveAction.to)}><archiveAction.icon /> Archive</Button>}
          <Button variant="outline" className="col-span-2 text-destructive hover:bg-destructive/10 hover:text-destructive sm:col-span-1" onClick={() => setDeleting(true)}><Trash2 /> Delete</Button>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Course details</CardTitle>
          <CardDescription>Created {formatDate(course.created_at)} · updated {formatDate(course.updated_at, true)}</CardDescription>
        </CardHeader>
        <CardContent><CourseForm key={course.id} course={course} onSaved={updateCourse} /></CardContent>
      </Card>

      <div className="lg:col-span-3"><Syllabus courseId={course.id} subjects={curriculum.subjects} onChanged={reload} /></div>
    </div>

    <DeleteCourseDialog course={deleting ? course : null} open={deleting} onOpenChange={setDeleting}
      onDeleted={() => router.push("/admin/courses")} onArchived={updateCourse} />
  </>;
}

function CourseForm({ course, onSaved }: { course: Course; onSaved: (course: Course) => void }) {
  const { withToken } = useAuth();
  const [value, setValue] = useState(() => courseFormValue(course));
  const [slugTouched, setSlugTouched] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Status is changed with the buttons above, never from this form.
  const patch = coursePatch({ ...value, status: course.status }, course);
  const dirty = Object.keys(patch).length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setError("");
    try {
      const updated = await withToken(token => coursesApi.update(token, course.id, patch));
      onSaved(updated);
      toast.success("Course saved");
    } catch (e) {
      setError(courseSaveError(e));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <CourseFields value={value} onChange={setValue} slugTouched={slugTouched} onSlugTouched={() => setSlugTouched(true)} />
    {patch.slug !== undefined && course.status === "PUBLISHED" && <p className="text-xs text-amber-700 dark:text-amber-300">Changing the slug changes the course&apos;s website address; old links will stop working.</p>}
    {error && <ErrorAlert title="Could not save" message={error} />}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {dirty && <Button type="button" variant="outline" onClick={() => { setValue(courseFormValue(course)); setError(""); }}>Discard</Button>}
      <Button type="submit" disabled={busy || !dirty}>{busy ? <Loader2 className="animate-spin" /> : <Save />}Save changes</Button>
    </div>
  </form>;
}

type ChapterTarget = { subject: SyllabusSubject; chapter?: Chapter };

function Syllabus({ courseId, subjects, onChanged }: { courseId: number; subjects: SyllabusSubject[]; onChanged: () => void }) {
  const { withToken } = useAuth();
  const [subjectDialog, setSubjectDialog] = useState<{ editing?: CourseSubject } | null>(null);
  const [detaching, setDetaching] = useState<SyllabusSubject | null>(null);
  const [chapterTarget, setChapterTarget] = useState<ChapterTarget | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  async function togglePublished(chapter: Chapter) {
    setToggling(chapter.id);
    try {
      await withToken(token => chaptersApi.update(token, chapter.id, { isPublished: !chapter.is_published }));
      toast.success(chapter.is_published ? `${chapter.title} hidden from students` : `${chapter.title} published`);
      onChanged();
    } catch (e) {
      toast.error(errorText(e, "Could not update the chapter."));
    } finally {
      setToggling(null);
    }
  }

  const chapterCount = subjects.reduce((n, s) => n + s.chapters.length, 0);

  return <Card>
    <CardHeader>
      <CardTitle>Subjects & chapters</CardTitle>
      <CardDescription>{subjects.length} subject{subjects.length === 1 ? "" : "s"} · {chapterCount} chapter{chapterCount === 1 ? "" : "s"}. Students see only published chapters.</CardDescription>
      <CardAction><Button size="sm" onClick={() => setSubjectDialog({})}><Plus /> <span className="hidden sm:inline">Add</span> subject</Button></CardAction>
    </CardHeader>
    <CardContent className="grid gap-4">
      {subjects.length === 0 && <EmptyState icon={Layers} title="No subjects on this course" description="Attach subjects like Physics or Chemistry, then add chapters to each."
        action={<Button variant="outline" onClick={() => setSubjectDialog({})}><Plus /> Add subject</Button>} />}
      {subjects.map(s => <section key={s.id} className="rounded-lg border">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{s.subjects.name}</h3>
            <p className="text-xs text-muted-foreground"><span className="font-mono">{s.subjects.code}</span> · order {s.sort_order} · {s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setChapterTarget({ subject: s })}><Plus /> Chapter</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`More actions for ${s.subjects.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSubjectDialog({ editing: s })}><ArrowUpDown /> Change position</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDetaching(s)}><Unlink /> Remove from course</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {s.chapters.length === 0
          ? <p className="px-3 py-4 text-sm text-muted-foreground">No chapters yet.</p>
          : <ol className="divide-y">
            {s.chapters.map(ch => <li key={ch.id} className="flex items-start gap-3 px-3 py-2.5">
              <span className="mt-0.5 w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{ch.sort_order}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="min-w-0 break-words text-sm font-medium">{ch.title}</p>
                  {!ch.is_published && <Pill value="DRAFT" tones={{ DRAFT: "amber" }} label="Unpublished" />}
                </div>
                {ch.description && <p className="line-clamp-2 text-xs text-muted-foreground">{ch.description}</p>}
              </div>
              <div className="flex shrink-0 items-center">
                <IconAction label={ch.is_published ? "Unpublish (hide from students)" : "Publish to students"} onClick={() => togglePublished(ch)} disabled={toggling === ch.id}>
                  {toggling === ch.id ? <Loader2 className="animate-spin" /> : ch.is_published ? <Eye /> : <EyeOff />}
                </IconAction>
                <IconAction label="Edit chapter" onClick={() => setChapterTarget({ subject: s, chapter: ch })}><Pencil /></IconAction>
                <IconAction label="Delete chapter" onClick={() => setDeletingChapter(ch)} destructive><Trash2 /></IconAction>
              </div>
            </li>)}
          </ol>}
      </section>)}
    </CardContent>

    <CourseSubjectDialog open={!!subjectDialog} onOpenChange={open => { if (!open) setSubjectDialog(null); }} courseId={courseId}
      attached={subjects.map(s => s.subject_id)} editing={subjectDialog?.editing} nextOrder={nextOrder(subjects)} onSaved={onChanged} />
    <DetachSubjectDialog courseId={courseId} subject={detaching} chapterCount={detaching?.chapters.length ?? 0} open={!!detaching}
      onOpenChange={open => { if (!open) setDetaching(null); }} onDone={onChanged} />
    <ChapterDialog open={!!chapterTarget} onOpenChange={open => { if (!open) setChapterTarget(null); }} courseId={courseId}
      subject={chapterTarget?.subject ?? null} chapter={chapterTarget?.chapter} nextOrder={nextOrder(chapterTarget?.subject.chapters ?? [])} onSaved={onChanged} />
    <DeleteChapterDialog chapter={deletingChapter} open={!!deletingChapter} onOpenChange={open => { if (!open) setDeletingChapter(null); }} onDone={onChanged} />
  </Card>;
}

/** Icon button with a tooltip; touch targets stay 36px. */
function IconAction({ label, onClick, disabled, destructive, children }: { label: string; onClick: () => void; disabled?: boolean; destructive?: boolean; children: React.ReactNode }) {
  return <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="ghost" aria-label={label} onClick={onClick} disabled={disabled}
        className={destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}>{children}</Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}

function DetailSkeleton() {
  return <>
    <Card><CardContent className="grid gap-3"><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2"><CardContent className="grid gap-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</CardContent></Card>
      <Card className="lg:col-span-3"><CardContent className="grid gap-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}</CardContent></Card>
    </div>
  </>;
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { chaptersApi, coursesApi, subjectsApi, type Chapter, type ChapterUpdate, type CourseSubject } from "@/lib/admin-catalog-api";
import { useAdminData } from "../use-admin-data";
import { ErrorAlert, errorText, Field, Optional } from "../ui";

const toInt = (value: string) => Number.parseInt(value, 10) || 0;

// ---- Attach a subject / change its position ----

/** Attach a subject to the course, or change the position of `editing`. */
export function CourseSubjectDialog({ open, onOpenChange, courseId, attached, editing, nextOrder, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  /** Subject ids already on the course. */
  attached: number[];
  editing?: CourseSubject;
  nextOrder: number;
  onSaved: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      {open && <CourseSubjectForm courseId={courseId} attached={attached} editing={editing} nextOrder={nextOrder} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function CourseSubjectForm({ courseId, attached, editing, nextOrder, onSaved, onClose }: {
  courseId: number;
  attached: number[];
  editing?: CourseSubject;
  nextOrder: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const subjects = useAdminData(token => editing ? Promise.resolve([]) : subjectsApi.list(token), editing ? "none" : "subjects");
  const available = (subjects.data ?? []).filter(s => !attached.includes(s.id));
  const [subjectId, setSubjectId] = useState("");
  const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? nextOrder));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = editing?.subject_id ?? Number(subjectId);
    if (!id) return setError("Choose a subject.");
    setBusy(true);
    setError("");
    try {
      const saved = await withToken(token => coursesApi.attachSubject(token, courseId, id, toInt(sortOrder)));
      toast.success(editing ? "Position saved" : `${saved.subjects.name} added to the course`);
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{editing ? `Move ${editing.subjects.name}` : "Add subject"}</DialogTitle>
      <DialogDescription>{editing ? "Subjects are listed in sort order on the course syllabus." : "Attach a subject, then add its chapters."}</DialogDescription>
    </DialogHeader>
    {!editing && <Field id="attach-subject" label="Subject" hint={<>Missing one? <Link href="/admin/courses?tab=subjects" className="underline underline-offset-2">Create it in Subjects</Link>.</>}>
      {subjects.error ? <ErrorAlert message={subjects.error} onRetry={subjects.reload} />
        : !subjects.data ? <Skeleton className="h-9 w-full" />
        : available.length === 0 ? <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Every subject is already on this course.</p>
        : <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger id="attach-subject" className="w-full"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
          <SelectContent>{available.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} <span className="font-mono text-xs text-muted-foreground">{s.code}</span></SelectItem>)}</SelectContent>
        </Select>}
    </Field>}
    <Field id="attach-order" label="Sort order" hint="Lower numbers are listed first.">
      <Input id="attach-order" type="number" inputMode="numeric" step={1} value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
    </Field>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy || (!editing && available.length === 0)}>{busy && <Loader2 className="animate-spin" />}{editing ? "Save" : "Add subject"}</Button>
    </DialogFooter>
  </form>;
}

export function DetachSubjectDialog({ courseId, subject, chapterCount, open, onOpenChange, onDone }: {
  courseId: number;
  subject: CourseSubject | null;
  chapterCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function remove(event: React.MouseEvent) {
    event.preventDefault();
    if (!subject) return;
    setBusy(true);
    try {
      await withToken(token => coursesApi.detachSubject(token, courseId, subject.subject_id));
      toast.success(`${subject.subjects.name} removed from the course`);
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(errorText(e, "Could not remove the subject."), e instanceof ApiError && e.status === 409
        ? { description: "Questions or chapters still belong to this subject on this course. Remove them first." } : undefined);
    } finally {
      setBusy(false);
    }
  }
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove {subject?.subjects.name} from this course?</AlertDialogTitle>
        <AlertDialogDescription>
          {chapterCount > 0
            ? `It still has ${chapterCount} chapter${chapterCount === 1 ? "" : "s"}. Delete those chapters first; unpublishing them is not enough.`
            : "The subject itself is kept and stays available for other courses."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={remove} disabled={busy || chapterCount > 0} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Remove</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

// ---- Chapters ----

/** Add a chapter to a course subject, or edit `chapter`. */
export function ChapterDialog({ open, onOpenChange, courseId, subject, chapter, nextOrder, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  subject: CourseSubject | null;
  chapter?: Chapter;
  nextOrder: number;
  onSaved: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && subject && <ChapterForm courseId={courseId} subject={subject} chapter={chapter} nextOrder={nextOrder} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function ChapterForm({ courseId, subject, chapter, nextOrder, onSaved, onClose }: {
  courseId: number;
  subject: CourseSubject;
  chapter?: Chapter;
  nextOrder: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const [title, setTitle] = useState(chapter?.title ?? "");
  const [description, setDescription] = useState(chapter?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(chapter?.sort_order ?? nextOrder));
  const [published, setPublished] = useState(chapter?.is_published ?? false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { title: title.trim(), description: description.trim(), sortOrder: toInt(sortOrder), isPublished: published };
    setBusy(true);
    setError("");
    try {
      if (chapter) {
        const patch: ChapterUpdate = {};
        if (next.title !== chapter.title) patch.title = next.title;
        if (next.description !== (chapter.description?.trim() ?? "")) patch.description = next.description || null;
        if (next.sortOrder !== chapter.sort_order) patch.sortOrder = next.sortOrder;
        if (next.isPublished !== chapter.is_published) patch.isPublished = next.isPublished;
        if (Object.keys(patch).length) await withToken(token => chaptersApi.update(token, chapter.id, patch));
        toast.success("Chapter saved");
      } else {
        await withToken(token => chaptersApi.create(token, {
          courseId, subjectId: subject.subject_id, title: next.title, sortOrder: next.sortOrder, isPublished: next.isPublished,
          ...(next.description ? { description: next.description } : {}),
        }));
        toast.success(`${next.title} added`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the chapter."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{chapter ? "Edit chapter" : "Add chapter"}</DialogTitle>
      <DialogDescription>{subject.subjects.name}</DialogDescription>
    </DialogHeader>
    <Field id="chapter-title" label="Title">
      <Input id="chapter-title" required minLength={2} maxLength={200} value={title} placeholder="Laws of Motion" onChange={e => setTitle(e.target.value)} autoComplete="off" />
    </Field>
    <Field id="chapter-description" label={<>Description <Optional /></>}>
      <Textarea id="chapter-description" rows={3} maxLength={20000} value={description} onChange={e => setDescription(e.target.value)} />
    </Field>
    <Field id="chapter-order" label="Sort order" hint="Lower numbers are listed first.">
      <Input id="chapter-order" type="number" inputMode="numeric" step={1} value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
    </Field>
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Checkbox id="chapter-published" checked={published} onCheckedChange={v => setPublished(v === true)} className="mt-0.5" />
      <div className="grid gap-1">
        <Label htmlFor="chapter-published">Published</Label>
        <p className="text-xs text-muted-foreground">Students and visitors see published chapters of published courses. Unpublished chapters are visible only to admins and faculty.</p>
      </div>
    </div>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{chapter ? "Save changes" : "Add chapter"}</Button>
    </DialogFooter>
  </form>;
}

export function DeleteChapterDialog({ chapter, open, onOpenChange, onDone }: {
  chapter: Chapter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState("");
  const close = (next: boolean) => { onOpenChange(next); if (!next) setConflict(""); };

  async function run(event: React.MouseEvent, action: "delete" | "unpublish") {
    event.preventDefault();
    if (!chapter) return;
    setBusy(true);
    try {
      if (action === "delete") await withToken(token => chaptersApi.remove(token, chapter.id));
      else await withToken(token => chaptersApi.update(token, chapter.id, { isPublished: false }));
      toast.success(action === "delete" ? `${chapter.title} deleted` : `${chapter.title} unpublished`);
      close(false);
      onDone();
    } catch (e) {
      if (action === "delete" && e instanceof ApiError && e.status === 409) setConflict(e.message);
      else toast.error(errorText(e, "Could not update the chapter."));
    } finally {
      setBusy(false);
    }
  }

  const canUnpublish = !!chapter?.is_published;
  return <AlertDialog open={open} onOpenChange={close}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{conflict ? "This chapter cannot be deleted" : `Delete ${chapter?.title}?`}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="grid gap-2">
            {conflict ? <>
              <p className="font-medium text-foreground">{conflict}.</p>
              <p>Study materials or questions still belong to it. {canUnpublish ? "Unpublish it instead to hide it from students." : "It is already unpublished and hidden from students."}</p>
            </> : <p>Chapters with study materials or questions cannot be deleted; unpublish those instead.</p>}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>{conflict ? "Close" : "Cancel"}</AlertDialogCancel>
        {conflict
          ? canUnpublish && <AlertDialogAction onClick={e => run(e, "unpublish")} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Unpublish instead</AlertDialogAction>
          : <AlertDialogAction onClick={e => run(e, "delete")} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Delete chapter</AlertDialogAction>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

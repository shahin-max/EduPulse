"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, EyeOff, Globe, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  CODE_PATTERN, COURSE_STATUSES, coursesApi, SLUG_PATTERN, slugify, type Course, type CourseInput, type CourseStatus,
} from "@/lib/admin-catalog-api";
import { cn } from "@/lib/utils";
import { ErrorAlert, errorText, Field, Optional, Pill, titleCase, type Tone } from "../ui";

export const COURSE_TONES: Record<CourseStatus, Tone> = { PUBLISHED: "green", DRAFT: "amber", ARCHIVED: "gray" };

export const STATUS_HELP: Record<CourseStatus, string> = {
  PUBLISHED: "Visible on the public website.",
  DRAFT: "Hidden from the website while you prepare it.",
  ARCHIVED: "Retired: hidden from the website, kept for history.",
};

export function CourseStatusPill({ status, className }: { status: CourseStatus; className?: string }) {
  return <Pill value={status} tones={COURSE_TONES} label={status === "PUBLISHED" ? "Published" : titleCase(status)} className={className} />;
}

/** A row of buttons that behaves like tabs (there is no tabs component in the kit). */
export function SegmentedTabs<T extends string>({ value, onChange, tabs, label }: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: React.ReactNode }[];
  label: string;
}) {
  return <div role="tablist" aria-label={label} className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto">
    {tabs.map(tab => <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)}
      className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:flex-none",
        value === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
      {tab.label}
    </button>)}
  </div>;
}

const STATUS_TOAST: Record<CourseStatus, (title: string) => string> = {
  PUBLISHED: title => `${title} is now live on the website`,
  DRAFT: title => `${title} moved to draft and hidden from the website`,
  ARCHIVED: title => `${title} archived and hidden from the website`,
};

/** Changes a course's status with a toast; `pending` is the course id being changed. */
export function useCourseStatus(onChanged: (course: Course) => void) {
  const { withToken } = useAuth();
  const [pending, setPending] = useState<number | null>(null);
  async function setStatus(course: Pick<Course, "id" | "title">, status: CourseStatus) {
    setPending(course.id);
    try {
      const updated = await withToken(token => coursesApi.update(token, course.id, { status }));
      toast.success(STATUS_TOAST[status](course.title));
      onChanged(updated);
    } catch (e) {
      toast.error(errorText(e, "Could not change the status."));
    } finally {
      setPending(null);
    }
  }
  return { pending, setStatus };
}

/** The one obvious status action for a course: Publish a draft, Unpublish a live course, Restore an archived one. */
export function primaryStatusAction(status: CourseStatus): { label: string; to: CourseStatus; icon: typeof Globe; variant: "default" | "outline"; tip: string } {
  if (status === "DRAFT") return { label: "Publish", to: "PUBLISHED", icon: Globe, variant: "default", tip: "Show this course on the public website" };
  if (status === "PUBLISHED") return { label: "Unpublish", to: "DRAFT", icon: EyeOff, variant: "outline", tip: "Hide from the website (back to draft)" };
  return { label: "Restore", to: "DRAFT", icon: ArchiveRestore, variant: "outline", tip: "Bring back as a draft" };
}

export const archiveAction = { label: "Archive", to: "ARCHIVED" as CourseStatus, icon: Archive };

/** Fields shared by "Add course" and the course detail form. Slug follows the title until edited. */
export function CourseFields({ value, onChange, slugTouched, onSlugTouched, showStatus }: {
  value: CourseFormValue;
  onChange: (value: CourseFormValue) => void;
  slugTouched: boolean;
  onSlugTouched: () => void;
  showStatus?: boolean;
}) {
  const set = (patch: Partial<CourseFormValue>) => onChange({ ...value, ...patch });
  return <>
    <Field id="course-title" label="Title">
      <Input id="course-title" required minLength={2} maxLength={200} value={value.title} placeholder="JEE Main & Advanced"
        onChange={e => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} autoComplete="off" />
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="course-code" label="Code" hint="Short unique code, e.g. JEE or NEET-2027.">
        <Input id="course-code" required maxLength={40} pattern={CODE_PATTERN} title="Letters, digits, - and _" value={value.code} className="uppercase"
          onChange={e => set({ code: e.target.value.toUpperCase() })} autoComplete="off" />
      </Field>
      <Field id="course-slug" label="Slug" hint="Used in the website address of the course.">
        <Input id="course-slug" required minLength={2} maxLength={160} pattern={SLUG_PATTERN} title="Lowercase letters, digits and single hyphens" value={value.slug}
          onChange={e => { onSlugTouched(); set({ slug: e.target.value.toLowerCase() }); }} autoComplete="off" />
      </Field>
    </div>
    <Field id="course-description" label={<>Description <Optional /></>}>
      <Textarea id="course-description" rows={4} maxLength={20000} value={value.description} onChange={e => set({ description: e.target.value })} />
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="course-order" label="Sort order" hint="Lower numbers are listed first.">
        <Input id="course-order" type="number" inputMode="numeric" step={1} value={value.sortOrder} onChange={e => set({ sortOrder: e.target.value })} />
      </Field>
      {showStatus && <Field id="course-status" label="Status" hint={STATUS_HELP[value.status]}>
        <Select value={value.status} onValueChange={v => set({ status: v as CourseStatus })}>
          <SelectTrigger id="course-status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{COURSE_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>}
    </div>
  </>;
}

export type CourseFormValue = { title: string; code: string; slug: string; description: string; sortOrder: string; status: CourseStatus };

export const courseFormValue = (course?: Course): CourseFormValue => ({
  title: course?.title ?? "",
  code: course?.code ?? "",
  slug: course?.slug ?? "",
  description: course?.description ?? "",
  sortOrder: String(course?.sort_order ?? 0),
  status: course?.status ?? "DRAFT",
});

/** Only the fields that differ from `course` (all of them when creating). Cleared description becomes null. */
export function coursePatch(value: CourseFormValue, course?: Course): Partial<CourseInput> {
  const next: CourseInput = {
    title: value.title.trim(),
    code: value.code.trim().toUpperCase(),
    slug: value.slug.trim().toLowerCase(),
    description: value.description.trim() || null,
    sortOrder: Number.parseInt(value.sortOrder, 10) || 0,
    status: value.status,
  };
  if (!course) {
    const { description, ...rest } = next;
    return description ? next : rest;
  }
  const patch: Partial<CourseInput> = {};
  if (next.title !== course.title) patch.title = next.title;
  if (next.code !== course.code) patch.code = next.code;
  if (next.slug !== course.slug) patch.slug = next.slug;
  if (next.description !== (course.description?.trim() || null)) patch.description = next.description;
  if (next.sortOrder !== course.sort_order) patch.sortOrder = next.sortOrder;
  if (next.status !== course.status) patch.status = next.status;
  return patch;
}

/** 409 on create/update means the code or slug is taken. */
export const courseSaveError = (e: unknown) =>
  e instanceof ApiError && e.status === 409 ? "Another course already uses this code or slug." : errorText(e, "Could not save the course.");

export function CreateCourseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <CreateCourseForm onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function CreateCourseForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { withToken } = useAuth();
  const [value, setValue] = useState(courseFormValue());
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await withToken(token => coursesApi.create(token, coursePatch(value) as CourseInput));
      toast.success(`${created.title} created`, { description: created.status === "PUBLISHED" ? "It is live on the website." : "Add its subjects, then publish it when ready." });
      onClose();
      router.push(`/admin/courses/${created.id}`);
    } catch (e) {
      setError(courseSaveError(e));
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Add course</DialogTitle>
      <DialogDescription>New courses start as drafts. Only published courses appear on the website.</DialogDescription>
    </DialogHeader>
    <CourseFields value={value} onChange={setValue} slugTouched={slugTouched} onSlugTouched={() => setSlugTouched(true)} showStatus />
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Create course</Button>
    </DialogFooter>
  </form>;
}

/** Delete a course. A 409 (it has chapters) offers archiving instead. */
export function DeleteCourseDialog({ course, open, onOpenChange, onDeleted, onArchived }: {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (course: Course) => void;
  onArchived: (course: Course) => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState("");

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) setConflict("");
  }

  async function remove(event: React.MouseEvent) {
    event.preventDefault();
    if (!course) return;
    setBusy(true);
    try {
      await withToken(token => coursesApi.remove(token, course.id));
      toast.success(`${course.title} deleted`);
      close(false);
      onDeleted(course);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(e.message);
      else toast.error(errorText(e, "Could not delete the course."));
    } finally {
      setBusy(false);
    }
  }

  async function archive(event: React.MouseEvent) {
    event.preventDefault();
    if (!course) return;
    setBusy(true);
    try {
      const updated = await withToken(token => coursesApi.update(token, course.id, { status: "ARCHIVED" }));
      toast.success(`${course.title} archived and hidden from the website`);
      close(false);
      onArchived(updated);
    } catch (e) {
      toast.error(errorText(e, "Could not archive the course."));
    } finally {
      setBusy(false);
    }
  }

  const canArchive = course?.status !== "ARCHIVED";
  return <AlertDialog open={open} onOpenChange={close}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{conflict ? "This course cannot be deleted" : `Delete ${course?.title}?`}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="grid gap-2">
            {conflict ? <>
              <p className="font-medium text-foreground">{conflict}.</p>
              <p>Courses with chapters, batches, fee plans or exams are kept for history. {canArchive ? "Archive it instead: it disappears from the website and stays in your records." : "It is already archived and hidden from the website."}</p>
            </> : <p>This permanently removes the course and its subject links. Only courses nothing depends on can be deleted. To just hide it from the website, archive it instead.</p>}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>{conflict ? "Close" : "Cancel"}</AlertDialogCancel>
        {conflict
          ? canArchive && <AlertDialogAction onClick={archive} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Archive />}Archive instead</AlertDialogAction>
          : <AlertDialogAction onClick={remove} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Delete course</AlertDialogAction>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

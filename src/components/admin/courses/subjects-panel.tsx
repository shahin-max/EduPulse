"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Layers, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { CODE_PATTERN, subjectsApi, type CourseWithSubjects, type Subject, type SubjectInput } from "@/lib/admin-catalog-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, errorText, Field, formatDate, LoadingRows } from "../ui";

/** Subjects tab of /admin/courses. `courses` (all statuses) tells which courses use each subject. */
export default function SubjectsPanel({ courses, onChanged }: { courses: CourseWithSubjects[]; onChanged: () => void }) {
  const { data, error, loading, reload } = useAdminData(token => subjectsApi.list(token), "subjects");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | undefined>();
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const usedBy = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const c of courses) for (const cs of c.course_subjects) map.set(cs.subject_id, [...(map.get(cs.subject_id) ?? []), c.title]);
    return map;
  }, [courses]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(s => !term || s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term));
  }, [data, search]);

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const actions: RowActions = { edit: s => { setEditing(s); setFormOpen(true); }, remove: setDeleting, usedBy: s => usedBy.get(s.id) ?? [] };
  const saved = () => { reload(); onChanged(); };

  return <>
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search subjects" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" aria-label="Search subjects" />
        </div>
        <Button onClick={openCreate}><Plus /> Add subject</Button>
      </div>
      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && rows.length === 0 && (data.length === 0
          ? <EmptyState icon={Layers} title="No subjects yet" description="Add subjects like Physics or Mathematics, then attach them to courses." action={<Button onClick={openCreate}><Plus /> Add subject</Button>} />
          : <EmptyState icon={Search} title="No subjects match" description="Try a different search." />)}
        {rows.length > 0 && <>
          <SubjectsTable subjects={rows} actions={actions} />
          <SubjectsCards subjects={rows} actions={actions} />
        </>}
      </CardContent>
    </Card>
    <p className="text-xs text-muted-foreground">Subjects are shared by courses, batches, classes, exams and assignments. Attach them to a course from the course&apos;s page.</p>

    <SubjectFormDialog open={formOpen} onOpenChange={setFormOpen} subject={editing} onSaved={saved} />
    <DeleteSubjectDialog subject={deleting} usedBy={deleting ? actions.usedBy(deleting) : []} open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} onDeleted={saved} />
  </>;
}

type RowActions = { edit: (s: Subject) => void; remove: (s: Subject) => void; usedBy: (s: Subject) => string[] };

function UsedBy({ titles }: { titles: string[] }) {
  if (!titles.length) return <span className="text-muted-foreground">Not used</span>;
  return <span className="text-muted-foreground" title={titles.join(", ")}>{titles.length} course{titles.length === 1 ? "" : "s"}</span>;
}

function RowButtons({ subject, actions, labels }: { subject: Subject; actions: RowActions; labels?: boolean }) {
  const items = [
    { label: "Edit", icon: Pencil, onClick: () => actions.edit(subject) },
    { label: "Delete", icon: Trash2, onClick: () => actions.remove(subject), destructive: true },
  ];
  return <div className={labels ? "grid grid-cols-2 gap-2" : "flex justify-end gap-1"}>
    {items.map(({ label, icon: Icon, onClick, destructive }) => {
      const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
      const button = <Button variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className} onClick={onClick} aria-label={`${label} ${subject.name}`}><Icon />{labels && label}</Button>;
      if (labels) return <span key={label} className="contents">{button}</span>;
      return <Tooltip key={label}><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
    })}
  </div>;
}

function SubjectsTable({ subjects, actions }: { subjects: Subject[]; actions: RowActions }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Subject</TableHead>
        <TableHead>Code</TableHead>
        <TableHead>Used by</TableHead>
        <TableHead className="hidden lg:table-cell">Added</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {subjects.map(s => <TableRow key={s.id}>
        <TableCell className="pl-4 font-medium">{s.name}</TableCell>
        <TableCell className="font-mono text-xs">{s.code}</TableCell>
        <TableCell><UsedBy titles={actions.usedBy(s)} /></TableCell>
        <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(s.created_at)}</TableCell>
        <TableCell className="pr-4"><RowButtons subject={s} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function SubjectsCards({ subjects, actions }: { subjects: Subject[]; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {subjects.map(s => <li key={s.id} className="grid gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{s.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
        </div>
        <span className="shrink-0 text-xs"><UsedBy titles={actions.usedBy(s)} /></span>
      </div>
      <RowButtons subject={s} actions={actions} labels />
    </li>)}
  </ul>;
}

/** Add a subject, or edit one when `subject` is given. */
export function SubjectFormDialog({ open, onOpenChange, subject, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject;
  onSaved: (subject: Subject) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      {open && <SubjectForm subject={subject} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function SubjectForm({ subject, onSaved, onClose }: { subject?: Subject; onSaved: (subject: Subject) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [name, setName] = useState(subject?.name ?? "");
  const [code, setCode] = useState(subject?.code ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SubjectInput = { name: name.trim(), code: code.trim().toUpperCase() };
    const patch: Partial<SubjectInput> = subject ? {
      ...(input.name !== subject.name ? { name: input.name } : {}),
      ...(input.code !== subject.code ? { code: input.code } : {}),
    } : input;
    if (subject && !Object.keys(patch).length) return onClose();
    setBusy(true);
    setError("");
    try {
      const saved = await withToken(token => subject ? subjectsApi.update(token, subject.id, patch) : subjectsApi.create(token, input));
      toast.success(subject ? "Subject saved" : `${saved.name} added`);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? "Another subject already uses this code." : errorText(e, "Could not save the subject."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{subject ? "Edit subject" : "Add subject"}</DialogTitle>
      <DialogDescription>{subject ? "Renaming updates every course, batch and exam that uses it." : "Subjects can be attached to any number of courses."}</DialogDescription>
    </DialogHeader>
    <Field id="subject-name" label="Name">
      <Input id="subject-name" required minLength={2} maxLength={120} value={name} placeholder="Physics" onChange={e => setName(e.target.value)} autoComplete="off" />
    </Field>
    <Field id="subject-code" label="Code" hint="Short unique code, e.g. PHY. Letters, digits, - and _.">
      <Input id="subject-code" required maxLength={50} pattern={CODE_PATTERN} title="Letters, digits, - and _" value={code} className="uppercase" placeholder="PHY"
        onChange={e => setCode(e.target.value.toUpperCase())} autoComplete="off" />
    </Field>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{subject ? "Save changes" : "Add subject"}</Button>
    </DialogFooter>
  </form>;
}

function DeleteSubjectDialog({ subject, usedBy, open, onOpenChange, onDeleted }: {
  subject: Subject | null;
  usedBy: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function remove(event: React.MouseEvent) {
    event.preventDefault();
    if (!subject) return;
    setBusy(true);
    try {
      await withToken(token => subjectsApi.remove(token, subject.id));
      toast.success(`${subject.name} deleted`);
      onOpenChange(false);
      onDeleted();
    } catch (e) {
      toast.error(errorText(e, "Could not delete the subject."), e instanceof ApiError && e.status === 409
        ? { description: "It is still used by a course, batch, class, exam or assignment. Remove it from those first; subjects in use cannot be deleted." }
        : undefined);
    } finally {
      setBusy(false);
    }
  }
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {subject?.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          {usedBy.length
            ? `It is attached to ${usedBy.join(", ")}, so it cannot be deleted. Remove it from ${usedBy.length === 1 ? "that course" : "those courses"} first.`
            : "Subjects still used by a batch, class, exam or assignment cannot be deleted."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={remove} disabled={busy || usedBy.length > 0} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Delete subject</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

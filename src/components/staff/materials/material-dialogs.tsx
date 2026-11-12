"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2, Upload } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { ErrorAlert, errorText, Field, Optional } from "@/components/admin/ui";
import { chaptersApi, type Chapter } from "@/lib/admin-catalog-api";
import {
  MATERIAL_KIND_LABEL, MATERIAL_KINDS, materialsApi, type FileAsset, type MaterialKind, type MaterialUpdate, type StudyMaterial,
} from "@/lib/staff-learning-api";
import { FileUploadField } from "./files";
import { cn } from "@/lib/utils";

type Source = "file" | "link";

/** Add a material to a chapter, or edit one when `material` is given. */
export function MaterialFormDialog({ open, onOpenChange, chapter, material, nextOrder, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Pick<Chapter, "id" | "title"> | null;
  material?: StudyMaterial;
  nextOrder: number;
  onSaved: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && chapter && <MaterialForm chapter={chapter} material={material} nextOrder={nextOrder} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function MaterialForm({ chapter, material, nextOrder, onSaved, onClose }: {
  chapter: Pick<Chapter, "id" | "title">;
  material?: StudyMaterial;
  nextOrder: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const [title, setTitle] = useState(material?.title ?? "");
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? "PDF_NOTE");
  const [source, setSource] = useState<Source>(material ? (material.file_assets ? "file" : "link") : "file");
  const [file, setFile] = useState<FileAsset | null>(material?.file_assets ?? null);
  const [url, setUrl] = useState(material?.external_url ?? "");
  const [downloadable, setDownloadable] = useState(material?.is_downloadable ?? true);
  const [published, setPublished] = useState(material?.is_published ?? false);
  const [sortOrder, setSortOrder] = useState(String(material?.sort_order ?? nextOrder));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function changeKind(value: MaterialKind) {
    setKind(value);
    if (!material && value === "VIDEO_LINK" && !file) setSource("link");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const link = url.trim();
    if (source === "file" && !file) { setError("Upload a file, or switch to a link."); return; }
    if (source === "link" && !/^https?:\/\//i.test(link)) { setError("Enter a link starting with http:// or https://."); return; }
    const order = Number.parseInt(sortOrder, 10);
    setSaving(true);
    try {
      if (material) {
        const input: MaterialUpdate = {};
        if (title.trim() !== material.title) input.title = title.trim();
        if (kind !== material.kind) input.kind = kind;
        if (source === "file") {
          if (file!.id !== material.asset_id) input.assetId = file!.id;
          if (material.external_url) input.externalUrl = null;
        } else {
          if (link !== material.external_url) input.externalUrl = link;
          if (material.asset_id) input.assetId = null;
        }
        if (downloadable !== material.is_downloadable) input.isDownloadable = downloadable;
        if (published !== material.is_published) input.isPublished = published;
        if (Number.isFinite(order) && order !== material.sort_order) input.sortOrder = order;
        if (Object.keys(input).length) await withToken(token => materialsApi.update(token, material.id, input));
        toast.success("Material saved");
      } else {
        await withToken(token => materialsApi.create(token, {
          chapterId: chapter.id,
          title: title.trim(),
          kind,
          ...(source === "file" ? { assetId: file!.id } : { externalUrl: link }),
          isDownloadable: downloadable,
          isPublished: published,
          ...(Number.isFinite(order) ? { sortOrder: order } : {}),
        }));
        toast.success(published ? "Material added and published" : "Material added as a draft");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the material."));
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <DialogHeader>
      <DialogTitle>{material ? "Edit material" : "Add material"}</DialogTitle>
      <DialogDescription>Chapter: {chapter.title}</DialogDescription>
    </DialogHeader>
    {error && <ErrorAlert title="Could not save" message={error} />}

    <Field id="m-title" label="Title">
      <Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} required minLength={2} maxLength={200} placeholder="Laws of Motion - class notes" />
    </Field>

    <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
      <Field id="m-kind" label="Kind">
        <Select value={kind} onValueChange={v => changeKind(v as MaterialKind)}>
          <SelectTrigger id="m-kind" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{MATERIAL_KINDS.map(k => <SelectItem key={k} value={k}>{MATERIAL_KIND_LABEL[k]}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field id="m-order" label="Order">
        <Input id="m-order" type="number" inputMode="numeric" step={1} value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
      </Field>
    </div>

    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Source</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {([["file", "Upload a file", Upload], ["link", "External link", Link2]] as const).map(([value, label, Icon]) =>
          <Button key={value} type="button" role="radio" aria-checked={source === value} variant="outline"
            className={cn(source === value && "border-primary bg-primary/5 text-primary")} onClick={() => setSource(value)}>
            <Icon /> {label}
          </Button>)}
      </div>
    </fieldset>

    {source === "file"
      ? <Field id="m-file" label="File"><FileUploadField id="m-file" value={file} onChange={setFile} onBusyChange={setUploading} /></Field>
      : <Field id="m-url" label="Link" hint={kind === "VIDEO_LINK" ? "An unlisted YouTube, Vimeo or Google Drive link. Make sure students can open it without signing in to your account." : undefined}>
          <Input id="m-url" type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} maxLength={2048} placeholder="https://youtu.be/…" />
        </Field>}

    <div className="grid gap-3">
      <div className="flex items-start gap-2">
        <Checkbox id="m-published" checked={published} onCheckedChange={v => setPublished(v === true)} className="mt-0.5" />
        <div className="grid gap-0.5">
          <Label htmlFor="m-published" className="font-normal">Published</Label>
          <p className="text-xs text-muted-foreground">Students enrolled in the course see published materials of published chapters.</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="m-download" checked={downloadable} onCheckedChange={v => setDownloadable(v === true)} className="mt-0.5" />
        <div className="grid gap-0.5">
          <Label htmlFor="m-download" className="font-normal">Students may download</Label>
          <p className="text-xs text-muted-foreground">Turn off to ask the app to show it for viewing only.</p>
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={saving || uploading}>{saving && <Loader2 className="animate-spin" />}{material ? "Save" : "Add material"}</Button>
    </DialogFooter>
  </form>;
}

export function DeleteMaterialDialog({ material, open, onOpenChange, onDone }: {
  material: StudyMaterial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function confirm(e: React.MouseEvent) {
    e.preventDefault();
    if (!material) return;
    setBusy(true);
    try {
      await withToken(token => materialsApi.remove(token, material.id));
      toast.success(`${material.title} deleted`);
      onDone();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err, "Could not delete the material."));
    } finally {
      setBusy(false);
    }
  }
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {material?.title}?</AlertDialogTitle>
        <AlertDialogDescription>Students lose access and their progress on it is removed. The uploaded file itself is kept.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={confirm} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

/** Add a chapter to a subject of the course (admins and faculty may author chapters). */
export function AddChapterDialog({ open, onOpenChange, courseId, subject, nextOrder, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  subject: { id: number; name: string } | null;
  nextOrder: number;
  onSaved: (chapter: Chapter) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
      {open && subject && <ChapterForm courseId={courseId} subject={subject} nextOrder={nextOrder} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function ChapterForm({ courseId, subject, nextOrder, onSaved, onClose }: {
  courseId: number;
  subject: { id: number; name: string };
  nextOrder: number;
  onSaved: (chapter: Chapter) => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const chapter = await withToken(token => chaptersApi.create(token, {
        courseId, subjectId: subject.id, title: title.trim(), sortOrder: nextOrder, isPublished: published,
        ...(description.trim() ? { description: description.trim() } : {}),
      }));
      toast.success(`${chapter.title} added`);
      onSaved(chapter);
      onClose();
    } catch (err) {
      setError(errorText(err, "Could not add the chapter."));
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <DialogHeader>
      <DialogTitle>Add chapter</DialogTitle>
      <DialogDescription>Subject: {subject.name}</DialogDescription>
    </DialogHeader>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <Field id="c-title" label="Title">
      <Input id="c-title" value={title} onChange={e => setTitle(e.target.value)} required minLength={2} maxLength={200} placeholder="Laws of Motion" />
    </Field>
    <Field id="c-desc" label={<>Description <Optional /></>}>
      <Textarea id="c-desc" value={description} onChange={e => setDescription(e.target.value)} maxLength={20000} rows={3} />
    </Field>
    <div className="flex items-center gap-2">
      <Checkbox id="c-published" checked={published} onCheckedChange={v => setPublished(v === true)} />
      <Label htmlFor="c-published" className="font-normal">Published (visible to enrolled students)</Label>
    </div>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Add chapter</Button>
    </DialogFooter>
  </form>;
}

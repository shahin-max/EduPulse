"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FileUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { websiteMediaApi } from "@/lib/admin-ops-api";
import { uploadFile } from "@/lib/staff-learning-api";
import { programs } from "@/lib/site";
import { SITE_ICON_NAMES, SITE_ICONS, type SiteIconName } from "@/lib/site-icons";
import { isSafeHref } from "@/lib/site-sections";
import { cn } from "@/lib/utils";
import { errorText } from "../ui";

/** Building blocks for the Website section editors. All are controlled: value + onChange. */

export function TextField({ label, value, onChange, hint, max, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; max: number; placeholder?: string; required?: boolean;
}) {
  const id = useId();
  return <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}{!required && <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
    <Input id={id} value={value} maxLength={max} placeholder={placeholder} onChange={e => onChange(e.target.value)} aria-invalid={required && !value.trim() ? true : undefined} />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

export function TextAreaField({ label, value, onChange, hint, max, rows = 3, required }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; max: number; rows?: number; required?: boolean;
}) {
  const id = useId();
  return <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}{!required && <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
    <Textarea id={id} value={value} maxLength={max} rows={rows} onChange={e => onChange(e.target.value)} />
    <p className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{hint}</span><span>{value.length}/{max}</span></p>
  </div>;
}

/** Pages a link can point to, so the admin rarely has to type one. */
const PAGE_LINKS: { label: string; href: string }[] = [
  { label: "Home page", href: "/" },
  { label: "All courses", href: "/courses" },
  { label: "Admissions", href: "/admissions" },
  { label: "Contact / enquiry form", href: "/contact" },
  { label: "Latest updates", href: "/updates" },
  { label: "Sainik School pamphlet", href: "/pamphlet" },
  { label: "Faculty", href: "/faculty" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/aboutus" },
  ...programs.map(p => ({ label: `Course: ${p.title}`, href: `/courses/${p.slug}` })),
];

export function LinkField({ label, value, onChange, hint, required, allowPdf }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean; allowPdf?: boolean;
}) {
  const id = useId();
  const { withToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const pdfInput = useRef<HTMLInputElement>(null);
  const invalid = value.trim() !== "" && !isSafeHref(value.trim());
  const known = PAGE_LINKS.find(p => p.href === value);

  async function attachPdf(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Choose a PDF file."); return; }
    setUploading(true);
    try {
      // A PUBLIC file: anyone with the link can open it, which is what a website attachment needs.
      const asset = await withToken(token => uploadFile(token, file, undefined, "PUBLIC"));
      onChange(`${API_URL}/files/${asset.id}/content`);
      toast.success(`${file.name} uploaded and linked`);
    } catch (e) {
      toast.error(errorText(e, "Could not upload the PDF."));
    } finally {
      setUploading(false);
      if (pdfInput.current) pdfInput.current.value = "";
    }
  }

  return <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}{!required && <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
    <div className="flex flex-wrap gap-2">
      <Select value={known ? known.href : ""} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-56" aria-label={`${label}: pick a page`}><SelectValue placeholder="Pick a page…" /></SelectTrigger>
        <SelectContent>{PAGE_LINKS.map(p => <SelectItem key={p.href} value={p.href}>{p.label}</SelectItem>)}</SelectContent>
      </Select>
      <Input id={id} className="min-w-0 flex-1" value={value} placeholder="/courses or https://…" maxLength={500} onChange={e => onChange(e.target.value)} aria-invalid={invalid || undefined} />
      {allowPdf && <>
        <input ref={pdfInput} type="file" accept="application/pdf" className="hidden" onChange={e => void attachPdf(e.target.files?.[0])} />
        <Button type="button" variant="outline" disabled={uploading} onClick={() => pdfInput.current?.click()}>{uploading ? <Loader2 className="animate-spin" /> : <FileUp />} Attach PDF</Button>
      </>}
    </div>
    {invalid
      ? <p className="text-xs text-destructive">Use a site page like /courses, or a full link starting with https://</p>
      : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

/** Upload (Cloudinary) or remove an image, with a preview. Stores the image URL. */
export function ImageField({ label, value, onChange, hint, optional = true }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; optional?: boolean;
}) {
  const { withToken } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { toast.error("Choose a JPEG, PNG, WebP or GIF image."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Images may be at most 5 MB."); return; }
    setBusy(true);
    try {
      const { url } = await withToken(token => websiteMediaApi.uploadImage(token, file));
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(errorText(e, "Could not upload the image."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return <div className="grid gap-1.5">
    <Label>{label}{optional && <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
    <div className="flex flex-wrap items-center gap-3">
      <span className="relative flex aspect-[4/3] w-36 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded image */}
        {value ? <img src={value} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />}
      </span>
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => void upload(e.target.files?.[0])} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}{value ? "Replace image" : "Upload image"}</Button>
        {value && optional && <Button type="button" variant="ghost" onClick={() => onChange("")}><X /> Remove</Button>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{hint ?? "JPEG, PNG, WebP or GIF, up to 5 MB. Large photos are resized automatically."}</p>
  </div>;
}

export function IconField({ label, value, onChange }: { label: string; value: SiteIconName; onChange: (v: SiteIconName) => void }) {
  const id = useId();
  const Current = SITE_ICONS[value];
  return <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Select value={value} onValueChange={v => onChange(v as SiteIconName)}>
      <SelectTrigger id={id} className="w-full sm:w-56"><SelectValue>{Current && <span className="flex items-center gap-2"><Current className="size-4" /> {value}</span>}</SelectValue></SelectTrigger>
      <SelectContent className="max-h-72">
        {SITE_ICON_NAMES.map(name => {
          const Icon = SITE_ICONS[name];
          return <SelectItem key={name} value={name}><span className="flex items-center gap-2"><Icon className="size-4" /> {name}</span></SelectItem>;
        })}
      </SelectContent>
    </Select>
  </div>;
}

/** A list the admin can add to, remove from and reorder. */
export function ListEditor<T>({ items, onChange, render, create, itemLabel, max, min = 0, addLabel }: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (item: T) => void, index: number) => React.ReactNode;
  create: () => T;
  itemLabel: (item: T, index: number) => string;
  max: number;
  min?: number;
  addLabel: string;
}) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  return <div className="grid gap-3">
    {items.map((item, i) => <fieldset key={i} className="grid gap-4 rounded-lg border p-4">
      <legend className="sr-only">{itemLabel(item, i)}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium"><span className="text-muted-foreground">{i + 1}.</span> {itemLabel(item, i)}</p>
        <div className="flex gap-1">
          <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${itemLabel(item, i)} up`}><ArrowUp /></Button>
          <Button type="button" size="icon" variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${itemLabel(item, i)} down`}><ArrowDown /></Button>
          <Button type="button" size="icon" variant="ghost" disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${itemLabel(item, i)}`}><Trash2 className="text-destructive" /></Button>
        </div>
      </div>
      {render(item, next => onChange(items.map((x, j) => (j === i ? next : x))), i)}
    </fieldset>)}
    <Button type="button" variant="outline" className={cn("justify-self-start")} disabled={items.length >= max} onClick={() => onChange([...items, create()])}><Plus /> {addLabel}</Button>
    {items.length >= max && <p className="text-xs text-muted-foreground">Up to {max}.</p>}
  </div>;
}

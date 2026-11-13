"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  announcementsApi, AUDIENCES,
  type Announcement, type AnnouncementAudience, type UpdateAnnouncementInput,
} from "@/lib/admin-ops-api";
import { batchLabel, useIsAdmin, useStaffBatches } from "@/components/staff/use-staff";
import { ErrorAlert, errorText, Field, formatDate, Optional } from "../ui";
import { AUDIENCE_HELP, audienceLabel, StatusPill } from "./announcement-bits";

/** ISO string -> value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (value: string) => value ? new Date(value).toISOString() : null;

/** Create an announcement, edit one (`announcement`), or view an archived one read-only. */
export function AnnouncementDialog({ open, onOpenChange, announcement, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement;
  onSaved: (a: Announcement) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
      {open && (announcement?.status === "ARCHIVED"
        ? <ArchivedView announcement={announcement} onClose={() => onOpenChange(false)} />
        : <AnnouncementForm announcement={announcement} onSaved={onSaved} onClose={() => onOpenChange(false)} />)}
    </DialogContent>
  </Dialog>;
}

function ArchivedView({ announcement: a, onClose }: { announcement: Announcement; onClose: () => void }) {
  return <>
    <DialogHeader>
      <div><StatusPill announcement={a} /></div>
      <DialogTitle>{a.title}</DialogTitle>
      <DialogDescription>{audienceLabel(a)} · {formatDate(a.publish_at ?? a.created_at, true)}{a.users ? ` · by ${a.users.full_name}` : ""}</DialogDescription>
    </DialogHeader>
    <p className="text-sm break-words whitespace-pre-wrap">{a.body}</p>
    <p className="text-xs text-muted-foreground">Archived announcements cannot be edited. Publish it again from the list to bring it back.</p>
    <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
  </>;
}

function AnnouncementForm({ announcement, onSaved, onClose }: { announcement?: Announcement; onSaved: (a: Announcement) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  // Admins post to anyone; faculty only to batches they teach (the API enforces this too).
  const admin = useIsAdmin();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [audience, setAudience] = useState<AnnouncementAudience>(announcement?.audience ?? (admin ? "ALL" : "BATCH"));
  const [batchId, setBatchId] = useState(announcement?.batch_id ? String(announcement.batch_id) : "");
  const [publishAt, setPublishAt] = useState(toLocalInput(announcement?.publish_at ?? null));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"draft" | "publish" | "save" | null>(null);
  const batches = useStaffBatches();
  // Faculty pick from their running batches; admins from every batch, as before.
  const batchOptions = admin ? batches.batches : batches.open;
  const published = announcement?.status === "PUBLISHED";

  async function submit(mode: "draft" | "publish" | "save") {
    if (title.trim().length < 2) return setError("Enter a title of at least 2 characters.");
    if (!body.trim()) return setError("Write the announcement text.");
    if (audience === "BATCH" && !batchId) return setError("Choose the batch this announcement is for.");
    setBusy(mode);
    setError("");
    try {
      let saved: Announcement;
      if (!announcement) {
        saved = await withToken(token => announcementsApi.create(token, {
          title: title.trim(), body, audience,
          batchId: audience === "BATCH" ? Number(batchId) : undefined,
          publishAt: fromLocalInput(publishAt) ?? undefined,
          publish: mode === "publish" || undefined,
        }));
        toast.success(mode === "draft" ? "Draft saved" : saved.publish_at && new Date(saved.publish_at) > new Date() ? "Announcement scheduled" : "Announcement published");
      } else {
        // Only send what changed.
        const patch: UpdateAnnouncementInput = {};
        if (title.trim() !== announcement.title) patch.title = title.trim();
        if (body !== announcement.body) patch.body = body;
        if (audience !== announcement.audience) patch.audience = audience;
        const nextBatch = audience === "BATCH" ? Number(batchId) : null;
        if (nextBatch !== announcement.batch_id) patch.batchId = nextBatch;
        const nextPublishAt = fromLocalInput(publishAt);
        if (toLocalInput(nextPublishAt) !== toLocalInput(announcement.publish_at)) patch.publishAt = nextPublishAt;
        saved = Object.keys(patch).length ? await withToken(token => announcementsApi.update(token, announcement.id, patch)) : announcement;
        if (mode === "publish") {
          saved = await withToken(token => announcementsApi.publish(token, announcement.id));
          toast.success(saved.publish_at && new Date(saved.publish_at) > new Date() ? "Announcement scheduled" : "Announcement published");
        } else toast.success("Changes saved");
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the announcement."));
    } finally {
      setBusy(null);
    }
  }

  const batchMissing = announcement?.batches && !batchOptions.some(b => b.id === announcement.batches!.id);
  const batchHint = batches.error ? `Could not load batches: ${batches.error}`
    : !admin && batches.data && !batchOptions.length ? "You are not assigned to a running batch, so there is no one to post to yet."
    : !admin ? AUDIENCE_HELP.BATCH : undefined;

  return <form onSubmit={e => { e.preventDefault(); void submit(announcement ? "save" : "draft"); }} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{announcement ? "Edit announcement" : "New announcement"}</DialogTitle>
      <DialogDescription>{announcement
        ? published ? "This announcement is live; changes show immediately." : "Edit the draft, then publish it when ready."
        : admin ? "Save as a draft, or publish now to notify the audience." : "Post to one of your batches. Save as a draft, or publish now to notify its students."}</DialogDescription>
    </DialogHeader>
    <Field id="an-title" label="Title">
      <Input id="an-title" required minLength={2} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Holiday on Friday" />
    </Field>
    <Field id="an-body" label="Message" hint={`${body.length.toLocaleString("en-IN")} / 20,000 characters. Line breaks are kept.`}>
      <Textarea id="an-body" required maxLength={20000} rows={7} value={body} onChange={e => setBody(e.target.value)} className="max-h-[50svh]" />
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      {admin && <Field id="an-audience" label="Audience" hint={AUDIENCE_HELP[audience]}>
        <Select value={audience} onValueChange={v => setAudience(v as AnnouncementAudience)}>
          <SelectTrigger id="an-audience" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{AUDIENCES.map(a => <SelectItem key={a} value={a}>{audienceLabel({ audience: a, batches: null })}</SelectItem>)}</SelectContent>
        </Select>
      </Field>}
      {audience === "BATCH" && <Field id="an-batch" label="Batch" hint={batchHint}>
        <Select value={batchId} onValueChange={setBatchId} disabled={!batches.data}>
          <SelectTrigger id="an-batch" className="w-full"><SelectValue placeholder={batches.loading ? "Loading…" : "Choose a batch"} /></SelectTrigger>
          <SelectContent>
            {batchMissing && <SelectItem value={String(announcement!.batches!.id)}>{announcement!.batches!.name} ({announcement!.batches!.code})</SelectItem>}
            {batchOptions.map(b => <SelectItem key={b.id} value={String(b.id)}>{batchLabel(b)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>}
    </div>
    <Field id="an-publish-at" label={<>Schedule <Optional /></>} hint="Leave empty to go live as soon as it is published. A future time keeps it hidden, and notifications wait, until then.">
      <div className="flex gap-2">
        <Input id="an-publish-at" type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} className="min-w-0" />
        {publishAt && <Button type="button" variant="outline" onClick={() => setPublishAt("")}>Clear</Button>}
      </div>
    </Field>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter className="gap-2">
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      {published
        ? <Button type="submit" disabled={!!busy}>{busy === "save" && <Loader2 className="animate-spin" />}Save changes</Button>
        : <>
          <Button type="submit" variant="secondary" disabled={!!busy}>{busy === "draft" || busy === "save" ? <Loader2 className="animate-spin" /> : null}{announcement ? "Save draft" : "Save as draft"}</Button>
          <Button type="button" disabled={!!busy} onClick={() => void submit("publish")}>{busy === "publish" ? <Loader2 className="animate-spin" /> : <Send />}{publishAt && new Date(publishAt) > new Date() ? "Schedule" : "Publish"}</Button>
        </>}
    </DialogFooter>
  </form>;
}

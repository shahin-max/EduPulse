"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { CONTENT_KEY, websiteContentApi, type ContentBlock, type UpsertContentInput } from "@/lib/admin-ops-api";
import { ErrorAlert, errorText, Field, Optional } from "../ui";
import { knownKey, REFRESH_NOTE } from "./known-keys";

/** Edit a block, or create one when `block` is not given (`existingKeys` guards against overwriting). */
export function ContentDialog({ open, onOpenChange, block, existingKeys, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block?: ContentBlock;
  existingKeys: string[];
  onSaved: (block: ContentBlock) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
      {open && <ContentForm block={block} existingKeys={existingKeys} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function ContentForm({ block, existingKeys, onSaved, onClose }: { block?: ContentBlock; existingKeys: string[]; onSaved: (b: ContentBlock) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [key, setKey] = useState(block?.content_key ?? "");
  const [title, setTitle] = useState(block?.title ?? "");
  const [body, setBody] = useState(block?.body ?? "");
  const [published, setPublished] = useState(block?.is_published ?? false);
  const [sortOrder, setSortOrder] = useState(String(block?.sort_order ?? 0));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cleanKey = key.trim();
  const known = knownKey(cleanKey);
  const keyError = !block && cleanKey && (!CONTENT_KEY.test(cleanKey)
    ? "Use lowercase letters, digits, “.”, “_” or “-” (max 100), starting with a letter or digit, e.g. home.hero."
    : existingKeys.includes(cleanKey) ? "A block with this key already exists; edit it from the list." : "");
  const lines = body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const duplicates = known?.lines ? [...new Set(lines.filter((l, i) => lines.indexOf(l) !== i))] : [];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cleanKey) return setError("Enter a key.");
    if (keyError) return setError(keyError);
    const order = Number(sortOrder);
    if (!Number.isInteger(order)) return setError("Sort order must be a whole number.");
    setBusy(true);
    setError("");
    try {
      const input: UpsertContentInput = { title: title.trim() || null, body: body || null, isPublished: published, sortOrder: order };
      const saved = await withToken(token => websiteContentApi.upsert(token, cleanKey, input));
      toast.success(block ? "Changes saved" : `${cleanKey} created`);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the block."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle className="break-all">{block ? `Edit ${block.content_key}` : "New content block"}</DialogTitle>
      <DialogDescription>{known ? `${known.name}: ${known.where}` : "A block of text the website can read by its key."}</DialogDescription>
    </DialogHeader>
    {!block && <Field id="wc-key" label="Key" hint={keyError || "Lowercase, e.g. home.hero or site.footer-note. The website must be coded to read it."}>
      <Input id="wc-key" required maxLength={100} value={key} onChange={e => setKey(e.target.value.toLowerCase())} aria-invalid={!!keyError || undefined} autoComplete="off" spellCheck={false} className="font-mono" />
    </Field>}
    <Field id="wc-title" label={<>Title <Optional /></>} hint={known?.title}>
      <Input id="wc-title" maxLength={255} value={title} onChange={e => setTitle(e.target.value)} />
    </Field>
    <Field id="wc-body" label="Body" hint={known?.lines
      ? `${known.body} ${lines.length} ${lines.length === 1 ? "line" : "lines"}.`
      : known?.body ?? "Plain text, Markdown or HTML, depending on how the website uses this key."}>
      <Textarea id="wc-body" rows={known?.lines ? 9 : 12} value={body} onChange={e => setBody(e.target.value)} className="max-h-[55svh] font-mono text-sm" spellCheck />
    </Field>
    {duplicates.length > 0 && <p className="text-sm text-amber-700 dark:text-amber-300">Repeated line: “{duplicates[0]}”. Each line should be different.</p>}
    <div className="grid gap-5 sm:grid-cols-[1fr_10rem] sm:items-start">
      <div className="flex items-start gap-3 rounded-md border p-3">
        <Checkbox id="wc-published" checked={published} onCheckedChange={v => setPublished(v === true)} className="mt-0.5" />
        <div className="grid gap-1">
          <Label htmlFor="wc-published">Published</Label>
          <p className="text-xs text-muted-foreground">Only published blocks are shown on the website.</p>
        </div>
      </div>
      <Field id="wc-sort" label="Sort order" hint="Lower comes first.">
        <Input id="wc-sort" type="number" step={1} inputMode="numeric" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
      </Field>
    </div>
    <Alert><Info /><AlertDescription>{REFRESH_NOTE}</AlertDescription></Alert>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy || !!keyError}>{busy && <Loader2 className="animate-spin" />}{block ? "Save changes" : "Create block"}</Button>
    </DialogFooter>
  </form>;
}

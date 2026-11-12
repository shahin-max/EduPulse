"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { errorText } from "@/components/admin/ui";
import { fetchFileBlob, formatBytes, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, uploadFile, type FileAsset } from "@/lib/staff-learning-api";
import { cn } from "@/lib/utils";

/**
 * File helpers shared by the materials and assignments screens.
 * Files are PRIVATE, and GET /files/:id/content needs the Authorization header, so a plain link cannot open
 * them: they are fetched with the token and opened (PDFs, images) or downloaded from a blob URL.
 */

const INLINE = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/;

export function useOpenFile() {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState<number | null>(null);

  const open = useCallback(async (file: FileAsset) => {
    const inline = INLINE.test(file.mime_type);
    // Open the tab before awaiting, or the browser treats it as a pop-up and blocks it.
    const tab = inline ? window.open("", "_blank") : null;
    setBusy(file.id);
    try {
      const blob = await withToken(token => fetchFileBlob(token, file.id));
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.original_filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      toast.error(errorText(e, "Could not open the file."));
    } finally {
      setBusy(null);
    }
  }, [withToken]);

  return { open, busy };
}

/** A compact button that opens/downloads a stored file. */
export function FileLink({ file, className }: { file: FileAsset; className?: string }) {
  const { open, busy } = useOpenFile();
  const inline = INLINE.test(file.mime_type);
  return <Button type="button" variant="link" className={cn("h-auto max-w-full justify-start gap-1.5 p-0 text-left font-normal", className)}
    onClick={() => open(file)} disabled={busy === file.id} title={inline ? "Open" : "Download"}>
    {busy === file.id ? <Loader2 className="animate-spin" /> : inline ? <ExternalLink /> : <Download />}
    <span className="truncate">{file.original_filename}</span>
  </Button>;
}

/**
 * Picks a file and uploads it right away (POST /files), showing progress. `onChange(null)` removes it.
 * `onBusyChange` lets the form disable saving while an upload runs.
 */
export function FileUploadField({ id, value, onChange, onBusyChange, accept }: {
  id: string;
  value: FileAsset | null;
  onChange: (file: FileAsset | null) => void;
  onBusyChange?: (busy: boolean) => void;
  accept?: string;
}) {
  const { withToken } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > MAX_UPLOAD_BYTES) { setError(`${file.name} is ${formatBytes(file.size)}; files may be at most ${MAX_UPLOAD_LABEL}.`); return; }
    setProgress(0);
    onBusyChange?.(true);
    try {
      const asset = await withToken(token => uploadFile(token, file, setProgress));
      onChange({ ...asset, size_bytes: asset.size_bytes ?? file.size });
    } catch (e) {
      setError(errorText(e, "Upload failed."));
    } finally {
      setProgress(null);
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  }

  return <div className="grid gap-2">
    <input ref={input} id={id} type="file" className="sr-only" accept={accept} onChange={e => pick(e.target.files?.[0])} tabIndex={-1} />
    {progress !== null
      ? <div className="grid gap-1.5 rounded-md border p-3" aria-live="polite">
          <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Uploading… {progress}%</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
        </div>
      : value
        ? <div className="flex items-center gap-2 rounded-md border p-2 pl-3">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <FileLink file={value} />
              {value.size_bytes ? <p className="text-xs text-muted-foreground">{formatBytes(value.size_bytes)}</p> : null}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>Replace</Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={() => onChange(null)}><X /></Button>
          </div>
        : <Button type="button" variant="outline" className="justify-start" onClick={() => input.current?.click()}><Upload /> Choose file</Button>}
    {error && <p className="text-sm text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">Up to {MAX_UPLOAD_LABEL}. Uploaded files stay private to staff and the students who can reach them.</p>
  </div>;
}

"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatBytes, uploadFile } from "@/lib/staff-learning-api";
import { errorText } from "@/components/admin/ui";
import { AssetImage } from "@/components/portal/asset-image";
import { cn } from "@/lib/utils";

/** Same types the API accepts for question pictures. */
export const QUESTION_IMAGE_TYPES = "image/png,image/jpeg,image/gif,image/webp";
/** Figures don't need more; keeps tests quick to load on phones. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Optional picture for a question or an option: uploads right away (POST /files, private), then shows
 * a thumbnail with Replace and Remove. `compact` is the small icon button used in an option row.
 */
export function QuestionImageField({ value, onChange, onBusyChange, label, compact = false }: {
  value: number | null;
  onChange: (assetId: number | null) => void;
  onBusyChange?: (busy: boolean) => void;
  /** What the picture belongs to, e.g. "the question" or "option B". */
  label: string;
  compact?: boolean;
}) {
  const { withToken } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    setError("");
    if (!QUESTION_IMAGE_TYPES.split(",").includes(file.type)) { setError("Choose a PNG, JPEG, GIF or WebP picture."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError(`${file.name} is ${formatBytes(file.size)}; pictures may be at most 5 MB.`); return; }
    setProgress(0);
    onBusyChange?.(true);
    try {
      const asset = await withToken(token => uploadFile(token, file, setProgress));
      onChange(asset.id);
    } catch (e) {
      setError(errorText(e, "Upload failed."));
    } finally {
      setProgress(null);
      onBusyChange?.(false);
    }
  }

  const choose = () => input.current?.click();
  const fileInput = <input ref={input} type="file" className="sr-only" tabIndex={-1} accept={QUESTION_IMAGE_TYPES}
    aria-label={`Picture for ${label}`} onChange={e => void pick(e.target.files?.[0])} />;
  const uploading = progress !== null && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
    <Loader2 className="size-3.5 animate-spin" /> Uploading… {progress}%
  </span>;

  // Compact: just the button in the option row; the thumbnail is shown by the parent below the row.
  if (compact && !value) return <>
    {fileInput}
    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={choose} disabled={progress !== null}
      aria-label={`Add a picture to ${label}`} title="Add a picture">
      {progress !== null ? <Loader2 className="animate-spin" /> : <ImagePlus />}
    </Button>
    {error && <span className="sr-only" role="alert">{error}</span>}
  </>;
  if (compact) return null;

  return <div className="grid gap-2">
    {fileInput}
    {value
      ? <div className="flex flex-wrap items-end gap-3 rounded-md border p-2">
          <AssetImage assetId={value} alt={`Picture for ${label}`} size="sm" />
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={choose} disabled={progress !== null}><RefreshCw /> Replace</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={progress !== null}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"><X /> Remove</Button>
          </div>
          {uploading}
        </div>
      : <div className={cn("flex flex-wrap items-center gap-2")}>
          <Button type="button" variant="outline" size="sm" onClick={choose} disabled={progress !== null}><ImagePlus /> Add picture</Button>
          {uploading}
        </div>}
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
  </div>;
}

/** Thumbnail + remove shown under an option row once it has a picture (pairs with `compact`). */
export function OptionImagePreview({ assetId, label, onRemove }: { assetId: number; label: string; onRemove: () => void }) {
  return <div className="ml-[4.75rem] flex items-end gap-2">
    <AssetImage assetId={assetId} alt={`Picture for ${label}`} size="sm" />
    <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      aria-label={`Remove the picture from ${label}`}><X /> Remove picture</Button>
  </div>;
}

"use client";

import { useEffect, useState } from "react";
import { ImageOff, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fetchFileBlob } from "@/lib/staff-learning-api";
import { cn } from "@/lib/utils";
import { errorText } from "@/components/admin/ui";

type Loaded = { id: number; url?: string; error?: string };

/**
 * A private picture (file_assets): fetched with the access token, since GET /files/:id/content needs
 * the Authorization header, and shown from a blob URL that is revoked when it goes away.
 *
 * `zoom` (default) lets people tap the picture to see it full size in a dialog, where phones can
 * pinch-zoom. Turn it off inside other buttons (e.g. a test option) to avoid nested controls.
 */
export function AssetImage({ assetId, alt, className, imgClassName, zoom = true, size = "md" }: {
  assetId: number;
  alt: string;
  className?: string;
  imgClassName?: string;
  zoom?: boolean;
  /** sm: list thumbnails; md: options; lg: question figures. */
  size?: "sm" | "md" | "lg";
}) {
  const { withToken } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    let url: string | undefined;
    withToken(token => fetchFileBlob(token, assetId))
      .then(blob => {
        url = URL.createObjectURL(blob);
        if (live) setLoaded({ id: assetId, url });
        else URL.revokeObjectURL(url);
      })
      .catch(e => { if (live) setLoaded({ id: assetId, error: errorText(e, "Could not load the picture.") }); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [assetId, withToken]);

  // A picture from a previous asset id is not shown while the new one loads.
  const current = loaded?.id === assetId ? loaded : null;
  const max = size === "sm" ? "max-h-20" : size === "md" ? "max-h-40" : "max-h-80";

  if (!current) return <Skeleton className={cn("w-40 max-w-full justify-self-start", size === "sm" ? "h-16" : size === "md" ? "h-24" : "h-48", className)} aria-label="Loading picture" />;
  if (current.error || !current.url) return <span role="img" aria-label={`${alt} (could not load)`}
    className={cn("inline-flex w-fit items-center gap-2 justify-self-start rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground", className)}>
    <ImageOff className="size-4" /> Picture could not load
  </span>;

  // eslint-disable-next-line @next/next/no-img-element -- a blob URL of a private file; next/image cannot optimise it.
  const img = <img src={current.url} alt={alt} className={cn("h-auto w-auto max-w-full rounded-md border bg-white object-contain", max, imgClassName)} />;
  if (!zoom) return <span className={cn("inline-block w-fit max-w-full justify-self-start", className)}>{img}</span>;

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Enlarge picture: ${alt}`}
      className={cn("group relative inline-block w-fit max-w-full cursor-zoom-in justify-self-start self-start rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}>
      {img}
      <span className="absolute right-1.5 bottom-1.5 rounded bg-black/55 p-1 text-white opacity-70 group-hover:opacity-100" aria-hidden="true"><Maximize2 className="size-3.5" /></span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[95svh] w-[calc(100vw-1rem)] max-w-5xl overflow-auto p-3 sm:p-4">
        <DialogHeader className="sr-only"><DialogTitle>Picture</DialogTitle><DialogDescription>{alt}</DialogDescription></DialogHeader>
        {/* touch-action allows two-finger zoom on phones inside the dialog. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL of a private file. */}
        <img src={current.url} alt={alt} className="mx-auto h-auto max-w-full rounded-md bg-white" style={{ touchAction: "pinch-zoom" }} />
      </DialogContent>
    </Dialog>
  </>;
}

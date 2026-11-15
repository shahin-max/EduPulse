"use client";

import { useState } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toEmbed } from "@/lib/video-embed";

/**
 * Plays a lecture or class recording inside the portal (YouTube, Google Drive or Vimeo links).
 * Other links fall back to an "Open video" button. See lib/video-embed.ts: this keeps the raw link out
 * of the interface but is not DRM; real protection needs a host with signed tokens (e.g. Bunny Stream).
 */
export function VideoDialog({ url, title, open, onOpenChange }: {
  url: string | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const embed = toEmbed(url);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="gap-3 p-3 sm:max-w-4xl sm:p-5">
      <DialogHeader className="pr-8 text-left">
        <DialogTitle className="truncate">{title}</DialogTitle>
        <DialogDescription className={embed ? "sr-only" : undefined}>
          {embed ? "Video player" : "This video can't be played inside the portal. Open it in a new tab instead."}
        </DialogDescription>
      </DialogHeader>
      {open && embed && <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe src={embed.embedUrl} title={title} className="absolute inset-0 size-full border-0"
          allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>}
      {!embed && url && <div>
        <Button asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open video</a></Button>
      </div>}
    </DialogContent>
  </Dialog>;
}

/** True when the link plays inside the portal (so callers can open the dialog instead of a new tab). */
export const isEmbeddable = (url: string | null | undefined) => toEmbed(url) !== null;

/** "Recording" button for a class: plays inside the portal when it can, otherwise opens the link. */
export function RecordingButton({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  if (!isEmbeddable(url)) {
    return <Button asChild size="sm" variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><PlayCircle /> Recording</a></Button>;
  }
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}><PlayCircle /> Recording</Button>
    <VideoDialog url={url} title={`Recording: ${title}`} open={open} onOpenChange={setOpen} />
  </>;
}

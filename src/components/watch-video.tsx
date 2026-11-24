"use client";

import { useEffect, useRef } from "react";
import { Play, X } from "lucide-react";
import { PROGRAMMES_VIDEO } from "@/lib/pamphlets";

const OPEN_EVENT = "edupulse:watch-video";

/** "Watch video" button. Opens the single <WatchVideoDialog /> on the page (so it can sit inside hidden slides). */
export function WatchVideoButton({ className = "" }: { className?: string }) {
  return <button type="button" className={`watch-video-button ${className}`} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} aria-haspopup="dialog">
    <span className="watch-video-icon" aria-hidden="true"><Play size={14} /></span> Watch video
  </button>;
}

/** The narrated programmes video in a pop-up; mount once, open with <WatchVideoButton />. */
export function WatchVideoDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    function open() {
      if (!dialog.current?.open) dialog.current?.showModal();
      video.current?.play().catch(() => {});
    }
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  return <dialog ref={dialog} className="watch-video-dialog" aria-label={PROGRAMMES_VIDEO.title} onClose={() => video.current?.pause()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="watch-video-bar"><strong>{PROGRAMMES_VIDEO.title}</strong><button type="button" aria-label="Close video" onClick={() => dialog.current?.close()}><X size={18} /></button></div>
    <video ref={video} src={PROGRAMMES_VIDEO.src} poster={PROGRAMMES_VIDEO.poster} controls preload="none" playsInline />
  </dialog>;
}

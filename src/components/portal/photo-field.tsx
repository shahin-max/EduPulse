"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/account-api";
import { errorText, UserAvatar } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * A profile photo with "Change" and "Remove" buttons. `upload`/`remove` call the API (own photo or,
 * for admins, someone else's) and return the updated user.
 */
export function PhotoField({ name, photoUrl, upload, remove, onChanged, className }: {
  name: string;
  photoUrl: string | null | undefined;
  upload: (token: string, file: File) => Promise<User>;
  remove: (token: string) => Promise<User>;
  onChanged: (user: User) => void;
  className?: string;
}) {
  const { withToken } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!PHOTO_TYPES.split(",").includes(file.type)) return void toast.error("Choose a JPEG, PNG, WebP or GIF image.");
    if (file.size > MAX_PHOTO_BYTES) return void toast.error("Photos may be at most 5 MB.");
    setBusy("upload");
    try {
      onChanged(await withToken(token => upload(token, file)));
      toast.success("Photo updated");
    } catch (e) {
      toast.error(errorText(e, "Could not upload the photo."));
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setBusy("remove");
    try {
      onChanged(await withToken(remove));
      toast.success("Photo removed");
    } catch (e) {
      toast.error(errorText(e, "Could not remove the photo."));
    } finally {
      setBusy(null);
    }
  }

  return <div className={cn("flex flex-col items-center gap-2", className)}>
    <button type="button" onClick={() => input.current?.click()} disabled={!!busy} aria-label={photoUrl ? "Change photo" : "Add a photo"}
      className="group relative rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <UserAvatar name={name} src={photoUrl} className="size-20 text-lg" />
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {busy === "upload" ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
      </span>
      {busy === "upload" && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white"><Loader2 className="size-5 animate-spin" /></span>}
    </button>
    <input ref={input} type="file" accept={PHOTO_TYPES} className="sr-only" tabIndex={-1} onChange={e => void pick(e.target.files?.[0])} />
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => input.current?.click()}><Camera />{photoUrl ? "Change" : "Add photo"}</Button>
      {photoUrl && <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => void clear()} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
        {busy === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />}Remove
      </Button>}
    </div>
  </div>;
}

/**
 * Turns a teacher's video link into an embeddable player URL, so lectures and class recordings
 * play inside the portal instead of opening the raw link in a new tab.
 *
 * This hides the link in the portal's interface; it is NOT DRM. The video id is still in the page
 * (a determined student can find it), so an unlisted YouTube or shared Drive video can be reshared.
 * Real protection needs a host with signed, expiring tokens and domain restriction (e.g. Bunny Stream).
 */
export type VideoEmbed = { provider: "youtube" | "drive" | "vimeo"; embedUrl: string };

const YOUTUBE_ID = /^[\w-]{11}$/;

export function toEmbed(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "").toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /live/ID, /embed/ID
  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = path[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    if (path[0] === "watch") youtubeId = url.searchParams.get("v");
    else if (["shorts", "live", "embed", "v"].includes(path[0] ?? "")) youtubeId = path[1] ?? null;
  }
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1` };
  }

  // Google Drive: /file/d/ID/view (or /preview, /edit)
  if (host === "drive.google.com" && path[0] === "file" && path[1] === "d" && path[2] && /^[\w-]+$/.test(path[2])) {
    return { provider: "drive", embedUrl: `https://drive.google.com/file/d/${path[2]}/preview` };
  }

  // Vimeo: vimeo.com/ID or vimeo.com/ID/HASH (unlisted), player.vimeo.com/video/ID
  if (host === "vimeo.com" && /^\d+$/.test(path[0] ?? "")) {
    const hash = path[1] && /^[\da-f]+$/i.test(path[1]) ? path[1] : url.searchParams.get("h");
    return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${path[0]}${hash ? `?h=${hash}` : ""}` };
  }
  if (host === "player.vimeo.com" && path[0] === "video" && /^\d+$/.test(path[1] ?? "")) {
    const hash = url.searchParams.get("h");
    return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${path[1]}${hash ? `?h=${hash}` : ""}` };
  }

  return null;
}

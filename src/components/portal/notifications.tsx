"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bell, CheckCheck, ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { notificationsApi, type Notification } from "@/lib/teaching-api";
import { errorText, formatDate } from "@/components/admin/ui";

const POLL_MS = 60_000;
const PAGE = 20;

/** Bell with the unread count, opening the latest notifications. Used in every portal's top bar. */
export function NotificationsBell() {
  const { withToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const refreshCount = useCallback(() => {
    withToken(token => notificationsApi.list(token, { limit: 1 }))
      .then(page => setUnread(page.meta.unread))
      .catch(() => {});
  }, [withToken]);

  // Poll while the tab is visible, and check again when the person comes back to it.
  useEffect(() => {
    refreshCount();
    const timer = setInterval(() => { if (document.visibilityState === "visible") refreshCount(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refreshCount(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshCount]);

  const load = useCallback(async (page: number) => {
    try {
      const result = await withToken(token => notificationsApi.list(token, { page, limit: PAGE }));
      setItems(current => page === 1 ? result.data : [...(current ?? []), ...result.data]);
      setTotal(result.meta.total);
      setUnread(result.meta.unread);
      setError("");
    } catch (e) {
      setError(errorText(e, "Could not load notifications."));
    }
  }, [withToken]);

  async function markRead(n: Notification) {
    if (n.read_at) return;
    const readAt = new Date().toISOString();
    setItems(current => current?.map(i => i.id === n.id ? { ...i, read_at: readAt } : i) ?? null);
    setUnread(u => Math.max(0, u - 1));
    await withToken(token => notificationsApi.read(token, n.id)).catch(() => refreshCount());
  }

  async function markAll() {
    try {
      await withToken(notificationsApi.readAll);
      const readAt = new Date().toISOString();
      setItems(current => current?.map(i => i.read_at ? i : { ...i, read_at: readAt }) ?? null);
      setUnread(0);
    } catch (e) {
      toast.error(errorText(e, "Could not mark notifications as read."));
    }
  }

  async function more() {
    setLoadingMore(true);
    await load(Math.floor((items?.length ?? 0) / PAGE) + 1);
    setLoadingMore(false);
  }

  return <>
    <Button variant="ghost" size="icon" className="relative" onClick={() => { setOpen(true); void load(1); }}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
      <Bell />
      {unread > 0 && <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] tabular-nums">{unread > 99 ? "99+" : unread}</Badge>}
    </Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>{unread ? `${unread} unread` : "You are all caught up."}</SheetDescription>
          {unread > 0 && <div><Button variant="outline" size="sm" onClick={() => void markAll()}><CheckCheck /> Mark all as read</Button></div>}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {error && <p className="p-4 text-sm text-destructive">{error}</p>}
          {!items && !error && <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</p>}
          {items?.length === 0 && <div className="grid justify-items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Bell className="size-8 opacity-40" />
            <p>No notifications yet. Announcements for you will show up here.</p>
          </div>}
          {items && items.length > 0 && <ul className="divide-y">
            {items.map(n => <NotificationItem key={n.id} notification={n} onOpen={() => void markRead(n)} onNavigate={() => setOpen(false)} />)}
          </ul>}
          {items && items.length < total && <div className="p-4"><Button variant="outline" className="w-full" onClick={() => void more()} disabled={loadingMore}>
            {loadingMore && <Loader2 className="animate-spin" />}Show older
          </Button></div>}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}

/** Announcement notifications carry a shortened body; the full text is fetched when opened. */
const ANNOUNCEMENT_LINK = /^\/announcements\/(\d+)$/;

/** Links into a portal (e.g. /student/assignments/12) get an "Open" button; announcement links expand in place. */
const PORTAL_LINK = /^\/(student|teach|admin)(\/|#|$)/;

function NotificationItem({ notification: n, onOpen, onNavigate }: { notification: Notification; onOpen: () => void; onNavigate: () => void }) {
  const { withToken } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [fullText, setFullText] = useState<string | null>(null);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (!next) return;
    onOpen();
    const match = n.link_url?.match(ANNOUNCEMENT_LINK);
    if (match && n.message.endsWith("...") && fullText === null) {
      withToken(token => request<{ body: string }>(`/announcements/${match[1]}`, { token }))
        .then(a => setFullText(a.body))
        .catch(() => {});
    }
  }

  return <li>
    <button type="button" onClick={toggle} aria-expanded={expanded}
      className={cn("grid w-full gap-1 p-4 text-left transition-colors hover:bg-accent/50", !n.read_at && "bg-sky-500/5")}>
      <span className="flex items-start gap-2">
        {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-500" aria-label="Unread" />}
        <span className={cn("min-w-0 flex-1 text-sm break-words", !n.read_at && "font-semibold")}>{n.title}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </span>
      <span className={cn("text-sm break-words whitespace-pre-wrap text-muted-foreground", !expanded && "line-clamp-2")}>{expanded ? fullText ?? n.message : n.message}</span>
      <span className="text-xs text-muted-foreground">{formatDate(n.created_at, true)}</span>
    </button>
    {n.link_url && PORTAL_LINK.test(n.link_url) && <div className="px-4 pb-3">
      <Button asChild size="sm" variant="outline"><Link href={n.link_url} onClick={() => { onOpen(); onNavigate(); }}>Open <ArrowRight /></Link></Button>
    </div>}
  </li>;
}

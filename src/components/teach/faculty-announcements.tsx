"use client";

import { useState } from "react";
import { Megaphone, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { request } from "@/lib/api";
import { query, type Paginated } from "@/lib/admin-api";
import type { Announcement } from "@/lib/admin-ops-api";
import { cn } from "@/lib/utils";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, Pager } from "@/components/admin/ui";
import AnnouncementsList from "@/components/admin/announcements/announcements-list";
import { audienceLabel } from "@/components/admin/announcements/announcement-bits";

type Tab = "board" | "mine";

/** Faculty announcements: the notice board (what the academy sent them) and the ones they post to their batches. */
export default function FacultyAnnouncements() {
  const [tab, setTab] = useState<Tab>("board");
  return <>
    <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 sm:w-fit" role="tablist" aria-label="Announcements">
      {([["board", "Notice board", Megaphone], ["mine", "My announcements", PenSquare]] as const).map(([value, label, Icon]) =>
        <Button key={value} role="tab" aria-selected={tab === value} size="sm" variant={tab === value ? "secondary" : "ghost"}
          className={cn("flex-1 sm:flex-none", tab === value && "bg-background shadow-xs")} onClick={() => setTab(value)}>
          <Icon /> {label}
        </Button>)}
    </div>
    {tab === "board" ? <NoticeBoard /> : <AnnouncementsList />}
  </>;
}

function NoticeBoard() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData(
    token => request<Paginated<Announcement>>(`/announcements/feed${query({ page, limit: 10 })}`, { token }),
    `feed:${page}`,
  );

  return <>
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Notice board</h1>
      <p className="text-sm text-muted-foreground">Announcements for faculty, for everyone, and for the batches you teach.</p>
    </div>
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows rows={4} />}
        {data && data.data.length === 0 && <EmptyState icon={Megaphone} title="No announcements yet" description="Notices from the academy and your batches appear here." />}
        {data && data.data.length > 0 && <ul className={cn("divide-y", loading && "opacity-60")}>
          {data.data.map(a => <li key={a.id} className="grid gap-2 p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="font-semibold">{a.title}</h2>
              <span className="text-xs text-muted-foreground">{formatDate(a.publish_at ?? a.created_at, true)}</span>
            </div>
            <p className="text-sm break-words whitespace-pre-wrap">{a.body}</p>
            <p className="text-xs text-muted-foreground">{audienceLabel(a)}{a.users ? ` · from ${a.users.full_name}` : ""}</p>
          </li>)}
        </ul>}
      </CardContent>
      {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
    </Card>
  </>;
}

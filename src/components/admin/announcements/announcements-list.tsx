"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, Loader2, Megaphone, Pencil, Plus, Send, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import {
  ANNOUNCEMENT_STATUSES, announcementsApi, AUDIENCES,
  type Announcement, type AnnouncementAudience, type AnnouncementStatus,
} from "@/lib/admin-ops-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, errorText, formatDate, LoadingRows, PageHeader, Pager, titleCase } from "../ui";
import { AnnouncementDialog } from "./announcement-dialog";
import { AUDIENCE_HELP, audienceLabel, isScheduled, StatusPill } from "./announcement-bits";

const ALL = "all";
type Confirm = { kind: "publish" | "delete"; announcement: Announcement };

export default function AnnouncementsList() {
  const { withToken } = useAuth();
  const [status, setStatus] = useState<AnnouncementStatus | undefined>();
  const [audience, setAudience] = useState<AnnouncementAudience | undefined>();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | undefined>();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const query = { status, audience, page, limit: 20 };
  const { data, error, loading, reload } = useAdminData(token => announcementsApi.list(token, query), JSON.stringify(query));

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };

  async function run(a: Announcement, action: "publish" | "archive" | "delete") {
    setBusy(a.id);
    try {
      if (action === "publish") await withToken(token => announcementsApi.publish(token, a.id));
      if (action === "archive") await withToken(token => announcementsApi.archive(token, a.id));
      if (action === "delete") await withToken(token => announcementsApi.remove(token, a.id));
      toast.success(action === "publish" ? "Announcement published" : action === "archive" ? "Announcement archived" : "Announcement deleted");
      reload();
    } catch (e) {
      toast.error(errorText(e, `Could not ${action} the announcement.`));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  const actions: RowActions = {
    open: a => { setEditing(a); setFormOpen(true); },
    publish: a => setConfirm({ kind: "publish", announcement: a }),
    archive: a => void run(a, "archive"),
    remove: a => setConfirm({ kind: "delete", announcement: a }),
    busy,
  };

  return <>
    <PageHeader title="Announcements" description="Notices for students, faculty and batches. Publishing notifies the audience."
      actions={<Button onClick={openCreate}><Plus /> New announcement</Button>} />

    <Card className="gap-0 py-0">
      <div className="grid grid-cols-2 gap-3 border-b p-4 sm:flex sm:items-center">
        <Select value={status ?? ALL} onValueChange={v => { setStatus(v === ALL ? undefined : v as AnnouncementStatus); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {ANNOUNCEMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={audience ?? ALL} onValueChange={v => { setAudience(v === ALL ? undefined : v as AnnouncementAudience); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by audience"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All audiences</SelectItem>
            {AUDIENCES.map(a => <SelectItem key={a} value={a}>{audienceLabel({ audience: a, batches: null })}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && data.data.length === 0 && <EmptyState icon={Megaphone}
          title={status || audience ? "No announcements match these filters" : "No announcements yet"}
          description={status || audience ? "Try clearing the filters." : "Write the first notice for your students or staff."}
          action={!status && !audience && <Button onClick={openCreate}><Plus /> New announcement</Button>} />}
        {data && data.data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <AnnouncementsTable rows={data.data} actions={actions} />
          <AnnouncementsCards rows={data.data} actions={actions} />
        </div>}
      </CardContent>

      {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
    </Card>

    <AnnouncementDialog open={formOpen} onOpenChange={setFormOpen} announcement={editing} onSaved={reload} />

    <AlertDialog open={!!confirm} onOpenChange={open => { if (!open && busy === null) setConfirm(null); }}>
      <AlertDialogContent>
        {confirm && <>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.kind === "publish" ? "Publish" : "Delete"} “{confirm.announcement.title}”?</AlertDialogTitle>
            <AlertDialogDescription>{confirm.kind === "publish"
              ? `${AUDIENCE_HELP[confirm.announcement.audience]} They will see it in their feed and get a notification${confirm.announcement.publish_at && new Date(confirm.announcement.publish_at) > new Date() ? ` on ${formatDate(confirm.announcement.publish_at, true)}` : " now"}.`
              : "This permanently removes the announcement. To hide a published one but keep a record, archive it instead."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy !== null}
              className={confirm.kind === "delete" ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
              onClick={e => { e.preventDefault(); void run(confirm.announcement, confirm.kind); }}>
              {busy !== null && <Loader2 className="animate-spin" />}{confirm.kind === "publish" ? "Publish" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </>}
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

type RowActions = {
  open: (a: Announcement) => void;
  publish: (a: Announcement) => void;
  archive: (a: Announcement) => void;
  remove: (a: Announcement) => void;
  busy: number | null;
};

function ActionButtons({ a, actions, labels = false }: { a: Announcement; actions: RowActions; labels?: boolean }) {
  const archived = a.status === "ARCHIVED";
  const items = [
    { label: archived ? "View" : "Edit", icon: Pencil, onClick: () => actions.open(a) },
    a.status !== "PUBLISHED"
      ? { label: archived ? "Republish" : "Publish", icon: Send, onClick: () => actions.publish(a) }
      : { label: "Archive", icon: Archive, onClick: () => actions.archive(a) },
    { label: "Delete", icon: Trash2, onClick: () => actions.remove(a), destructive: true },
  ];
  const busy = actions.busy === a.id;
  return <div className={labels ? "grid grid-cols-3 gap-2" : "flex justify-end gap-1"}>
    {items.map(({ label, icon: Icon, onClick, destructive }) => {
      const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
      const button = <Button variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className} onClick={onClick} disabled={busy} aria-label={`${label} ${a.title}`}>
        {busy && label === "Archive" ? <Loader2 className="animate-spin" /> : <Icon />}{labels && label}
      </Button>;
      if (labels) return <span key={label} className="contents">{button}</span>;
      return <Tooltip key={label}>
        <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>;
    })}
  </div>;
}

const when = (a: Announcement) => a.publish_at
  ? `${isScheduled(a) ? "Goes live" : a.status === "DRAFT" ? "Scheduled for" : "Published"} ${formatDate(a.publish_at, true)}`
  : `Created ${formatDate(a.created_at, true)}`;

function AnnouncementsTable({ rows, actions }: { rows: Announcement[]; actions: RowActions }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Announcement</TableHead>
        <TableHead>Audience</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden lg:table-cell">Date</TableHead>
        <TableHead className="hidden xl:table-cell">Author</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(a => <TableRow key={a.id}>
        <TableCell className="pl-4">
          <button type="button" className="block max-w-[20rem] truncate text-left font-medium hover:underline" onClick={() => actions.open(a)}>{a.title}</button>
          <p className="max-w-[20rem] truncate text-xs text-muted-foreground">{a.body}</p>
        </TableCell>
        <TableCell className="max-w-[12rem] truncate text-muted-foreground">{audienceLabel(a)}</TableCell>
        <TableCell><StatusPill announcement={a} /></TableCell>
        <TableCell className="hidden text-muted-foreground lg:table-cell">{when(a)}</TableCell>
        <TableCell className="hidden text-muted-foreground xl:table-cell">{a.users?.full_name ?? "—"}</TableCell>
        <TableCell className="pr-4"><ActionButtons a={a} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function AnnouncementsCards({ rows, actions }: { rows: Announcement[]; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {rows.map(a => <li key={a.id} className="grid gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left font-medium" onClick={() => actions.open(a)}>{a.title}</button>
        <StatusPill announcement={a} />
      </div>
      <p className="line-clamp-2 text-sm break-words text-muted-foreground">{a.body}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{audienceLabel(a)}</span>
        <span>{when(a)}</span>
      </div>
      <ActionButtons a={a} actions={actions} labels />
    </li>)}
  </ul>;
}

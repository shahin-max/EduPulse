"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { auditApi, type AuditLog } from "@/lib/admin-ops-api";
import { useAdminData } from "../use-admin-data";
import { loadStaff } from "../enquiries/enquiry-bits";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, PageHeader, Pager, Pill, UserAvatar, type Tone } from "../ui";

const ALL = "all";

/** entity_type is the API controller name; these are the ones that accept changes. */
const ENTITY_TYPES = [
  "Announcements", "Assignments", "Attempts", "Attendance", "Auth", "Batches", "Branches", "Chapters", "ClassSessions", "Courses",
  "Enquiries", "Enrollments", "Exams", "Faculty", "FeeInvoices", "FeePlans", "Files", "Materials", "Notifications", "Payments",
  "Questions", "Refunds", "Students", "Subjects", "Submissions", "Users", "WebsiteContent",
];

const METHOD_TONES: Record<string, Tone> = { POST: "green", PUT: "blue", PATCH: "amber", DELETE: "red" };

/** "Users" -> "Users", "ClassSessions" -> "Class sessions". */
const entityLabel = (type: string) => type.replace(/(?<=[a-z])([A-Z])/g, " $1").replace(/ \w/g, m => m.toLowerCase());

/** `yyyy-mm-dd` (local) -> ISO at the start or end of that day. */
const dayBound = (date: string, end: boolean) => date ? new Date(`${date}T${end ? "23:59:59.999" : "00:00:00"}`).toISOString() : undefined;

export default function AuditLogList() {
  const [actor, setActor] = useState<{ id: number; name: string } | undefined>();
  const [entityType, setEntityType] = useState<string | undefined>();
  const [entityIdText, setEntityIdText] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  // Look up the record id after a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => { setEntityId(entityIdText.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [entityIdText]);

  const query = {
    actorUserId: actor?.id, entityType, entityId: entityId || undefined,
    from: dayBound(from, false), to: dayBound(to, true), page, limit: 25,
  };
  const { data, error, loading, reload } = useAdminData(token => auditApi.list(token, query), JSON.stringify(query));
  const staff = useAdminData(loadStaff, "staff");

  const reset = (fn: () => void) => { fn(); setPage(1); };
  const filtered = !!(actor || entityType || entityIdText.trim() || from || to);
  const clear = () => reset(() => { setActor(undefined); setEntityType(undefined); setEntityIdText(""); setEntityId(""); setFrom(""); setTo(""); });
  const filterActor = (log: AuditLog) => log.users && reset(() => setActor({ id: log.users!.id, name: log.users!.full_name }));
  const filterEntity = (log: AuditLog) => reset(() => { setEntityType(log.entity_type); setEntityIdText(log.entity_id ?? ""); setEntityId(log.entity_id ?? ""); });
  const actorInList = !actor || staff.data?.some(s => s.id === actor.id);

  return <>
    <PageHeader title="Audit log" description="Every change made by a logged-in user, newest first. Request bodies are not stored, only which fields were sent."
      actions={<Button variant="outline" onClick={reload} disabled={loading}><RefreshCw className={cn(loading && "animate-spin")} /> Refresh</Button>} />

    <Card className="gap-0 py-0">
      <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="au-actor" className="text-xs text-muted-foreground">Who</Label>
          <Select value={actor ? String(actor.id) : ALL} onValueChange={v => reset(() => {
            const s = staff.data?.find(u => u.id === Number(v));
            setActor(v === ALL ? undefined : s ? { id: s.id, name: s.full_name } : actor);
          })}>
            <SelectTrigger id="au-actor" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              {!actorInList && actor && <SelectItem value={String(actor.id)}>{actor.name}</SelectItem>}
              {staff.data?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="au-entity" className="text-xs text-muted-foreground">Area</Label>
          <Select value={entityType ?? ALL} onValueChange={v => reset(() => setEntityType(v === ALL ? undefined : v))}>
            <SelectTrigger id="au-entity" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All areas</SelectItem>
              {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{entityLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="au-id" className="text-xs text-muted-foreground">Record id</Label>
          <Input id="au-id" inputMode="numeric" maxLength={80} placeholder="e.g. 42" value={entityIdText} onChange={e => setEntityIdText(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="au-from" className="text-xs text-muted-foreground">From</Label>
          <Input id="au-from" type="date" value={from} max={to || undefined} onChange={e => reset(() => setFrom(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="au-to" className="text-xs text-muted-foreground">To</Label>
          <Input id="au-to" type="date" value={to} min={from || undefined} onChange={e => reset(() => setTo(e.target.value))} />
        </div>
        <Button variant="ghost" onClick={clear} disabled={!filtered} className="sm:col-span-2 lg:col-span-1"><X /> Clear</Button>
      </div>

      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && data.data.length === 0 && <EmptyState icon={History}
          title={filtered ? "No entries match these filters" : "No activity yet"}
          description={filtered ? "Try a wider date range or clear the filters." : "Changes made in the admin panel and by users appear here."} />}
        {data && data.data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <AuditTable rows={data.data} onActor={filterActor} onEntity={filterEntity} />
          <AuditCards rows={data.data} onActor={filterActor} onEntity={filterEntity} />
        </div>}
      </CardContent>

      {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
    </Card>
  </>;
}

type RowProps = { rows: AuditLog[]; onActor: (log: AuditLog) => void; onEntity: (log: AuditLog) => void };

function Actor({ log, onActor }: { log: AuditLog; onActor: (log: AuditLog) => void }) {
  if (!log.users) return <span className="text-muted-foreground">{log.actor_user_id ? `User #${log.actor_user_id}` : "System"}</span>;
  return <button type="button" className="flex min-w-0 items-center gap-2 text-left hover:underline" onClick={() => onActor(log)} title="Show only this person's changes">
    <UserAvatar name={log.users.full_name} className="size-7" />
    <span className="truncate">{log.users.full_name}</span>
  </button>;
}

/** "Users.update" -> "update"; the controller part is shown as the entity. */
const actionName = (log: AuditLog) => log.action.startsWith(`${log.entity_type}.`) ? log.action.slice(log.entity_type.length + 1) : log.action;

function Method({ log }: { log: AuditLog }) {
  const method = log.metadata?.method;
  return method ? <Pill value={method} tones={METHOD_TONES} label={method} className="font-mono text-[10px]" /> : null;
}

function Entity({ log, onEntity }: { log: AuditLog; onEntity: (log: AuditLog) => void }) {
  const userLink = log.entity_type === "Users" && log.entity_id && /^\d+$/.test(log.entity_id);
  return <span className="flex flex-wrap items-center gap-x-1">
    <button type="button" className="hover:underline" onClick={() => onEntity(log)} title="Show only changes to this record">{entityLabel(log.entity_type)}</button>
    {log.entity_id && (userLink
      ? <Link href={`/admin/users/${log.entity_id}`} className="text-primary hover:underline">#{log.entity_id}</Link>
      : <span className="text-muted-foreground">#{log.entity_id}</span>)}
  </span>;
}

const fields = (log: AuditLog) => log.metadata?.fields?.length ? log.metadata.fields.join(", ") : "";

function AuditTable({ rows, onActor, onEntity }: RowProps) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">When</TableHead>
        <TableHead>Who</TableHead>
        <TableHead>Action</TableHead>
        <TableHead>Record</TableHead>
        <TableHead className="hidden lg:table-cell">Path</TableHead>
        <TableHead className="hidden xl:table-cell pr-4">Fields sent</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(log => <TableRow key={log.id}>
        <TableCell className="pl-4 whitespace-nowrap text-muted-foreground" title={log.ip_address ? `IP ${log.ip_address}` : undefined}>{formatDate(log.created_at, true)}</TableCell>
        <TableCell className="max-w-[12rem]"><Actor log={log} onActor={onActor} /></TableCell>
        <TableCell><span className="flex items-center gap-2"><Method log={log} /><span className="font-mono text-xs">{actionName(log)}</span></span></TableCell>
        <TableCell><Entity log={log} onEntity={onEntity} /></TableCell>
        <TableCell className="hidden max-w-[16rem] truncate font-mono text-xs text-muted-foreground lg:table-cell" title={log.metadata?.path}>{log.metadata?.path ?? "—"}</TableCell>
        <TableCell className="hidden max-w-[14rem] truncate pr-4 text-xs text-muted-foreground xl:table-cell" title={fields(log)}>{fields(log) || "—"}</TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function AuditCards({ rows, onActor, onEntity }: RowProps) {
  return <ul className="divide-y md:hidden">
    {rows.map(log => <li key={log.id} className="grid gap-2 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <Actor log={log} onActor={onActor} />
        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(log.created_at, true)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Method log={log} />
        <span className="font-mono text-xs">{actionName(log)}</span>
        <span className="text-muted-foreground">·</span>
        <Entity log={log} onEntity={onEntity} />
      </div>
      {log.metadata?.path && <p className="font-mono text-xs break-all text-muted-foreground">{log.metadata.path}</p>}
      {fields(log) && <p className="text-xs text-muted-foreground">Fields: {fields(log)}</p>}
    </li>)}
  </ul>;
}

"use client";

import { useEffect, useState } from "react";
import { Inbox, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ENQUIRY_STATUSES, enquiriesApi, listCourses, type Enquiry, type EnquiryStatus } from "@/lib/admin-ops-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, PageHeader, Pager, titleCase } from "../ui";
import { ContactButtons, loadStaff, SourcePill, StatusPill } from "./enquiry-bits";
import { EnquirySheet } from "./enquiry-sheet";

const ALL = "all";

export default function EnquiriesList() {
  const [status, setStatus] = useState<EnquiryStatus | undefined>();
  const [courseId, setCourseId] = useState<number | undefined>();
  const [assignedTo, setAssignedTo] = useState<number | undefined>();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Enquiry | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = { status, courseId, assignedTo, search, page, limit: 20 };
  const { data, error, loading, reload } = useAdminData(token => enquiriesApi.list(token, query), JSON.stringify(query));
  const newCount = useAdminData(token => enquiriesApi.list(token, { status: "NEW", limit: 1 }), "new");
  const staff = useAdminData(loadStaff, "staff");
  const courses = useAdminData(listCourses, "courses");

  const refresh = () => { reload(); newCount.reload(); };
  const onChanged = (updated: Enquiry) => { setSelected(updated); refresh(); };
  const filterStatus = (value: EnquiryStatus | undefined) => { setStatus(value); setPage(1); };
  const filtered = !!(status || courseId || assignedTo || search);
  const newTotal = newCount.data?.meta.total;

  return <>
    <PageHeader title="Enquiries" description="Admission enquiries and callback requests from the website."
      actions={<Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className={cn(loading && "animate-spin")} /> Refresh</Button>} />

    <button type="button" onClick={() => filterStatus(status === "NEW" ? undefined : "NEW")}
      className={cn("flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-accent/50",
        newTotal ? "border-sky-500/40" : "", status === "NEW" && "ring-2 ring-sky-500/40")}>
      <span className="text-3xl font-semibold tabular-nums text-sky-700 dark:text-sky-300">{newTotal ?? "–"}</span>
      <span className="min-w-0">
        <span className="block font-medium">New {newTotal === 1 ? "enquiry" : "enquiries"} waiting</span>
        <span className="block text-sm text-muted-foreground">{status === "NEW" ? "Showing new only. Tap to show all." : newTotal ? "Not contacted yet. Tap to show them." : "Everyone has been contacted."}</span>
      </span>
    </button>

    <Card className="gap-0 py-0">
      <div className="flex gap-1 overflow-x-auto border-b p-2" role="tablist" aria-label="Filter by status">
        {[undefined, ...ENQUIRY_STATUSES].map(s => {
          const active = status === s;
          return <Button key={s ?? ALL} role="tab" aria-selected={active} size="sm" variant={active ? "secondary" : "ghost"} className="shrink-0" onClick={() => filterStatus(s)}>
            {s ? titleCase(s) : "All"}
            {s === "NEW" && !!newTotal && <Badge className="h-5 min-w-5 rounded-full px-1.5 tabular-nums">{newTotal}</Badge>}
          </Button>;
        })}
      </div>
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search by name or mobile" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search enquiries" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <Select value={courseId ? String(courseId) : ALL} onValueChange={v => { setCourseId(v === ALL ? undefined : Number(v)); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by course"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All courses</SelectItem>
              {courses.data?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={assignedTo ? String(assignedTo) : ALL} onValueChange={v => { setAssignedTo(v === ALL ? undefined : Number(v)); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by assignee"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              {staff.data?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && data.data.length === 0 && <EmptyState icon={Inbox}
          title={filtered ? "No enquiries match these filters" : "No enquiries yet"}
          description={filtered ? "Try a different search or clear the filters." : "Requests from the website's callback and admission forms appear here."} />}
        {data && data.data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <EnquiriesTable rows={data.data} onOpen={setSelected} />
          <EnquiriesCards rows={data.data} onOpen={setSelected} />
        </div>}
      </CardContent>

      {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
    </Card>

    <EnquirySheet enquiry={selected} staff={staff.data ?? []} onOpenChange={open => { if (!open) setSelected(null); }} onChanged={onChanged} />
  </>;
}

/**
 * A short preview of the message. The website's forms start with a header line ("Admission application
 * (website)") and repeat the course, which the row already shows, so those lines are skipped.
 */
const preview = (message: string | null) => {
  const lines = (message ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const useful = lines.filter(line => !/^admission application\b/i.test(line) && !/^(course|program):/i.test(line));
  return (useful.length ? useful : lines).slice(0, 2).join(" · ");
};

function EnquiriesTable({ rows, onOpen }: { rows: Enquiry[]; onOpen: (e: Enquiry) => void }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Enquiry</TableHead>
        <TableHead>Mobile</TableHead>
        <TableHead className="hidden lg:table-cell">Course</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden xl:table-cell">Assigned to</TableHead>
        <TableHead className="hidden lg:table-cell">Received</TableHead>
        <TableHead className="pr-4 text-right">Contact</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(e => <TableRow key={e.id} className={cn("cursor-pointer", e.status === "NEW" && "bg-sky-500/5")} onClick={() => onOpen(e)}>
        <TableCell className="pl-4">
          <button type="button" className="block max-w-[16rem] truncate text-left font-medium hover:underline" onClick={ev => { ev.stopPropagation(); onOpen(e); }}>{e.student_name}</button>
          <div className="mt-1 flex items-center gap-2">
            <SourcePill source={e.source} />
            <span className="max-w-[12rem] truncate text-xs text-muted-foreground">{preview(e.message)}</span>
          </div>
        </TableCell>
        <TableCell className="tabular-nums text-muted-foreground">{e.mobile}</TableCell>
        <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground lg:table-cell">{e.courses?.title ?? "—"}</TableCell>
        <TableCell><StatusPill status={e.status} /></TableCell>
        <TableCell className="hidden text-muted-foreground xl:table-cell">{e.users?.full_name ?? "Unassigned"}</TableCell>
        <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(e.created_at, true)}</TableCell>
        <TableCell className="pr-4" onClick={ev => ev.stopPropagation()}>
          <div className="flex justify-end gap-1"><ContactButtons mobile={e.mobile} name={e.student_name} /></div>
        </TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function EnquiriesCards({ rows, onOpen }: { rows: Enquiry[]; onOpen: (e: Enquiry) => void }) {
  return <ul className="divide-y md:hidden">
    {rows.map(e => <li key={e.id} className={cn("grid gap-3 p-4", e.status === "NEW" && "bg-sky-500/5")}>
      <button type="button" className="grid gap-1 text-left" onClick={() => onOpen(e)}>
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-medium">{e.student_name}</span>
          <StatusPill status={e.status} />
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">{e.mobile}</span>
        {e.courses && <span className="truncate text-sm text-muted-foreground">{e.courses.title}</span>}
        {preview(e.message) && <span className="line-clamp-2 text-xs text-muted-foreground">{preview(e.message)}</span>}
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SourcePill source={e.source} />
          <span>{formatDate(e.created_at, true)}</span>
          {e.users && <span>· {e.users.full_name}</span>}
        </span>
      </button>
      <div className="grid grid-cols-3 gap-2">
        <ContactButtons mobile={e.mobile} name={e.student_name} labels />
        <Button size="sm" onClick={() => onOpen(e)}>Open</Button>
      </div>
    </li>)}
  </ul>;
}

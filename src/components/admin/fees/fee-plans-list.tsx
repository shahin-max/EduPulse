"use client";

import { useState } from "react";
import { Pencil, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { feeLookupsApi, feePlansApi, type FeeBranch, type FeePlanListItem } from "@/lib/admin-fees-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, formatMoney, LoadingRows, Pill } from "../ui";
import { FeePlanFormDialog } from "./fee-plan-dialogs";

const ALL = "all";
const ACTIVE_TONES = { ACTIVE: "green", INACTIVE: "gray" } as const;

/** "Batch JEE-27A", "Civil Lines branch" or "All branches". */
export function planScope(plan: FeePlanListItem, branches: FeeBranch[] | null | undefined) {
  if (plan.batches) return `Batch ${plan.batches.code}`;
  if (plan.branch_id !== null) return branches?.find(b => b.id === plan.branch_id)?.name ?? `Branch #${plan.branch_id}`;
  return "All branches";
}

export default function FeePlansList({ onCreate }: { onCreate: () => void }) {
  const [courseId, setCourseId] = useState<number | undefined>();
  const [activeOnly, setActiveOnly] = useState(false);
  const [editing, setEditing] = useState<FeePlanListItem | null>(null);

  const courses = useAdminData(token => feeLookupsApi.courses(token), "courses");
  const branches = useAdminData(token => feeLookupsApi.branches(token), "branches");
  const query = { courseId, activeOnly: activeOnly || undefined };
  const { data, error, loading, reload } = useAdminData(token => feePlansApi.list(token, query), JSON.stringify(query));
  const filtered = !!(courseId || activeOnly);

  return <Card className="gap-0 py-0">
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
      <Select value={courseId ? String(courseId) : ALL} onValueChange={v => setCourseId(v === ALL ? undefined : Number(v))}>
        <SelectTrigger className="w-full sm:w-64" aria-label="Filter by course"><SelectValue placeholder="All courses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All courses</SelectItem>
          {courses.data?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2 sm:pl-1">
        <Checkbox id="active-only" checked={activeOnly} onCheckedChange={v => setActiveOnly(v === true)} />
        <Label htmlFor="active-only" className="font-normal whitespace-nowrap">Active only</Label>
      </div>
    </div>

    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows />}
      {data && data.length === 0 && <EmptyState icon={Tags}
        title={filtered ? "No fee plans match these filters" : "No fee plans yet"}
        description={filtered ? "Try a different course or clear the filters." : "A fee plan sets the standard fee for a course, branch or batch."}
        action={!filtered && <Button onClick={onCreate}><Plus /> New fee plan</Button>} />}
      {data && data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Plan</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(p => <TableRow key={p.id}>
              <TableCell className="pl-4"><p className="max-w-[18rem] truncate font-medium">{p.title}</p></TableCell>
              <TableCell className="text-muted-foreground"><span className="block max-w-[14rem] truncate">{p.courses.title}</span></TableCell>
              <TableCell className="text-muted-foreground">{planScope(p, branches.data)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</TableCell>
              <TableCell><Pill value={p.is_active ? "ACTIVE" : "INACTIVE"} tones={ACTIVE_TONES} /></TableCell>
              <TableCell className="pr-4 text-right">
                <Tooltip>
                  <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label={`Edit ${p.title}`}><Pencil /></Button></TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
        <ul className="divide-y md:hidden">
          {data.map(p => <li key={p.id} className="grid gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">{p.courses.title} · {planScope(p, branches.data)}</p>
              </div>
              <Pill value={p.is_active ? "ACTIVE" : "INACTIVE"} tones={ACTIVE_TONES} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold tabular-nums">{formatMoney(p.amount, p.currency)}</span>
              <Button variant="outline" size="sm" onClick={() => setEditing(p)}><Pencil /> Edit</Button>
            </div>
          </li>)}
        </ul>
      </div>}
    </CardContent>

    <FeePlanFormDialog open={!!editing} plan={editing ?? undefined} onOpenChange={open => { if (!open) setEditing(null); }} onSaved={reload} />
  </Card>;
}

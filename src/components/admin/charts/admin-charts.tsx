"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, plural } from "@/lib/utils";
import type { AdminSummary } from "@/lib/admin-ops-api";

/**
 * Small hand-built charts for the admin home (no chart library). One hue (the theme primary) for
 * magnitude, red only for the "below 75% attendance" status, which also gets an icon and a label.
 * Every chart has an aria-label summary and a per-bar tooltip.
 */

const LOW_ATTENDANCE = 75;

/** "2026-06" -> "Jun"; "Jun 2026" in tooltips. */
const monthShort = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
const monthLong = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const rupees = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
/** "₹1.2L", "₹45K": compact labels that fit above a thin bar. */
const rupeesShort = (n: number) => Math.abs(n) >= 100_000 ? `₹${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`
  : Math.abs(n) >= 1000 ? `₹${Math.round(n / 1000)}K` : `₹${Math.round(n)}`;

type Column = { key: string; value: number; part?: number; tip: string };

/**
 * Vertical columns, one per month. `part` (optional) is drawn as a darker segment at the bottom of
 * the column (e.g. converted enquiries within all enquiries). Only the latest value is labelled.
 */
function Columns({ columns, label, short }: { columns: Column[]; label: string; short: (n: number) => string }) {
  const max = Math.max(1, ...columns.map(c => c.value));
  return <div role="img" aria-label={label} className="grid gap-2">
    <div className="flex h-36 items-end gap-2 border-b border-border/80 sm:gap-3">
      {columns.map((c, i) => {
        const last = i === columns.length - 1;
        const height = c.value > 0 ? Math.max(2, (c.value / max) * 100) : 0;
        return <Tooltip key={c.key}>
          <TooltipTrigger asChild>
            {/* The trigger fills the column, so the hover target is bigger than the bar. */}
            <div className="group relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end" tabIndex={0}>
              {last && <span className="mb-1 text-center text-[11px] font-medium tabular-nums text-foreground">{short(c.value)}</span>}
              <div className={cn("mx-auto flex w-full max-w-9 flex-col justify-end overflow-hidden rounded-t-[4px] transition-opacity group-hover:opacity-80",
                c.part === undefined ? "bg-primary" : "gap-[2px] bg-transparent")} style={{ height: `${height}%` }}>
                {c.part !== undefined && <>
                  <div className="w-full rounded-t-[4px] bg-primary/35" style={{ flexGrow: Math.max(0, c.value - c.part) }} />
                  {c.part > 0 && <div className="w-full bg-primary" style={{ flexGrow: c.part }} />}
                </>}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>{c.tip}</TooltipContent>
        </Tooltip>;
      })}
    </div>
    <div className="flex gap-2 sm:gap-3" aria-hidden="true">
      {columns.map(c => <span key={c.key} className="min-w-0 flex-1 text-center text-xs text-muted-foreground">{monthShort(c.key)}</span>)}
    </div>
  </div>;
}

function ChartCard({ title, description, children, className }: { title: string; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <Card className={cn("min-w-0", className)}>
    <CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
    <CardContent>{children}</CardContent>
  </Card>;
}

const ChartSkeleton = () => <Skeleton className="h-44 w-full" />;

/** The admin home's "last 6 months" charts and attendance by batch. */
export function AdminCharts({ data, error }: { data: AdminSummary | null; error?: string }) {
  if (error) return <p className="text-sm text-muted-foreground">Could not load the charts: {error}</p>;
  const months = data?.months ?? [];
  const totalCollected = data ? data.collections.reduce((s, n) => s + n, 0) : 0;
  const totalEnrolled = data ? data.enrollments.reduce((s, n) => s + n, 0) : 0;
  const enquiries = data ? data.enquiries.reduce((s, e) => s + e.total, 0) : 0;
  const converted = data ? data.enquiries.reduce((s, e) => s + e.converted, 0) : 0;
  const rate = enquiries ? Math.round((converted / enquiries) * 100) : null;
  const range = months.length ? `${monthShort(months[0])}–${monthShort(months[months.length - 1])}` : "";

  return <section className="grid gap-6" aria-labelledby="trends-title">
    <h2 id="trends-title" className="sr-only">Trends for the last six months</h2>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard title="Fee collections" description={data ? `${rupees(totalCollected)} collected, ${range} (after refunds)` : "Last 6 months"}>
        {!data ? <ChartSkeleton /> : <Columns short={rupeesShort}
          label={`Fee collections by month: ${months.map((m, i) => `${monthShort(m)} ${rupees(data.collections[i])}`).join(", ")}`}
          columns={months.map((m, i) => ({ key: m, value: data.collections[i], tip: `${monthLong(m)}: ${rupees(data.collections[i])}` }))} />}
      </ChartCard>

      <ChartCard title="New enrollments" description={data ? `${plural(totalEnrolled, "student")} enrolled, ${range}` : "Last 6 months"}>
        {!data ? <ChartSkeleton /> : <Columns short={n => String(n)}
          label={`New enrollments by month: ${months.map((m, i) => `${monthShort(m)} ${data.enrollments[i]}`).join(", ")}`}
          columns={months.map((m, i) => ({ key: m, value: data.enrollments[i], tip: `${monthLong(m)}: ${data.enrollments[i]} enrolled` }))} />}
      </ChartCard>

      <ChartCard title="Enquiries" className="md:col-span-2 xl:col-span-1"
        description={data ? (rate === null ? `No enquiries, ${range}` : `${enquiries} received, ${converted} converted (${rate}%)`) : "Last 6 months"}>
        {!data ? <ChartSkeleton /> : <div className="grid gap-3">
          <Columns short={n => String(n)}
            label={`Enquiries by month, with conversions: ${months.map((m, i) => `${monthShort(m)} ${data.enquiries[i].total} received, ${data.enquiries[i].converted} converted`).join("; ")}`}
            columns={months.map((m, i) => ({
              key: m, value: data.enquiries[i].total, part: data.enquiries[i].converted,
              tip: `${monthLong(m)}: ${data.enquiries[i].total} received, ${data.enquiries[i].converted} converted`,
            }))} />
          <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legend">
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary/35" aria-hidden="true" />Not converted</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" />Converted</li>
          </ul>
        </div>}
      </ChartCard>
    </div>

    <ChartCard title="Attendance by batch" description={`Active batches. Late counts as present; below ${LOW_ATTENDANCE}% is flagged.`}>
      {!data ? <ChartSkeleton /> : data.batch_attendance.length === 0
        ? <p className="text-sm text-muted-foreground">No active batches.</p>
        : <ul className="grid gap-3" role="img" aria-label={`Attendance by batch: ${data.batch_attendance.map(b => `${b.batch.name} ${b.percentage === null ? "not marked yet" : `${b.percentage}%`}`).join(", ")}`}>
          {[...data.batch_attendance].sort((a, b) => (a.percentage ?? 101) - (b.percentage ?? 101)).map(b => {
            const low = b.percentage !== null && b.percentage < LOW_ATTENDANCE;
            return <li key={b.batch.id}>
              <Link href={`/admin/batches/${b.batch.id}`} className="grid gap-1.5 rounded-md p-1 -m-1 hover:bg-muted/50 sm:grid-cols-[minmax(0,14rem)_1fr_6rem] sm:items-center sm:gap-3">
                <span className="truncate text-sm font-medium">{b.batch.name} <span className="font-normal text-muted-foreground">({b.batch.code})</span></span>
                {b.percentage === null
                  ? <span className="text-xs text-muted-foreground sm:col-span-2">Not marked yet</span>
                  : <>
                    <span className="block h-2 overflow-hidden rounded-full bg-muted" title={`${b.percentage}% over ${b.marked} marks`}>
                      <span className={cn("block h-full rounded-full", low ? "bg-red-500" : "bg-primary")} style={{ width: `${Math.min(100, b.percentage)}%` }} />
                    </span>
                    <span className={cn("flex items-center gap-1 text-sm tabular-nums sm:justify-end", low ? "font-medium text-red-700 dark:text-red-400" : "text-foreground")}>
                      {low && <AlertTriangle className="size-3.5" aria-hidden="true" />}{b.percentage}%{low && <span className="sr-only"> (below {LOW_ATTENDANCE}%)</span>}
                    </span>
                  </>}
              </Link>
            </li>;
          })}
        </ul>}
    </ChartCard>
  </section>;
}

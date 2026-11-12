"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, Clock, Database, GraduationCap, Inbox, Layers, Phone, Server, UserPlus, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { healthApi, query, usersApi, type Paginated } from "@/lib/admin-api";
import { useAdminData } from "./use-admin-data";
import { ErrorAlert, formatDate, PageHeader, RoleBadges, StatusBadge, UserAvatar } from "./ui";

type Enquiry = { id: number; student_name: string; mobile: string; source: string | null; created_at: string; courses: { title: string } | null };
type ClassSession = {
  id: number; title: string; starts_at: string; ends_at: string; status: string; meeting_url: string | null;
  batches: { name: string }; subjects: { name: string } | null; faculty_profiles: { users: { full_name: string } } | null;
};

/** Total of a paginated list (limit=1 is enough to read the count), or null when that endpoint fails. */
const total = (token: string, path: string, params: Record<string, string | number | boolean>) =>
  request<Paginated<unknown>>(`${path}${query({ ...params, limit: 1 })}`, { token }).then(r => r.meta.total).catch(() => null);

async function loadOverview(token: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  // Each part fails on its own, so one broken endpoint never blanks the dashboard.
  const [students, newEnquiries, activeBatches, overdue, enquiries, today, recent, health] = await Promise.all([
    total(token, "/users", { role: "STUDENT" }),
    total(token, "/admission-enquiries", { status: "NEW" }),
    total(token, "/batches", { status: "ACTIVE" }),
    total(token, "/fee-invoices", { overdue: true }),
    request<Paginated<Enquiry>>(`/admission-enquiries${query({ limit: 5 })}`, { token }).then(r => r.data).catch(() => null),
    request<ClassSession[]>(`/class-sessions/timetable${query({ from: start.toISOString(), to: end.toISOString() })}`, { token }).catch(() => null),
    usersApi.list(token, { limit: 5 }).then(r => r.data).catch(() => null),
    healthApi.check().catch(() => null),
  ]);
  return { students, newEnquiries, activeBatches, overdue, enquiries, today, recent, health };
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export default function AdminOverview() {
  const { user } = useAuth();
  const { data, error, reload } = useAdminData(loadOverview, "overview");

  const stats = [
    { label: "Students", value: data?.students, icon: GraduationCap, href: "/admin/users?role=STUDENT" },
    { label: "New enquiries", value: data?.newEnquiries, icon: Inbox, href: "/admin/enquiries", alert: !!data?.newEnquiries },
    { label: "Active batches", value: data?.activeBatches, icon: Layers, href: "/admin/batches" },
    { label: "Overdue invoices", value: data?.overdue, icon: AlertTriangle, href: "/admin/fees", alert: !!data?.overdue },
  ];

  return <>
    <PageHeader
      title={`Welcome back, ${user?.full_name.split(" ")[0] ?? "Admin"}`}
      description="Here is what is happening across EduPulse Academy today."
      actions={<Button asChild><Link href="/admin/users?new=1"><UserPlus /> Add user</Link></Button>}
    />
    {error && <ErrorAlert message={error} onRetry={reload} />}

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, href, alert }) => <Link key={label} href={href} className="group rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <Card className={`h-full gap-3 py-5 transition-colors group-hover:border-primary/40 ${alert ? "border-amber-500/40" : ""}`}>
          <CardHeader className="px-5">
            <CardDescription className="truncate">{label}</CardDescription>
            <CardAction><Icon className={`size-4 ${alert ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} /></CardAction>
          </CardHeader>
          <CardContent className="px-5">
            {value === undefined ? <Skeleton className="h-8 w-14" /> : <p className="text-3xl font-semibold tabular-nums">{value ?? "—"}</p>}
          </CardContent>
        </Card>
      </Link>)}
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>Latest enquiries</CardTitle>
          <CardDescription>Callback requests and admission applications from the website.</CardDescription>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/admin/enquiries">View all <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent>
          {!data ? <ListSkeleton />
            : !data.enquiries ? <p className="text-sm text-muted-foreground">Could not load enquiries.</p>
            : data.enquiries.length === 0 ? <p className="text-sm text-muted-foreground">No enquiries yet. They appear here when someone fills in a form on the website.</p>
            : <ul className="-mx-2 grid">
              {data.enquiries.map(e => <li key={e.id} className="flex items-center gap-3 rounded-md p-2">
                <UserAvatar name={e.student_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.student_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.courses?.title ?? "Course not chosen"} · {formatDate(e.created_at, true)}</p>
                </div>
                {e.source === "WEBSITE_ADMISSION" && <Badge variant="outline" className="hidden sm:inline-flex">Admission form</Badge>}
                <Button asChild variant="ghost" size="icon" aria-label={`Call ${e.student_name}`}><a href={`tel:${e.mobile}`}><Phone /></a></Button>
              </li>)}
            </ul>}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader><CardTitle>Today&apos;s classes</CardTitle><CardDescription>{formatDate(new Date().toISOString())}</CardDescription></CardHeader>
        <CardContent>
          {!data ? <ListSkeleton rows={3} />
            : !data.today ? <p className="text-sm text-muted-foreground">Could not load the timetable.</p>
            : data.today.length === 0 ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> No classes scheduled today.</p>
            : <ul className="grid gap-3">
              {data.today.map(s => <li key={s.id} className="grid gap-0.5 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  {s.meeting_url && s.status !== "CANCELLED" && <a href={s.meeting_url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label={`Join ${s.title}`}><Video className="size-4" /></a>}
                </div>
                <p className="text-xs text-muted-foreground">{time(s.starts_at)}–{time(s.ends_at)} · {s.batches.name}{s.subjects ? ` · ${s.subjects.name}` : ""}</p>
                {s.status === "CANCELLED" ? <p className="text-xs font-medium text-destructive">Cancelled</p>
                  : s.faculty_profiles && <p className="text-xs text-muted-foreground">{s.faculty_profiles.users.full_name}</p>}
              </li>)}
            </ul>}
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>Newest accounts</CardTitle>
          <CardDescription>The latest people to join or be added.</CardDescription>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/admin/users">View all <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent>
          {!data ? <ListSkeleton />
            : !data.recent ? <p className="text-sm text-muted-foreground">Could not load accounts.</p>
            : data.recent.length === 0 ? <p className="text-sm text-muted-foreground">No accounts yet.</p>
            : <ul className="-mx-2 grid">
              {data.recent.map(u => <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted">
                  <UserAvatar name={u.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email ?? u.mobile} · {formatDate(u.created_at)}</p>
                  </div>
                  <RoleBadges roles={u.roles} className="hidden sm:flex" />
                  <StatusBadge status={u.status} deleted={!!u.deleted_at} />
                </Link>
              </li>)}
            </ul>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>System status</CardTitle><CardDescription>Backend health check.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <StatusRow icon={Server} label="API" ok={data ? data.health?.status === "ok" : undefined} okText="Online" badText="Unreachable" />
          <StatusRow icon={Database} label="Database" ok={data ? data.health?.database === "up" : undefined} okText="Connected" badText="Down" />
          <div className="flex items-center gap-3 text-sm">
            <Clock className="size-4 text-muted-foreground" /><span className="flex-1">Uptime</span>
            {data ? <span className="font-medium tabular-nums">{data.health ? `${Math.floor(data.health.uptimeSeconds / 60)} min` : "—"}</span> : <Skeleton className="h-5 w-14" />}
          </div>
        </CardContent>
      </Card>
    </div>
  </>;
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="grid gap-4">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>;
}

function StatusRow({ icon: Icon, label, ok, okText, badText }: { icon: React.ComponentType<{ className?: string }>; label: string; ok?: boolean; okText: string; badText: string }) {
  return <div className="flex items-center gap-3 text-sm">
    <Icon className="size-4 text-muted-foreground" /><span className="flex-1">{label}</span>
    {ok === undefined ? <Skeleton className="h-5 w-20" />
      : <Badge variant="outline" className={ok ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-transparent bg-red-500/15 text-red-700 dark:text-red-300"}>{ok ? okText : badText}</Badge>}
  </div>;
}

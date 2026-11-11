"use client";

import Link from "next/link";
import { ArrowRight, Clock, Database, GraduationCap, Server, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { healthApi, usersApi } from "@/lib/admin-api";
import { useAdminData } from "./use-admin-data";
import { ErrorAlert, formatDate, PageHeader, RoleBadges, StatusBadge, UserAvatar } from "./ui";

async function loadOverview(token: string) {
  // limit=1 is enough to read each total from the pagination meta.
  const total = (params: Parameters<typeof usersApi.list>[1]) => usersApi.list(token, { ...params, limit: 1 }).then(r => r.meta.total);
  const [students, faculty, admins, pending, recent, health] = await Promise.all([
    total({ role: "STUDENT" }),
    total({ role: "FACULTY" }),
    total({ role: "ADMIN" }),
    total({ status: "PENDING" }),
    usersApi.list(token, { limit: 6 }),
    healthApi.check().catch(() => null),
  ]);
  return { students, faculty, admins, pending, recent: recent.data, health };
}

export default function AdminOverview() {
  const { user } = useAuth();
  const { data, error, reload } = useAdminData(loadOverview, "overview");

  const stats = [
    { label: "Students", value: data?.students, icon: GraduationCap, href: "/admin/users?role=STUDENT" },
    { label: "Faculty", value: data?.faculty, icon: Users, href: "/admin/users?role=FACULTY" },
    { label: "Admins", value: data?.admins, icon: ShieldCheck, href: "/admin/users?role=ADMIN" },
    { label: "Pending setup", value: data?.pending, icon: Clock, href: "/admin/users?status=PENDING" },
  ];

  return <>
    <PageHeader
      title={`Welcome back, ${user?.full_name.split(" ")[0] ?? "Admin"}`}
      description="Here is what is happening across EduPulse Academy."
      actions={<Button asChild><Link href="/admin/users?new=1"><UserPlus /> Add user</Link></Button>}
    />
    {error && <ErrorAlert message={error} onRetry={reload} />}

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, href }) => <Link key={label} href={href} className="group rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <Card className="h-full gap-3 py-5 transition-colors group-hover:border-primary/40">
          <CardHeader className="px-5">
            <CardDescription className="truncate">{label}</CardDescription>
            <CardAction><Icon className="size-4 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent className="px-5">
            {value === undefined ? <Skeleton className="h-8 w-14" /> : <p className="text-3xl font-semibold tabular-nums">{value}</p>}
          </CardContent>
        </Card>
      </Link>)}
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>Newest accounts</CardTitle>
          <CardDescription>The latest people to join or be added.</CardDescription>
          <CardAction><Button variant="ghost" size="sm" asChild><Link href="/admin/users">View all <ArrowRight /></Link></Button></CardAction>
        </CardHeader>
        <CardContent>
          {!data ? <div className="grid gap-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
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

function StatusRow({ icon: Icon, label, ok, okText, badText }: { icon: React.ComponentType<{ className?: string }>; label: string; ok?: boolean; okText: string; badText: string }) {
  return <div className="flex items-center gap-3 text-sm">
    <Icon className="size-4 text-muted-foreground" /><span className="flex-1">{label}</span>
    {ok === undefined ? <Skeleton className="h-5 w-20" />
      : <Badge variant="outline" className={ok ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-transparent bg-red-500/15 text-red-700 dark:text-red-300"}>{ok ? okText : badText}</Badge>}
  </div>;
}

"use client";

import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoleCode } from "@/lib/api";
import type { Paginated, UserStatus } from "@/lib/admin-api";

export const titleCase = (value: string) => value[0] + value.slice(1).toLowerCase();

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" });
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join("");

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}

const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  PENDING: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  SUSPENDED: "border-transparent bg-orange-500/15 text-orange-700 dark:text-orange-300",
  DISABLED: "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
};

export function StatusBadge({ status, deleted }: { status: UserStatus; deleted?: boolean }) {
  if (deleted) return <Badge variant="outline" className="text-muted-foreground">Deleted</Badge>;
  return <Badge variant="outline" className={STATUS_STYLE[status]}>{titleCase(status)}</Badge>;
}

const ROLE_STYLE: Record<RoleCode, string> = {
  ADMIN: "border-violet-500/30 text-violet-700 dark:text-violet-300",
  FACULTY: "border-sky-500/30 text-sky-700 dark:text-sky-300",
  STUDENT: "border-primary/30 text-primary",
};

export function RoleBadges({ roles, className }: { roles: RoleCode[]; className?: string }) {
  return <div className={cn("flex flex-wrap gap-1", className)}>
    {roles.map(role => <Badge key={role} variant="outline" className={ROLE_STYLE[role]}>{titleCase(role)}</Badge>)}
  </div>;
}

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return <Avatar className={cn("size-9", className)}>
    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
  </Avatar>;
}

export function ErrorAlert({ message, onRetry, title = "Something went wrong" }: { message: string; onRetry?: () => void; title?: string }) {
  return <Alert variant="destructive">
    <AlertCircle />
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>
      <p>{message}</p>
      {onRetry && <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>Try again</Button>}
    </AlertDescription>
  </Alert>;
}

export function Pager({ meta, onPage }: { meta: Paginated<unknown>["meta"]; onPage: (page: number) => void }) {
  if (meta.total === 0) return null;
  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);
  return <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
    <span>Showing <strong className="text-foreground">{first}–{last}</strong> of <strong className="text-foreground">{meta.total}</strong></span>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft /> Previous</Button>
      <span className="px-1 tabular-nums">{meta.page} / {Math.max(meta.totalPages, 1)}</span>
      <Button size="sm" variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next <ChevronRight /></Button>
    </div>
  </div>;
}

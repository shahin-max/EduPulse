"use client";

import { AlertCircle, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RoleCode } from "@/lib/api";
import type { Paginated, UserStatus } from "@/lib/admin-api";

/** "PARTIALLY_PAID" -> "Partially paid". */
export const titleCase = (value: string) => value[0] + value.slice(1).toLowerCase().replace(/_/g, " ");

/** The API's error message, or `fallback` for anything that is not an Error. */
export const errorText = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

/** Money and marks arrive as DECIMAL strings ("1500.00"); shown as ₹1,500 or ₹1,500.50. */
export function formatMoney(value: string | number | null | undefined, currency = "INR") {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount);
}

/** A labelled form control: <Field id="title" label="Title"><Input id="title" /></Field>. */
export function Field({ id, label, hint, children, className }: { id: string; label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-2", className)}>
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

/** "(optional)" suffix for a Field label. */
export const Optional = () => <span className="font-normal text-muted-foreground">(optional)</span>;

export type Tone = "green" | "amber" | "orange" | "red" | "blue" | "violet" | "gray";

const TONE_STYLE: Record<Tone, string> = {
  green: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  orange: "border-transparent bg-orange-500/15 text-orange-700 dark:text-orange-300",
  red: "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
  blue: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
  violet: "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300",
  gray: "border-transparent bg-muted text-muted-foreground",
};

/**
 * A status badge for any enum value, coloured by a per-screen map:
 * <Pill value={batch.status} tones={{ ACTIVE: "green", PLANNED: "blue", CANCELLED: "red" }} />.
 * Unmapped values are gray; the label is the value in title case unless `label` is given.
 */
export function Pill({ value, tones, label, className }: { value: string; tones: Partial<Record<string, Tone>>; label?: string; className?: string }) {
  return <Badge variant="outline" className={cn(TONE_STYLE[tones[value] ?? "gray"], className)}>{label ?? titleCase(value)}</Badge>;
}

/** Centered message for an empty list, with an optional call to action. */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
    <span className="flex size-12 items-center justify-center rounded-full bg-muted"><Icon className="size-5 text-muted-foreground" /></span>
    <div>
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>;
}

/** Skeleton rows shown while a list loads for the first time. */
export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return <div className="grid gap-4 p-4">
    {Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-3">
      <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
      <Skeleton className="hidden h-8 w-24 sm:block" />
    </div>)}
  </div>;
}

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

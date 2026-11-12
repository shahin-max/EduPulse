"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RoleCode } from "@/lib/api";
import { usersApi, type AdminUser, type UserStatus } from "@/lib/admin-api";
import type { Batch, BatchStatus, EnrollmentStatus } from "@/lib/admin-batches-api";
import { useAdminData } from "../use-admin-data";
import { ErrorAlert, StatusBadge, UserAvatar, type Tone } from "../ui";

export const BATCH_TONES: Record<BatchStatus, Tone> = { PLANNED: "blue", ACTIVE: "green", COMPLETED: "violet", CANCELLED: "red" };
export const ENROLLMENT_TONES: Record<EnrollmentStatus, Tone> = { ACTIVE: "green", PENDING: "amber", PAUSED: "orange", COMPLETED: "violet", CANCELLED: "red" };

export const BATCH_STATUS_HELP: Record<BatchStatus, string> = {
  PLANNED: "Upcoming. Shown on the website and open for enrollment.",
  ACTIVE: "Running. Shown on the website and open for enrollment.",
  COMPLETED: "Finished. No new enrollments; hidden from the website.",
  CANCELLED: "Called off. No new enrollments; hidden from the website.",
};

export const ENROLLMENT_STATUS_HELP: Record<EnrollmentStatus, string> = {
  ACTIVE: "Holds a seat and can access batch content.",
  PENDING: "Holds a seat but no content access yet (e.g. awaiting the first fee payment).",
  PAUSED: "Seat released, no content access. Resuming needs a free seat.",
  COMPLETED: "Finished the batch. Seat released.",
  CANCELLED: "Left the batch. Seat released.",
};

/** Batch dates are DATE columns sent as UTC midnight; format in UTC so the day never shifts. */
export function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function dateRange(batch: Pick<Batch, "start_date" | "end_date">) {
  if (!batch.start_date && !batch.end_date) return "Dates not set";
  return `${formatDay(batch.start_date)} – ${batch.end_date ? formatDay(batch.end_date) : "open"}`;
}

/** "12 / 40" with a thin fill bar; unlimited capacity shows "12 enrolled". */
export function Seats({ batch, className }: { batch: Pick<Batch, "enrolled" | "capacity" | "seatsAvailable">; className?: string }) {
  if (batch.capacity === null) return <div className={cn("text-sm", className)}>
    <span className="font-medium tabular-nums">{batch.enrolled}</span> <span className="text-muted-foreground">enrolled · no limit</span>
  </div>;
  const ratio = Math.min(batch.enrolled / batch.capacity, 1);
  const full = batch.seatsAvailable === 0;
  return <div className={cn("grid min-w-24 gap-1", className)}>
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="font-medium tabular-nums">{batch.enrolled} / {batch.capacity}</span>
      <span className={cn("text-xs", full ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>{full ? "Full" : `${batch.seatsAvailable} left`}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
      <div className={cn("h-full rounded-full", full ? "bg-red-500" : ratio >= 0.85 ? "bg-amber-500" : "bg-primary")} style={{ width: `${ratio * 100}%` }} />
    </div>
  </div>;
}

/** Debounces a text value. */
export function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * A search box with a short result list of users (no combobox component in this project).
 * `isDisabled` returns a reason to block a result, or undefined to allow it.
 */
export function UserPicker({ id, role, status, value, onChange, isDisabled, placeholder }: {
  id: string;
  role: RoleCode;
  status?: UserStatus;
  value: AdminUser | null;
  onChange: (user: AdminUser | null) => void;
  isDisabled?: (user: AdminUser) => string | undefined;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const search = useDebounced(text.trim());
  const params = { role, status, search, limit: 8 };
  const { data, error, loading, reload } = useAdminData(token => usersApi.list(token, params), JSON.stringify(params));

  if (value) return <div className="flex items-center gap-3 rounded-md border p-2">
    <UserAvatar name={value.full_name} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{value.full_name}</p>
      <p className="truncate text-xs text-muted-foreground">{value.email ?? value.mobile ?? `User #${value.id}`}</p>
    </div>
    <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><X /> Change</Button>
  </div>;

  return <div className="grid gap-2">
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input id={id} type="search" value={text} onChange={e => setText(e.target.value)} placeholder={placeholder ?? "Search by name, email or mobile"} className="pl-9" autoComplete="off" />
    </div>
    <div className="max-h-60 overflow-y-auto rounded-md border" aria-live="polite">
      {error && <div className="p-2"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <div className="grid gap-2 p-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>}
      {data && data.data.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{search ? `No matches for “${search}”.` : "No one found."}</p>}
      {data && data.data.length > 0 && <ul className={cn("divide-y", loading && "opacity-60")}>
        {data.data.map(u => {
          const reason = isDisabled?.(u);
          return <li key={u.id}>
            <button type="button" disabled={!!reason} onClick={() => onChange(u)}
              className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent">
              <UserAvatar name={u.full_name} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.full_name}</span>
                <span className="block truncate text-xs text-muted-foreground">{reason ?? u.email ?? u.mobile}</span>
              </span>
              {u.status !== "ACTIVE" && <StatusBadge status={u.status} />}
            </button>
          </li>;
        })}
      </ul>}
      {data && data.meta.total > data.data.length && <p className="border-t p-2 text-center text-xs text-muted-foreground">Showing {data.data.length} of {data.meta.total}. Type to narrow the list.</p>}
    </div>
  </div>;
}

"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/** The current time, rounded to the minute and refreshed every minute (keeps render pure). */
export function useNow(stepMs = 60_000) {
  return useSyncExternalStore(
    onChange => { const timer = setInterval(onChange, stepMs); return () => clearInterval(timer); },
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => 0,
  );
}

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

/** "in 2 days", "3 hours ago", relative to `now`. */
export function relative(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const [value, unit] = abs < 3_600_000 ? [Math.max(1, Math.round(abs / 60_000)), "minute"]
    : abs < 86_400_000 ? [Math.round(abs / 3_600_000), "hour"] : [Math.round(abs / 86_400_000), "day"];
  const text = `${value} ${unit}${value === 1 ? "" : "s"}`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** An online class can be joined from 15 minutes before it starts until it ends. */
export const isJoinable = (c: { starts_at: string; ends_at: string; status: string; meeting_url: string | null }, now: number) =>
  !!c.meeting_url && c.status !== "CANCELLED" && new Date(c.starts_at).getTime() - 15 * 60_000 <= now && new Date(c.ends_at).getTime() >= now;

/** A thin progress bar; `value` is 0-100. */
export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "red" | "green" }) {
  return <span className={cn("block h-2 overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
    <span className={cn("block h-full rounded-full transition-[width]", tone === "red" ? "bg-red-500" : tone === "green" ? "bg-emerald-500" : "bg-primary")}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </span>;
}

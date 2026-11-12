"use client";

import { PlayCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/admin/ui";
import type { AttendanceStatus, ClassSession, ClassStatus } from "@/lib/staff-classes-api";

export const CLASS_TONES: Record<ClassStatus, Tone> = { SCHEDULED: "blue", COMPLETED: "green", CANCELLED: "red" };

export const CLASS_STATUS_HELP: Record<ClassStatus, string> = {
  SCHEDULED: "Planned. Students see it in their timetable.",
  COMPLETED: "Taken. Add the recording link so students can rewatch it.",
  CANCELLED: "Called off. Attendance cannot be marked.",
};

/** Look of each attendance mark: short letter for the tap buttons, label and colours. */
export const ATTENDANCE_META: Record<AttendanceStatus, { short: string; label: string; active: string; text: string }> = {
  PRESENT: { short: "P", label: "Present", active: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600/90", text: "text-emerald-700 dark:text-emerald-300" },
  ABSENT: { short: "A", label: "Absent", active: "bg-red-600 text-white border-red-600 hover:bg-red-600/90", text: "text-red-700 dark:text-red-300" },
  LATE: { short: "L", label: "Late", active: "bg-amber-500 text-white border-amber-500 hover:bg-amber-500/90", text: "text-amber-700 dark:text-amber-300" },
  EXCUSED: { short: "E", label: "Excused", active: "bg-sky-600 text-white border-sky-600 hover:bg-sky-600/90", text: "text-sky-700 dark:text-sky-300" },
};

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today", "Tomorrow", "Yesterday" or "Thu, 12 Nov" (with the year when it is not this year). */
export function dayLabel(value: string | Date) {
  const d = new Date(value);
  const now = new Date();
  const offset = (days: number) => { const x = new Date(now); x.setDate(x.getDate() + days); return x; };
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, offset(1))) return "Tomorrow";
  if (sameDay(d, offset(-1))) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

export const timeOf = (value: string | Date) => new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** "9:30 am – 11:00 am" (the end date is added when the class runs past midnight). */
export function timeRange(session: Pick<ClassSession, "starts_at" | "ends_at">) {
  const end = new Date(session.ends_at);
  return `${timeOf(session.starts_at)} – ${sameDay(new Date(session.starts_at), end) ? "" : `${dayLabel(end)} `}${timeOf(end)}`;
}

export function duration(session: Pick<ClassSession, "starts_at" | "ends_at">) {
  const minutes = Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}

export const hasStarted = (session: Pick<ClassSession, "starts_at">) => new Date(session.starts_at).getTime() <= Date.now();
export const isLive = (session: Pick<ClassSession, "starts_at" | "ends_at" | "status">) =>
  session.status === "SCHEDULED" && hasStarted(session) && new Date(session.ends_at).getTime() > Date.now();

/** The teacher's name, "You" for the signed-in person, or null when nobody is assigned. */
export function useTeacherName() {
  const me = useAuth().user?.id;
  return (session: Pick<ClassSession, "faculty_profiles">) =>
    session.faculty_profiles ? (session.faculty_profiles.user_id === me ? "You" : session.faculty_profiles.users.full_name) : null;
}

/** Join (meeting) and Recording buttons; nothing when neither link applies. */
export function ClassLinks({ session, size = "sm", className, compact }: { session: ClassSession; size?: "sm" | "default"; className?: string; compact?: boolean }) {
  const join = session.meeting_url && session.status !== "CANCELLED";
  if (!join && !session.recording_url) return null;
  return <div className={cn("flex flex-wrap gap-2", className)}>
    {join && <Button asChild size={size} variant={isLive(session) ? "default" : "outline"}>
      <a href={session.meeting_url!} target="_blank" rel="noopener noreferrer" aria-label={`Join ${session.title}`}><Video />{compact ? "Join" : isLive(session) ? "Join now" : "Join link"}</a>
    </Button>}
    {session.recording_url && <Button asChild size={size} variant="outline">
      <a href={session.recording_url} target="_blank" rel="noopener noreferrer" aria-label={`Recording of ${session.title}`}><PlayCircle />Recording</a>
    </Button>}
  </div>;
}

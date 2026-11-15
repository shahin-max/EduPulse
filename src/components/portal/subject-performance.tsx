import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** One subject's results (GET /student/performance, and `subjects` in the staff student report). */
export type SubjectPerformance = {
  subject: { id: number; name: string };
  tests: { score: number; max: number; percentage: number | null; questions: number; correct: number; wrong: number; unanswered: number; tests: number } | null;
  assignments: { marks: number; max: number; percentage: number | null; count: number } | null;
};

/** Strong / steady / needs work, so a long list can be scanned at a glance. */
function band(p: number | null) {
  if (p === null) return { bar: "bg-muted-foreground/30", text: "text-muted-foreground" };
  if (p >= 75) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" };
  if (p >= 50) return { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-700 dark:text-red-400" };
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

function Bar({ label, percentage, detail }: { label: string; percentage: number | null; detail: string }) {
  const b = band(percentage);
  const width = percentage === null ? 0 : Math.max(0, Math.min(100, percentage));
  return <div className="grid gap-1">
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", b.text)}>{percentage === null ? "—" : `${percentage}%`}</span>
    </div>
    <span className="block h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${label}: ${percentage === null ? "no marks yet" : `${percentage}%`}, ${detail}`}>
      <span className={cn("block h-full rounded-full", b.bar)} style={{ width: `${width}%` }} />
    </span>
    <span className="text-[11px] text-muted-foreground">{detail}</span>
  </div>;
}

/**
 * Results per subject: tests (best attempt per test, counted question by question) and marked
 * assignments, each as a bar coloured by band (75%+ green, 50%+ amber, below red).
 */
export function SubjectPerformanceCard({ subjects, description, className }: {
  subjects: SubjectPerformance[];
  description?: string;
  className?: string;
}) {
  return <Card className={cn("min-w-0", className)}>
    <CardHeader>
      <CardTitle>By subject</CardTitle>
      <CardDescription>{description ?? "Tests count each question towards its subject; only the best attempt at each test counts."}</CardDescription>
    </CardHeader>
    <CardContent>
      {subjects.length === 0
        ? <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><BookOpen className="size-4" /> No marked tests or assignments yet.</p>
        : <ul className="grid gap-4 sm:grid-cols-2">
          {subjects.map(s => <li key={s.subject.id} className="grid gap-3 rounded-lg border p-4">
            <p className="truncate font-medium">{s.subject.name}</p>
            {s.tests && <Bar label={`Tests (${s.tests.tests})`} percentage={s.tests.percentage}
              detail={`${fmt(s.tests.score)} / ${fmt(s.tests.max)} marks · ${s.tests.correct} right, ${s.tests.wrong} wrong, ${s.tests.unanswered} skipped`} />}
            {s.assignments && <Bar label={`Assignments (${s.assignments.count})`} percentage={s.assignments.percentage}
              detail={`${fmt(s.assignments.marks)} / ${fmt(s.assignments.max)} marks`} />}
          </li>)}
        </ul>}
    </CardContent>
  </Card>;
}

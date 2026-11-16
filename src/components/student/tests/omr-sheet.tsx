"use client";

import { useState } from "react";
import { FileText, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttemptQuestion } from "@/lib/student-api";
import { MathText } from "@/components/portal/math-text";
import { AssetImage } from "@/components/portal/asset-image";

const n = (value: string | number) => String(Number(value));

/**
 * OMR practice: a printed-style question paper next to a bubble answer sheet, like the real AISSEE /
 * entrance papers. Bubbles save through the test screen's normal save queue (`onSelect`); tapping the
 * filled bubble clears it. On phones the paper and the sheet are two tabs.
 */
export function OmrLayout({ questions, selected, disabled, onSelect }: {
  questions: AttemptQuestion[];
  /** Selected option id per question id (null = blank). */
  selected: Record<number, number | null>;
  disabled: boolean;
  onSelect: (question: AttemptQuestion, optionId: number | null) => void;
}) {
  const [view, setView] = useState<"paper" | "sheet">("paper");
  const answered = questions.filter(q => selected[q.question_id] !== null).length;

  function goTo(index: number) {
    setView("paper");
    // After the paper tab is shown (phones), bring the question into view.
    requestAnimationFrame(() => document.getElementById(`omr-q-${index + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <>
    <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 lg:hidden" role="tablist" aria-label="Question paper or answer sheet">
      {([["paper", "Question paper", FileText], ["sheet", `Answer sheet (${answered}/${questions.length})`, ListChecks]] as const).map(([value, label, Icon]) =>
        <Button key={value} role="tab" aria-selected={view === value} size="sm" variant={view === value ? "secondary" : "ghost"}
          className={cn("flex-1", view === value && "bg-background shadow-xs")} onClick={() => setView(value)}>
          <Icon /> {label}
        </Button>)}
    </div>

    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className={cn("min-w-0", view !== "paper" && "hidden lg:flex")}>
        <CardHeader>
          <CardTitle className="text-base">Question paper</CardTitle>
          <CardDescription>Read the questions here and mark your answers on the OMR sheet.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid divide-y">
            {questions.map((q, i) => <li key={q.question_id} id={`omr-q-${i + 1}`} className="scroll-mt-40 py-4 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold tabular-nums">Q{i + 1}.</p>
                <span className="text-xs text-muted-foreground">+{n(q.marks)}{Number(q.negative_marks) > 0 ? ` / −${n(q.negative_marks)}` : ""}</span>
              </div>
              <p className="mt-1 leading-relaxed"><MathText text={q.question_text} /></p>
              {q.image_asset_id && <AssetImage assetId={q.image_asset_id} alt={`Figure for question ${i + 1}`} size="lg" className="mt-2" />}
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {q.options.map(o => <li key={o.id} className="flex gap-2 text-sm">
                  <span className="font-semibold">{o.option_label}.</span>
                  <span className="grid min-w-0 gap-1">
                    {o.option_text && <MathText text={o.option_text} />}
                    {o.image_asset_id && <AssetImage assetId={o.image_asset_id} alt={`Question ${i + 1}, option ${o.option_label}`} size="md" />}
                  </span>
                </li>)}
              </ul>
            </li>)}
          </ol>
        </CardContent>
      </Card>

      <Card className={cn("h-fit gap-0 overflow-hidden py-0 lg:sticky lg:top-36", view !== "sheet" && "hidden lg:flex")}>
        <CardHeader className="border-b bg-rose-50 py-3 dark:bg-rose-950/20 [.border-b]:pb-3">
          <CardTitle className="text-base tracking-wide uppercase">OMR answer sheet</CardTitle>
          <CardDescription>{answered} of {questions.length} answered · tap a filled bubble to clear it</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[calc(100svh-14rem)] overflow-y-auto bg-rose-50/40 p-0 dark:bg-rose-950/10">
          <ol>
            {questions.map((q, i) => {
              const chosen = selected[q.question_id];
              return <li key={q.question_id} className="flex items-center gap-3 border-b border-dashed border-rose-200 px-4 py-2 last:border-b-0 dark:border-rose-900/50">
                <button type="button" onClick={() => goTo(i)} aria-label={`Show question ${i + 1}`}
                  className="w-8 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-rose-800 hover:underline dark:text-rose-200">{i + 1}</button>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Question ${i + 1} answers`}>
                  {q.options.map(o => {
                    const filled = chosen === o.id;
                    return <button key={o.id} type="button" disabled={disabled} aria-pressed={filled}
                      aria-label={`Question ${i + 1}, option ${o.option_label}`}
                      onClick={() => onSelect(q, filled ? null : o.id)}
                      className={cn("flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-60",
                        filled
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                          : "border-rose-400/80 text-rose-700 hover:bg-rose-100 dark:border-rose-400/60 dark:text-rose-200 dark:hover:bg-rose-900/40")}>
                      {o.option_label}
                    </button>;
                  })}
                </div>
              </li>;
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  </>;
}

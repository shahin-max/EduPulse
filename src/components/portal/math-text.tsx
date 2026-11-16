"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Text with maths: `$...$` is inline maths and `$$...$$` a centred block, written in LaTeX
 * (e.g. `$\frac{3}{4}$ of $x^2$`). `\$` stays a dollar sign, and a lone `$` with no closing one is
 * shown as typed. Line breaks are kept. Only the maths goes through KaTeX's HTML (it escapes its
 * input and runs with `trust: false`); everything else is plain React text.
 */
type Segment = { kind: "text" | "inline" | "block"; value: string };

export function parseMath(source: string): Segment[] {
  const segments: Segment[] = [];
  let text = "";
  const flush = () => { if (text) segments.push({ kind: "text", value: text }); text = ""; };
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\" && source[i + 1] === "$") { text += "$"; i += 2; continue; }
    if (ch === "$") {
      const block = source[i + 1] === "$";
      const delimiter = block ? "$$" : "$";
      // Find the closing delimiter, skipping escaped characters inside the maths.
      let j = i + delimiter.length;
      let end = -1;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (source.startsWith(delimiter, j)) { end = j; break; }
        j++;
      }
      const body = end === -1 ? "" : source.slice(i + delimiter.length, end);
      if (end !== -1 && body.trim()) {
        flush();
        segments.push({ kind: block ? "block" : "inline", value: body });
        i = end + delimiter.length;
        continue;
      }
    }
    text += ch;
    i++;
  }
  flush();
  return segments;
}

const render = (tex: string, displayMode: boolean) =>
  katex.renderToString(tex, { displayMode, throwOnError: false, output: "html", trust: false, strict: "ignore" });

export function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => parseMath(text).map(s => s.kind === "text" ? s : { ...s, html: render(s.value, s.kind === "block") }), [text]);
  return <span className={cn("break-words whitespace-pre-wrap", className)}>
    {segments.map((s, i) => s.kind === "text"
      ? <span key={i}>{s.value}</span>
      : s.kind === "block"
        // Wide formulas scroll sideways inside their own box instead of widening the page.
        ? <span key={i} className="my-2 block overflow-x-auto overflow-y-hidden py-1 text-center" dangerouslySetInnerHTML={{ __html: "html" in s ? s.html : "" }} />
        : <span key={i} dangerouslySetInnerHTML={{ __html: "html" in s ? s.html : "" }} />)}
  </span>;
}

/** True when the text uses `$...$` maths, so editors can show a preview only when it helps. */
export const hasMath = (text: string) => parseMath(text).some(s => s.kind !== "text");

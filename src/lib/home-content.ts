import type { ApiContent } from "@/lib/api";

/**
 * Home page content the academy edits in Admin → Website content (published blocks only):
 *
 * - `home.results`: one achievement per line, "Student name | What they achieved | Exam & year".
 *   The title (optional) replaces the section heading.
 * - `home.highlights`: one headline number per line, "120+ | Sainik School selections".
 *
 * Nothing is shown until real entries are published, so the site never displays made-up results.
 */
export type Achievement = { name: string; achievement: string; tag: string | null };
export type Highlight = { value: string; label: string };
export type HomeResults = { heading: string | null; achievements: Achievement[]; highlights: Highlight[] };

const lines = (body: string | null | undefined) =>
  (body ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const parts = (line: string) => line.split("|").map(part => part.trim());

export function parseHomeResults(blocks: ApiContent[]): HomeResults {
  const results = blocks.find(b => b.content_key === "home.results");
  const highlights = blocks.find(b => b.content_key === "home.highlights");
  return {
    heading: results?.title?.trim() || null,
    achievements: lines(results?.body).map(parts)
      .filter(([name, achievement]) => name && achievement)
      .slice(0, 12)
      .map(([name, achievement, tag]) => ({ name, achievement, tag: tag || null })),
    highlights: lines(highlights?.body).map(parts)
      .filter(([value, label]) => value && label)
      .slice(0, 4)
      .map(([value, label]) => ({ value, label })),
  };
}

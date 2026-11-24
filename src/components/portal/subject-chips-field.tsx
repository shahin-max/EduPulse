"use client";

import { Input } from "@/components/ui/input";
import { Field, Optional } from "@/components/admin/ui";

/** Same limits as the API (faculty_profiles.display_subjects). */
export const MAX_CHIPS = 8;
export const MAX_CHIP_LENGTH = 40;

/** "Physics, Mechanics ,, physics" → ["Physics", "Mechanics"]: trimmed, blanks and repeats (any case) dropped. */
export function parseChips(text: string): string[] {
  const seen = new Set<string>();
  return text.split(",").map(s => s.trim()).filter(s => {
    const key = s.toLowerCase();
    if (!s || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The saved chips of a profile (null when the website uses the batch subjects). */
export const savedChips = (profile: { display_subjects?: string[] | null }) =>
  Array.isArray(profile.display_subjects) ? profile.display_subjects : [];

/** Why these chips cannot be saved, or "" when they can. */
export function chipsError(chips: string[]): string {
  if (chips.length > MAX_CHIPS) return `Add at most ${MAX_CHIPS} subject chips.`;
  const tooLong = chips.find(c => c.length > MAX_CHIP_LENGTH);
  return tooLong ? `"${tooLong}" is too long: a subject chip may have at most ${MAX_CHIP_LENGTH} characters.` : "";
}

/** True when the chips differ from the saved ones (order counts: it is the order on the website). */
export const chipsChanged = (chips: string[], saved: string[]) => JSON.stringify(chips) !== JSON.stringify(saved);

/** A comma-separated input with a live preview of the chips as the website card shows them. */
export function SubjectChipsField({ id, value, onChange, className }: { id: string; value: string; onChange: (value: string) => void; className?: string }) {
  const chips = parseChips(value);
  return <Field id={id} label={<>Subject chips on the website <Optional /></>} className={className}
    hint={`Separate with commas, up to ${MAX_CHIPS}. Leave empty to show the subjects taught in batches.`}>
    <Input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder="Physics, Mechanics, JEE Main" autoComplete="off" />
    {chips.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Preview">
      {chips.map(c => <li key={c} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.length > MAX_CHIP_LENGTH ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>{c}</li>)}
    </ul>}
  </Field>;
}

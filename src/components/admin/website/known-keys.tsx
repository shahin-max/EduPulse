/**
 * Content keys the public website reads today (see src/app/layout.tsx and promo-ticker.tsx).
 * Keep this in sync when the website starts reading a new key.
 */
import { defaultTickerItems } from "@/components/promo-ticker";

export type KnownKey = {
  key: string;
  name: string;
  where: string;
  title: string;
  body: string;
  /** Text for a new block, created unpublished from the one-click button. */
  starter: { title: string | null; body: string };
  /** Body is split into one item per line. */
  lines?: boolean;
};

export const KNOWN_KEYS: KnownKey[] = [
  {
    key: "site.ticker",
    name: "Admissions ticker",
    where: "The scrolling “Admissions open” bar at the top of every page.",
    title: "Optional. Replaces the badge text “AD · ADMISSIONS OPEN”. Leave empty to keep it.",
    body: "One announcement per line; empty lines are ignored. Avoid repeating the same line.",
    // The website's built-in text, so creating the block changes nothing until it is edited.
    starter: {
      title: null,
      body: defaultTickerItems.join("\n"),
    },
    lines: true,
  },
];

export const knownKey = (key: string) => KNOWN_KEYS.find(k => k.key === key);

/** How long the website caches content before it shows changes. */
export const REFRESH_NOTE = "Published changes appear on the website within about 5 minutes. Unpublished blocks are ignored and the website keeps its built-in text.";

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
  {
    key: "site.scholarship",
    name: "Scholarship Test",
    where: "The dialog that opens from the “Scholarship Test” button in the website header, above the registration form. Registrations arrive in Enquiries as “Scholarship test”.",
    title: "Optional. Replaces the heading “Scholarship Test”, e.g. “EduPulse Scholarship Test 2027”.",
    body: "Optional. The details: date, syllabus, who can apply and what students can win. Leave empty to keep the built-in text.",
    starter: {
      title: null,
      body: "Students can win a scholarship on their EduPulse course fees through our Scholarship Test. Register below and our team will call you with the test date, syllabus and how scholarships are awarded.",
    },
  },
  {
    key: "home.results",
    name: "Results & achievements",
    where: "The “Results & achievements” section on the home page. Hidden until this is published with at least one line.",
    title: "Optional. Replaces the heading “Our students, their milestones.”",
    body: "One achievement per line: Student name | What they achieved | Exam & year (the last part is optional). Up to 12 are shown. Only publish results you have the student's (or parent's) permission to share.",
    starter: {
      title: null,
      body: ["Student name | What they achieved | Exam & year", "Student name | What they achieved | Exam & year"].join("\n"),
    },
    lines: true,
  },
  {
    key: "home.highlights",
    name: "Results headline numbers",
    where: "Up to four big numbers shown above the achievements on the home page.",
    title: "Not used.",
    body: "One per line: Number | What it counts, e.g. “120+ | Sainik School selections”.",
    starter: {
      title: null,
      body: ["Number | What it counts", "Number | What it counts"].join("\n"),
    },
    lines: true,
  },
];

export const knownKey = (key: string) => KNOWN_KEYS.find(k => k.key === key);

/** How long the website caches content before it shows changes. */
export const REFRESH_NOTE = "Published changes appear on the website within about 5 minutes. Unpublished blocks are ignored and the website keeps its built-in text.";

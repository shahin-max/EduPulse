"use client";

import { createContext, useContext } from "react";

/**
 * Editable website content (website_content in the LMS), loaded once in the root layout and
 * shared with client components. Every field is optional: components keep their built-in text
 * when the API has nothing published for them.
 */
export type SiteContent = {
  /** `site.ticker`: one announcement per line of the body; the title (optional) is the badge. */
  ticker?: { badge: string | null; items: string[] };
};

const SiteContentContext = createContext<SiteContent>({});

export function SiteContentProvider({ value, children }: { value: SiteContent; children: React.ReactNode }) {
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export const useSiteContent = () => useContext(SiteContentContext);

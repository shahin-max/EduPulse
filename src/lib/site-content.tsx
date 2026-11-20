"use client";

import { createContext, useContext, useMemo } from "react";
import { programs as basePrograms, type Program } from "@/lib/site";
import { siteIcon } from "@/lib/site-icons";
import { DEFAULT_CONTACT_INFO, DEFAULT_PROGRAMS, type ContactInfo, type ProgramsSection } from "@/lib/site-sections";

/**
 * Editable website content (website_content in the LMS), loaded once in the root layout and
 * shared with client components. Every field is optional: components keep their built-in text
 * when the API has nothing published for them.
 */
export type SiteContent = {
  /** `site.ticker`: one announcement per line of the body; the title (optional) is the badge. */
  ticker?: { badge: string | null; items: string[] };
  /** `site.scholarship`: heading (title) and details (body) of the Scholarship Test dialog. */
  scholarship?: { title?: string; body?: string };
  /** `site.contact`: phones, email, address, social links and footer text. */
  contact?: ContactInfo;
  /** `site.programs`: the home "programs" section texts and per-program title, detail, icon or hiding. */
  programs?: ProgramsSection;
};

const SiteContentContext = createContext<SiteContent>({});

export function SiteContentProvider({ value, children }: { value: SiteContent; children: React.ReactNode }) {
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export const useSiteContent = () => useContext(SiteContentContext);

/** Contact details: the published `site.contact`, or the built-in ones. */
export const useContactInfo = (): ContactInfo => useSiteContent().contact ?? DEFAULT_CONTACT_INFO;

/** wa.me link for the academy's WhatsApp number. */
export function whatsappHref(info: ContactInfo, message: string) {
  return `https://wa.me/${info.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const useProgramsSection = (): ProgramsSection => useSiteContent().programs ?? DEFAULT_PROGRAMS;

/**
 * Programs as the website shows them: the built-in list with the academy's title, detail and icon
 * changes applied. `includeHidden` keeps programs hidden from the home page and menus (course
 * pages still exist for them).
 */
export function usePrograms({ includeHidden = false } = {}): Program[] {
  const { cards } = useProgramsSection();
  return useMemo(() => basePrograms
    .map(p => {
      const c = cards[p.slug];
      return { program: c ? { ...p, title: c.title ?? p.title, detail: c.detail ?? p.detail, icon: siteIcon(c.icon, p.icon) } : p, hidden: !!c?.hidden };
    })
    .filter(x => includeHidden || !x.hidden)
    .map(x => x.program), [cards, includeHidden]);
}

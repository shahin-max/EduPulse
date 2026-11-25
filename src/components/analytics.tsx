"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Google Analytics 4 measurement ID (public: it appears in every page's source). NEXT_PUBLIC_GA_ID overrides it.
 * Only the live site loads analytics (see `enabled`), so staging and local copies never report.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-DEKTDK10KW";

/** Portal and account pages: never measured (students' and staff's own pages). */
const PRIVATE = /^\/(admin|teach|student|dashboard|login|register|set-password|forgot-password|verify-email)(\/|$)/;

type Gtag = (...args: unknown[]) => void;
const gtag = (): Gtag | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { gtag?: Gtag }).gtag);

/** Switches measurement off on private pages, using Google's own opt-out flag (checked on every hit). */
const setDisabled = (path: string) => {
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = PRIVATE.test(path);
};

/**
 * Records a conversion or action in Google Analytics, e.g. trackEvent("generate_lead", { form: "enquiry" }).
 * Does nothing where analytics is off (staging, local, or before the script loads).
 */
export function trackEvent(name: string, params: Record<string, string | number | undefined> = {}) {
  gtag()?.("event", name, params);
}

/**
 * Loads Google Analytics on the public website. Page views (including in-app navigation) come from GA4's
 * enhanced measurement; this adds call and WhatsApp taps, which GA does not see on its own.
 */
export function Analytics({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const on = enabled && /^G-[A-Z0-9]+$/.test(GA_ID);

  useEffect(() => { if (on) setDisabled(pathname); }, [on, pathname]);

  useEffect(() => {
    if (!on) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href") ?? "";
      const where = window.location.pathname;
      if (href.startsWith("tel:")) trackEvent("contact_call", { page: where });
      else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) trackEvent("contact_whatsapp", { page: where });
      else if (href.startsWith("mailto:")) trackEvent("contact_email", { page: where });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [on]);

  if (!on) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
    <Script id="ga-init" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window['ga-disable-${GA_ID}'] = ${PRIVATE}.test(location.pathname);
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    `}</Script>
  </>;
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSiteContent } from "@/lib/site-content";

// Shown until an admin publishes `site.ticker` in the website content.
export const defaultTickerItems = [
  "SAINIK SCHOOL ADMISSION 2027",
  "AISSEE 2027 forms out – 3 November 2026",
  "Class VI & Class IX · Session 2027–28",
  "Apply online: 3 Nov – 2 Dec 2026",
  "Entrance exam: 31 January 2027",
  "Enrol now for AISSEE 2027 preparation",
  "Call 7015628794 | 9627232324",
];

// The track is rendered twice so the -50% translate loops seamlessly.
function Track({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return <span className="promo-track" aria-hidden={hidden || undefined}>
    {items.map(item => <span key={item} className="promo-item"><span className="promo-star" aria-hidden="true">★</span>{item}</span>)}
  </span>;
}

export default function PromoTicker() {
  const { ticker } = useSiteContent();
  const items = ticker?.items ?? defaultTickerItems;
  return <Link href="/pamphlet" className="promo-ticker" aria-label={`${items[0]} – open the pamphlet`}>
    <span className="promo-badge">{ticker?.badge ?? "AD · ADMISSIONS OPEN"}</span>
    <span className="promo-viewport"><span className="promo-marquee"><Track items={items} /><Track items={items} hidden /></span></span>
    <span className="promo-cta">View pamphlet <ArrowRight size={14} /></span>
  </Link>;
}

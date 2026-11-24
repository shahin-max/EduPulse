"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSiteContent } from "@/lib/site-content";
import { IMAGE_PAMPHLETS } from "@/lib/pamphlets";

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

/** The course pamphlets always follow the academy's own lines ("NAME – details"). */
const pamphletItems = IMAGE_PAMPHLETS.map(p => p.ticker);

/** "STUDY IN GERMANY – details": the name in the highlight colour, then the details. */
function Item({ text }: { text: string }) {
  const [name, ...rest] = text.split(" – ");
  return rest.length && pamphletItems.includes(text)
    ? <><strong className="promo-name">{name}</strong> {rest.join(" – ")}</>
    : <>{text}</>;
}

// The track is rendered twice so the -50% translate loops seamlessly.
function Track({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return <span className="promo-track" aria-hidden={hidden || undefined}>
    {items.map(item => <span key={item} className="promo-item"><span className="promo-star" aria-hidden="true">★</span><Item text={item} /></span>)}
  </span>;
}

export default function PromoTicker() {
  const { ticker } = useSiteContent();
  const own = ticker?.items ?? defaultTickerItems;
  const items = [...own, ...pamphletItems.filter(item => !own.includes(item))];
  return <Link href="/pamphlet" className="promo-ticker" aria-label={`${items[0]} – open the pamphlets`}>
    <span className="promo-badge">{ticker?.badge ?? "AD · ADMISSIONS OPEN"}</span>
    <span className="promo-viewport"><span className="promo-marquee"><Track items={items} /><Track items={items} hidden /></span></span>
    <span className="promo-cta">View pamphlets <ArrowRight size={14} /></span>
  </Link>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import AcademySite from "@/components/academy-site";
import { UpdateCard } from "@/components/home-sections";
import { publicData } from "@/lib/api";
import { parseUpdates, readJson, SECTION_KEYS } from "@/lib/site-sections";

export const metadata: Metadata = {
  title: "Latest updates",
  description: "News and announcements from EduPulse Academy, Aligarh: admissions, exam dates, new batches and results.",
  alternates: { canonical: "/updates" },
};

/** Every update the academy has published in Admin → Website → Latest updates. */
export default async function UpdatesPage() {
  const updates = parseUpdates(readJson(await publicData.content(SECTION_KEYS.updates), SECTION_KEYS.updates));
  return <AcademySite>
    <section className="home-section page-container updates-page" aria-labelledby="updates-page-title">
      {updates.kicker && <p className="section-kicker">{updates.kicker}</p>}
      <h1 id="updates-page-title">{updates.title}{updates.titleAccent && <> <span>{updates.titleAccent}</span></>}</h1>
      {updates.intro && <p className="section-intro">{updates.intro}</p>}
      {updates.items.length
        ? <ul className="updates-grid">{updates.items.map(item => <UpdateCard key={item.id} item={item} headingLevel={2} />)}</ul>
        : <p className="updates-empty"><Megaphone size={20} aria-hidden="true" /> No updates right now. Please check back soon.</p>}
      <p className="home-section-link"><Link className="text-link" href="/"><ArrowLeft size={17} /> Back to the home page</Link></p>
    </section>
  </AcademySite>;
}

import type { Metadata } from "next";
import AcademySite from "@/components/academy-site";
import { publicData } from "@/lib/api";
import { parseHomeResults } from "@/lib/home-content";
import { jsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { parseHomeSections } from "@/lib/site-sections";

export const metadata: Metadata = pageMetadata({
  description: "EduPulse Academy, Aligarh: coaching for school tuition (Classes 6-10), AISSEE Sainik School & RMS, JEE, NEET, AMU & JMI entrance, CUET, NDA/CDS and Spoken English. Concept-first teaching, regular tests and personal attention.",
  path: "/",
});

export default async function Home() {
  // Both are cached (refreshed when an admin saves, or every 5 minutes) and fall back to empty when the API is unreachable.
  const [content, teachers] = await Promise.all([publicData.content("home."), publicData.faculty()]);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(websiteJsonLd)} />
    <AcademySite home={{ results: parseHomeResults(content), teachers, sections: parseHomeSections(content) }} />
  </>;
}

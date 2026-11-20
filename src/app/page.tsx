import AcademySite from "@/components/academy-site";
import { publicData } from "@/lib/api";
import { parseHomeResults } from "@/lib/home-content";
import { organizationJsonLd } from "@/lib/seo";
import { parseHomeSections } from "@/lib/site-sections";

export default async function Home() {
  // Both are cached (refreshed when an admin saves, or every 5 minutes) and fall back to empty when the API is unreachable.
  const [content, teachers] = await Promise.all([publicData.content("home."), publicData.faculty()]);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
    <AcademySite home={{ results: parseHomeResults(content), teachers, sections: parseHomeSections(content) }} />
  </>;
}

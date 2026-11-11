import AcademySite from "@/components/academy-site";
import { organizationJsonLd } from "@/lib/seo";

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\u003c") }} />
    <AcademySite />
  </>;
}

import { contact, socials } from "@/lib/site";

/** Public address of the website, for canonical URLs, the sitemap and social previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** schema.org data for search engines (rendered as JSON-LD on the home page). */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "EduPulse Academy",
  slogan: "Learn Today, Lead Tomorrow",
  url: SITE_URL,
  logo: `${SITE_URL}/edupulse-logo.jpeg`,
  email: contact.email,
  telephone: contact.phones.map(p => p.tel),
  address: { "@type": "PostalAddress", streetAddress: contact.address, addressLocality: "Aligarh", addressRegion: "Uttar Pradesh", addressCountry: "IN" },
  sameAs: Object.values(socials),
};

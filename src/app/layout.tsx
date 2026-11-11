import type { Metadata, Viewport } from "next";
import { publicData } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { SITE_URL } from "@/lib/seo";
import { SiteContentProvider, type SiteContent } from "@/lib/site-content";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "EduPulse Academy | Learn Today, Lead Tomorrow", template: "%s | EduPulse Academy" },
  description: "Build your future with EduPulse Academy, Aligarh. Foundation classes (6-10), JEE, NEET, Sainik School, CUET, AMU & JMI entrance preparation, and Spoken English.",
  keywords: ["EduPulse Academy", "coaching in Aligarh", "foundation classes", "JEE coaching", "NEET coaching", "Sainik School entrance", "AMU entrance", "JMI entrance", "CUET", "Spoken English"],
  applicationName: "EduPulse Academy",
  openGraph: {
    type: "website",
    siteName: "EduPulse Academy",
    title: "EduPulse Academy | Learn Today, Lead Tomorrow",
    description: "Foundation classes, entrance preparation, and English learning programs in Aligarh.",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfdfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1711" },
  ],
};

const themeScript = `(function(){var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)').matches;try{var t=localStorage.getItem('edupulse-theme');d.classList.toggle('dark',t==='dark'||(!t&&m));}catch(e){d.classList.toggle('dark',m);}})();`;

/** Editable content shared by every page, from the LMS (cached, refreshed every 5 minutes). */
async function loadSiteContent(): Promise<SiteContent> {
  const entries = await publicData.content("site.");
  const ticker = entries.find(e => e.content_key === "site.ticker");
  const items = ticker?.body?.split(/\r?\n/).map(line => line.trim()).filter(Boolean) ?? [];
  return { ticker: items.length ? { badge: ticker?.title?.trim() || null, items } : undefined };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = await loadSiteContent();
  // A plain inline <script> in <head> (rendered only on the server) sets the theme before first paint,
  // with no flash and without React's "script tag inside a component" warning that next/script triggers here.
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body className="min-h-screen bg-background font-sans text-foreground antialiased">
      <SiteContentProvider value={content}><AuthProvider>{children}</AuthProvider></SiteContentProvider>
    </body>
  </html>;
}

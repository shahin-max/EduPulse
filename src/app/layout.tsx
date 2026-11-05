import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
    <body className="min-h-screen bg-background font-sans text-foreground antialiased">
      <Script id="theme-init" strategy="beforeInteractive">{themeScript}</Script>
      {children}
    </body>
  </html>;
}

import type { Metadata } from "next";
import Image from "next/image";
import DownloadControls from "./download-controls";
import PamphletCarousel from "./pamphlet-carousel";
import logo from "../../../public/edupulse-logo.jpeg";
import mark from "../../../public/logo-mark.png";
import { publicData } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";
import { PAGE_KEYS, parsePamphlet, type PamphletContent } from "@/lib/site-pages";
import { parseContactInfo, readJson, SECTION_KEYS, type ContactInfo } from "@/lib/site-sections";
import "./pamphlet.css";

/** Pamphlet text from Admin → Website → Pamphlet (page.pamphlet); phone numbers from Contact details. */
async function load(): Promise<{ p: PamphletContent; contact: ContactInfo }> {
  const [pamphlet, site] = await Promise.all([publicData.content(PAGE_KEYS.pamphlet), publicData.content("site.")]);
  return { p: parsePamphlet(readJson(pamphlet, PAGE_KEYS.pamphlet)), contact: parseContactInfo(readJson(site, SECTION_KEYS.contactInfo)) };
}

export async function generateMetadata(): Promise<Metadata> {
  const { p } = await load();
  return pageMetadata({ title: p.pageTitle, description: p.pageDescription || undefined, path: "/pamphlet" });
}

/** "+917015628794" → "7015628794", as the printed pamphlet shows numbers. */
const local = (tel: string) => tel.replace(/^\+91/, "");

/** Text with line breaks as React lines. */
function Lines({ text }: { text: string }) {
  const lines = text.split("\n");
  return lines.map((line, i) => <span key={i} style={{ display: "contents" }}>{line}{i < lines.length - 1 && <br />}</span>);
}

export default async function PamphletPage() {
  const { p, contact } = await load();
  return (
    <div className="pamphlet-page">
    <main>
      <PamphletCarousel sainik={<>
      <article id="edupulse-brochure" className="brochure">
        <header className="brand-header">
          <div className="brand-logo"><Image src={logo} alt="Edupulse Academy" loading="eager" unoptimized /></div>
          <div className="brand-message">{p.headerMessage && <p>{p.headerMessage}</p>}{p.headerSub && <span>{p.headerSub.split(" · ").map((part, i) => <span key={i} style={{ display: "contents" }}>{i > 0 && <> <i /> </>}{part}</span>)}</span>}</div>
          <details className="whatsapp-contact" data-export-ignore>
            <summary className="header-contact">Talk to us <span aria-hidden="true">&#8599;</span></summary>
            <div className="whatsapp-menu"><p>Chat with us on WhatsApp</p>{contact.phones.map(phone => <a key={phone.tel} href={`https://wa.me/${phone.tel.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{local(phone.tel)} <span aria-hidden="true">&#8599;</span></a>)}</div>
          </details>
        </header>

        <div className="brochure-panels">
          <section className="admissions-panel" aria-labelledby="admissions-title">
            <div className="panel-topline">{p.badge && <span className="admissions-badge"><i /> {p.badge}</span>}{p.panelOne && <span className="panel-number">{p.panelOne}</span>}</div>
            <h1 id="admissions-title">{p.titleTop}{p.titleSub && <span><Lines text={p.titleSub} /></span>}</h1>
            {(p.classes.length > 0 || p.session) && <div className="class-row">{p.classes.map(c => <span key={c}>{c}</span>)}{p.session && <p>Academic Session <strong>{p.session}</strong></p>}</div>}
            {(p.noticeLabel || p.noticeValue) && <div className="forms-notice"><span>{p.noticeLabel}</span><strong>{p.noticeValue} <span aria-hidden="true">↗</span></strong></div>}
            {p.dates.length > 0 && <div className="date-list">
              {p.dates.map((date, i) => <div key={i}><span className="date-symbol" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><div><p>{date.label}</p><strong>{date.value}</strong></div></div>)}
            </div>}
            {p.footnote && <p className="admission-footnote">{p.footnote}</p>}
          </section>

          <section className="preparation-panel" aria-labelledby="preparation-title">
            <div className="panel-topline">{p.sectionLabel && <span className="section-label">{p.sectionLabel}</span>}{p.panelTwo && <span className="panel-number">{p.panelTwo}</span>}</div>
            <div className="preparation-heading"><div>{p.enrolLabel && <p className="enrol-label">{p.enrolLabel}</p>}<h2 id="preparation-title">{p.examTitle}{p.examSub && <span>{p.examSub}</span>}</h2></div><Image className="preparation-mark" src={mark} alt="" width={76} height={76} unoptimized /></div>
            {p.guidance && <p className="guidance">{p.guidance}</p>}
            {p.subjects.length > 0 && <ul className="subjects">{p.subjects.map(subject => <li key={subject}><span aria-hidden="true">✓</span>{subject}</li>)}</ul>}
            <div className="contact-card">{p.contactEyebrow && <p className="contact-eyebrow">{p.contactEyebrow}</p>}{p.contactTitle && <h3>{p.contactTitle}</h3>}<div className="phone-numbers">{contact.phones.map(phone => <a key={phone.tel} href={`tel:${phone.tel}`}>{local(phone.tel)} <span aria-hidden="true">↗</span></a>)}</div>{p.location && <p className="location"><span aria-hidden="true">⌖</span> {p.location}</p>}</div>
          </section>
        </div>

        <footer className="brochure-footer"><span>{p.footerLead} {p.footerAccent && <strong>{p.footerAccent}</strong>}</span>{p.portalUrl && <a href={p.portalUrl} target="_blank" rel="noopener noreferrer"><span className="portal-label">Official portal</span> {p.portalLabel || p.portalUrl} <span aria-hidden="true">↗</span></a>}</footer>
      </article>
      <DownloadControls />
      </>} />
    </main>
    </div>
  );
}

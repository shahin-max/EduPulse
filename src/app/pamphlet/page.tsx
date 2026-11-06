import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import DownloadControls from "./download-controls";
import logo from "../../../public/edupulse-logo.jpeg";
import mark from "../../../public/logo-mark.png";
import "./pamphlet.css";

export const metadata: Metadata = {
  title: "Sainik School Admission 2027",
  description: "Prepare for AISSEE 2027 with Edupulse Academy, Aligarh. Sainik School entrance preparation for Class VI and Class IX. Learn Smart. Lead Ahead.",
};

const subjects = ["Mathematics", "Intelligence", "Language / English", "General Knowledge", "Science", "Social Science"];

export default function PamphletPage() {
  return (
    <div className="pamphlet-page">
    <main className="page-shell">
      <Link href="/" className="pamphlet-back"><span aria-hidden="true">←</span> Back to EduPulse website</Link>
      <article id="edupulse-brochure" className="brochure">
        <header className="brand-header">
          <div className="brand-logo"><Image src={logo} alt="Edupulse Academy" loading="eager" unoptimized /></div>
          <div className="brand-message"><p>Learn Smart. Lead Ahead.</p><span>ALIGARH <i /> ACADEMIC SESSION 2027–28</span></div>
          <details className="whatsapp-contact" data-export-ignore>
            <summary className="header-contact">Talk to us <span aria-hidden="true">&#8599;</span></summary>
            <div className="whatsapp-menu"><p>Chat with us on WhatsApp</p><a href="https://wa.me/917015628794" target="_blank" rel="noopener noreferrer">7015628794 <span aria-hidden="true">&#8599;</span></a><a href="https://wa.me/919627232324" target="_blank" rel="noopener noreferrer">9627232324 <span aria-hidden="true">&#8599;</span></a></div>
          </details>
        </header>

        <div className="brochure-panels">
          <section className="admissions-panel" aria-labelledby="admissions-title">
            <div className="panel-topline"><span className="admissions-badge"><i /> ADMISSIONS 2027</span><span className="panel-number">01 / YOUR NEXT CHAPTER</span></div>
            <h1 id="admissions-title">SAINIK SCHOOL<span>A brighter future<br />starts here.</span></h1>
            <div className="class-row"><span>CLASS VI</span><span>CLASS IX</span><p>Academic Session <strong>2027–28</strong></p></div>
            <div className="forms-notice"><span>AISSEE 2027 FORMS OUT</span><strong>3 November 2026 <span aria-hidden="true">↗</span></strong></div>
            <div className="date-list">
              <div><span className="date-symbol" aria-hidden="true">01</span><div><p>Online applications</p><strong><time dateTime="2026-11-03">3 November</time> – <time dateTime="2026-12-02">2 December 2026</time></strong></div></div>
              <div><span className="date-symbol" aria-hidden="true">02</span><div><p>Entrance examination</p><strong><time dateTime="2027-01-31">31 January 2027</time></strong></div></div>
            </div>
            <p className="admission-footnote">Big ambitions. Strong foundations. Confident beginnings.</p>
          </section>

          <section className="preparation-panel" aria-labelledby="preparation-title">
            <div className="panel-topline"><span className="section-label">PREPARE WITH EDUPULSE</span><span className="panel-number">02 / GET A HEAD START</span></div>
            <div className="preparation-heading"><div><p className="enrol-label">ENROL NOW FOR</p><h2 id="preparation-title">AISSEE 2027<span>PREPARATION</span></h2></div><Image className="preparation-mark" src={mark} alt="" width={76} height={76} unoptimized /></div>
            <p className="guidance">Expert guidance for entrance preparation.</p>
            <ul className="subjects">{subjects.map(subject => <li key={subject}><span aria-hidden="true">✓</span>{subject}</li>)}</ul>
            <div className="contact-card"><p className="contact-eyebrow">LET’S BUILD YOUR CHILD’S FUTURE</p><h3>Your next step starts with a call.</h3><div className="phone-numbers"><a href="tel:+917015628794">7015628794 <span aria-hidden="true">↗</span></a><a href="tel:+919627232324">9627232324 <span aria-hidden="true">↗</span></a></div><p className="location"><span aria-hidden="true">⌖</span> Edupulse Academy, Aligarh</p></div>
          </section>
        </div>

        <footer className="brochure-footer"><span>LEARN SMART. <strong>LEAD AHEAD.</strong></span><a href="https://exams.nta.nic.in/sainik-school-society" target="_blank" rel="noopener noreferrer"><span className="portal-label">Official portal</span> exams.nta.nic.in/sainik-school-society <span aria-hidden="true">↗</span></a></footer>
      </article>
      <DownloadControls />
    </main>
    </div>
  );
}

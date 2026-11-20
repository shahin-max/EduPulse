"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, ChevronRight, Clock, Facebook, GraduationCap, Instagram, Mail, MapPin, Menu, MessageCircle, Moon, Phone, Star, Sun, UserRound, X, Youtube } from "lucide-react";
import { homeFor } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import PromoTicker from "@/components/promo-ticker";
import HeroSlider from "@/components/hero-slider";
import { courseHref } from "@/lib/site";
import type { ApiFaculty } from "@/lib/api";
import type { HomeResults } from "@/lib/home-content";
import { FacultySection, ResultsSection, UpdatesSection } from "@/components/home-sections";
import { ScholarshipPanel } from "@/components/scholarship-form";
import { useContactInfo, usePrograms, useProgramsSection, useSiteContent, whatsappHref } from "@/lib/site-content";
import { siteIcon } from "@/lib/site-icons";
import { DEFAULT_SECTIONS, type HomeSectionId, type HomeSections } from "@/lib/site-sections";

const links = [["Home", "home"], ["About Us", "about"], ["Courses", "courses"], ["Admissions", "admissions"], ["Faculty", "faculty"], ["Gallery", "gallery"], ["Contact", "contact"]] as const;
/** The header dialog: Scholarship Test registration (text editable in Website content, site.scholarship). */
type Modal = "scholarship" | null;

function navHref(id: string) {
  return id === "about" ? "/aboutus" : id === "gallery" ? "/gallery" : id === "courses" ? "/courses" : id === "contact" ? "/contact" : id === "faculty" ? "/faculty" : id === "admissions" ? "/admissions" : `/#${id}`;
}

function Brand({ priority = false }: { priority?: boolean }) {
  return <Link href="/" aria-label="EduPulse Academy home" className="brand">
    <span className="brand-mark"><Image src="/logo-mark.png" alt="" width={46} height={46} priority={priority} /></span>
    <span className="brand-name">EDU<span>PULSE</span><small>ACADEMY</small></span>
  </Link>;
}

/** Data for the home page sections (only the home page passes it). */
export type HomeData = { results: HomeResults; teachers: ApiFaculty[]; sections?: HomeSections };

const WHATSAPP_HELLO = "Hello EduPulse Academy, I would like to know more about your programs.";

export default function AcademySite({ children, home }: { children?: React.ReactNode; home?: HomeData }) {
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState("home");
  const [modal, setModal] = useState<Modal>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const isCurrent = (id: string) => pathname === "/aboutus" ? id === "about" : pathname === "/gallery" ? id === "gallery" : pathname === "/courses" || pathname.startsWith("/courses/") ? id === "courses" : pathname === "/contact" ? id === "contact" : pathname === "/faculty" ? id === "faculty" : pathname === "/admissions" ? id === "admissions" : pathname === "/" && active === id;

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("edupulse-theme"); } catch {}
      if (!saved) { document.documentElement.classList.toggle("dark", media.matches); sync(); }
    };
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    document.querySelectorAll("main section[id], footer[id]").forEach(section => observer.observe(section));
    return () => { media.removeEventListener("change", update); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobile(false); };
    const onResize = () => { if (window.innerWidth > 1023) setMobile(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [mobile]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("edupulse-theme", next ? "dark" : "light"); } catch {}
  }
  function open(next: Exclude<Modal, null>) {
    setModal(next);
    setMobile(false);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  const scholarship = useSiteContent().scholarship;
  const contact = useContactInfo();
  const programs = usePrograms();
  const programsText = useProgramsSection();
  const sections = home?.sections ?? DEFAULT_SECTIONS;
  const hidden = new Set<HomeSectionId>(sections.layout.hidden);
  const shown = sections.layout.order.filter(id => !hidden.has(id) && id !== "features");
  const { gallery, contact: talk } = sections;

  // The gallery and callback cards share one row, placed where the first of them is in the order.
  const cardsRow = shown.filter(id => id === "gallery" || id === "contact");
  function renderSection(id: HomeSectionId) {
    if (!home) return null;
    switch (id) {
      case "programs": return <section key={id} id="courses" className="programs-section page-container" aria-labelledby="courses-title">
        {programsText.kicker && <p className="section-kicker">{programsText.kicker}</p>}
        <h2 id="courses-title">{programsText.title}{programsText.titleAccent && <><br /><span>{programsText.titleAccent}</span></>}</h2>
        {programsText.intro && <p className="section-intro">{programsText.intro}</p>}
        <div className="program-grid">{programs.map(program => <Link className="program-card" key={program.slug} href={courseHref(program.slug)}><span className="program-icon"><program.icon size={23} /></span><span><strong>{program.title}</strong><small>{program.detail}</small></span><ChevronRight className="program-arrow" size={18} /></Link>)}</div>
      </section>;
      case "updates": return <UpdatesSection key={id} updates={sections.updates} />;
      case "results": return <ResultsSection key={id} results={home.results} header={sections.resultsHeader} />;
      case "faculty": return <FacultySection key={id} teachers={home.teachers} text={sections.faculty} />;
      case "gallery":
      case "contact":
        if (id !== cardsRow[0]) return null;
        return <div key="cards" className={`page-container upcoming-grid${cardsRow.length === 1 ? " upcoming-grid-single" : ""}`}>
          {cardsRow.map(card => card === "gallery"
            ? <section key={card} id="gallery" className="upcoming-card gallery-teaser" aria-labelledby="gallery-teaser-title">
              {gallery.image && <div className="gallery-teaser-image"><Image src={gallery.image} alt={gallery.imageAlt} fill sizes="(max-width: 640px) 90vw, 40vw" /></div>}
              <Camera size={25} />{gallery.kicker && <p className="section-kicker">{gallery.kicker}</p>}<h2 id="gallery-teaser-title">{gallery.title}</h2>
              {gallery.text && <p>{gallery.text}</p>}
              <Link className="text-link" href="/gallery">{gallery.linkLabel} <ArrowRight size={17} /></Link>
            </section>
            : <section key={card} id="talk" className="upcoming-card home-contact-card" aria-labelledby="talk-title">
              <MessageCircle size={25} />{talk.kicker && <p className="section-kicker">{talk.kicker}</p>}<h2 id="talk-title">{talk.title}</h2>
              {talk.text && <p>{talk.text}</p>}
              <div className="home-contact-list">
                {contact.phones.map(phone => <a key={phone.tel} href={`tel:${phone.tel}`}><Phone size={18} /><span>{phone.display}<small>Call the academy</small></span><ChevronRight size={16} /></a>)}
                <a href={whatsappHref(contact, WHATSAPP_HELLO)} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /><span>Chat on WhatsApp<small>Quick replies from our team</small></span><ChevronRight size={16} /></a>
                <a href={`mailto:${contact.email}`}><Mail size={18} /><span>{contact.email}<small>Email us anytime</small></span><ChevronRight size={16} /></a>
              </div>
              <div className="home-contact-actions">
                <Button asChild size="lg"><Link href="/admissions">{talk.primaryLabel} <ArrowRight size={16} /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link href="/contact">{talk.secondaryLabel}</Link></Button>
              </div>
            </section>)}
        </div>;
      default: return null;
    }
  }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <PromoTicker />
      <div className="nav-container">
        <Brand priority />
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([label, id]) => <Link key={id} href={navHref(id)} aria-current={isCurrent(id) ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="nav-actions">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className="theme-button"><Sun className="dark-sun" /><Moon className="light-moon" /></Button>
          <Button className="scholarship-button" onClick={() => open("scholarship")}><Star className="fill-current" /> <span>Scholarship Test</span></Button>
          {status === "authenticated" ? <Button asChild className="desktop-auth signup-button"><Link href={homeFor(user)}><UserRound /> {user?.full_name.split(" ")[0] ?? "My account"}</Link></Button> : <>
            <Button asChild variant="ghost" className="desktop-auth login-button"><Link href="/login">Login</Link></Button>
            <Button asChild className="desktop-auth signup-button"><Link href="/register">Sign Up <ArrowRight /></Link></Button>
          </>}
          <Button variant="ghost" size="icon" className="mobile-toggle" aria-expanded={mobile} aria-controls="mobile-navigation" aria-label={mobile ? "Close navigation" : "Open navigation"} onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {mobile && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-nav">
        {links.map(([label, id]) => <Link key={id} href={navHref(id)} aria-current={isCurrent(id) ? "page" : undefined} onClick={() => setMobile(false)}>{label}<ChevronRight size={16} /></Link>)}
        <div className="mobile-auth">{status === "authenticated"
          ? <><Button asChild variant="outline"><Link href={homeFor(user)} onClick={() => setMobile(false)}>My account</Link></Button><Button onClick={() => { setMobile(false); void logout(); }}>Log out</Button></>
          : <><Button asChild variant="outline"><Link href="/login" onClick={() => setMobile(false)}>Login</Link></Button><Button asChild><Link href="/register" onClick={() => setMobile(false)}>Sign Up</Link></Button></>}</div>
      </nav>}
    </header>

    <main id="main">{children ?? <>
      <section id="home" className="hero" aria-labelledby="hero-title">
        <HeroSlider hero={sections.hero} />
        {!hidden.has("features") && sections.features.items.length > 0 && <div className="hero-benefits"><div className="page-container feature-grid">{sections.features.items.map(({ title, detail, icon }, i) => {
          const Icon = siteIcon(icon, Star);
          return <div className="feature-card" key={`${title}-${i}`}><Icon size={23} strokeWidth={1.5} /><div><h3>{title}</h3>{detail && <p>{detail}</p>}</div></div>;
        })}</div></div>}
      </section>

      {shown.map(renderSection)}
    </>}</main>

    <footer id="contact" className="site-footer"><div className="page-container"><div className="footer-grid">
      <div><Brand />{contact.motto && <p className="footer-motto">{contact.motto}</p>}{contact.tagline && <p className="footer-tagline">{contact.tagline}</p>}
        <nav className="footer-socials" aria-label="Social media">
          {contact.instagram && <a href={contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on Instagram (opens in a new tab)" title="Instagram"><Instagram size={19} aria-hidden="true" /></a>}
          {contact.facebook && <a href={contact.facebook} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on Facebook (opens in a new tab)" title="Facebook"><Facebook size={19} aria-hidden="true" /></a>}
          {contact.youtube && <a href={contact.youtube} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on YouTube (opens in a new tab)" title="YouTube"><Youtube size={19} aria-hidden="true" /></a>}
        </nav>
      </div>
      <div><h2>Quick Links</h2><ul>{links.map(([label, id]) => <li key={id}><Link href={navHref(id)}>{label}</Link></li>)}</ul></div>
      <div><h2>Our Courses</h2><ul>{programs.map(program => <li key={program.slug}><Link href={courseHref(program.slug)}>{program.title}</Link></li>)}</ul></div>
      <div><h2>Contact Us</h2><ul className="contact-list">
        <li><MapPin size={17} /><span>{contact.address}</span></li>
        <li><Phone size={17} /><span>{contact.phones.map((phone, i) => <span key={phone.tel}>{i > 0 && " / "}<a href={`tel:${phone.tel}`}>{phone.display}</a></span>)}</span></li>
        <li><MessageCircle size={17} /><a href={whatsappHref(contact, WHATSAPP_HELLO)} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></li>
        <li><Mail size={17} /><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
        {contact.hours && <li><Clock size={17} /><span>{contact.hours}</span></li>}
      </ul></div>
    </div><div className="footer-bottom"><p>&copy; {new Date().getFullYear()} EduPulse Academy, Aligarh. All rights reserved.</p>{contact.footerNote && <span>{contact.footerNote}</span>}</div></div></footer>

    <a className="whatsapp-fab" href={whatsappHref(contact, WHATSAPP_HELLO)} target="_blank" rel="noopener noreferrer" aria-label="Chat with EduPulse on WhatsApp (opens in a new tab)"><MessageCircle aria-hidden="true" /><span>Chat with us</span></a>

    <dialog ref={dialog} aria-labelledby="dialog-title" className="info-dialog info-dialog-wide" onClose={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {modal && <div className="dialog-content">
        <Button variant="ghost" size="icon" className="dialog-close" aria-label="Close dialog" onClick={() => dialog.current?.close()}><X /></Button>
        <span className="program-icon"><GraduationCap size={27} /></span>
        <p className="section-kicker">EDUPULSE ACADEMY</p>
        {/* The open test (details + registration) when there is one; otherwise the editable text and interest form. */}
        <ScholarshipPanel fallbackTitle={scholarship?.title} fallbackBody={scholarship?.body} />
        <p className="dialog-email">Questions? Call {contact.phones.map((phone, i) => <span key={phone.tel}>{i > 0 && " / "}<a href={`tel:${phone.tel}`}>{phone.display}</a></span>)} or <a href={`mailto:${contact.email}?subject=${encodeURIComponent("Scholarship Test")}`}>email us</a>.</p>
      </div>}
    </dialog>
  </>;
}

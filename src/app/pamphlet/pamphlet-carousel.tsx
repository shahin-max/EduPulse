"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IMAGE_PAMPHLETS, PROGRAMMES_VIDEO } from "@/lib/pamphlets";
import { useContactInfo, whatsappHref } from "@/lib/site-content";

/**
 * Every pamphlet on one screen: the Sainik School pamphlet (rendered by the page), the programmes video and
 * the course pamphlet images, side by side. Tabs, arrows, dots, swiping and the ← → keys move between
 * them; the address keeps the open one (/pamphlet#learn-german) so links can point at a pamphlet.
 */
export default function PamphletCarousel({ sainik }: { sainik: React.ReactNode }) {
  const contact = useContactInfo();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const slides = [
    { id: "sainik-school", name: "Sainik School" },
    { id: "video", name: "▶ Watch video" },
    ...IMAGE_PAMPHLETS.map(p => ({ id: p.id, name: p.name })),
  ];
  const count = slides.length;

  const go = useCallback((next: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const i = Math.max(0, Math.min(count - 1, next));
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
  }, [count]);

  // Open the pamphlet named in the address (e.g. from Latest updates).
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const i = slides.findIndex(s => s.id === id);
    if (i > 0) requestAnimationFrame(() => go(i, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i === index) return;
    setIndex(i);
    // Stop the video when it scrolls away, and keep the address in step for sharing.
    el.querySelectorAll("video").forEach(v => v.pause());
    history.replaceState(null, "", i === 0 ? window.location.pathname : `#${slides[i].id}`);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "VIDEO", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  // Keep the open slide in place when the window is resized.
  useEffect(() => {
    const onResize = () => go(index, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [go, index]);

  // On wide screens the Sainik pamphlet is scaled down to fit the slide's height, so nothing scrolls.
  const sainikSlide = useRef<HTMLElement>(null);
  const sainikBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function fit() {
      const slide = sainikSlide.current, body = sainikBody.current;
      if (!slide || !body) return;
      body.style.zoom = "1";
      if (window.innerWidth <= 900) return;
      const style = getComputedStyle(slide);
      const room = slide.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const needed = body.scrollHeight;
      if (needed > room) body.style.zoom = String(Math.max(0.55, room / needed));
    }
    fit();
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="pc">
      <header className="pc-bar">
        <Link href="/" className="pamphlet-back"><span aria-hidden="true">←</span> <span className="pc-back-text">EduPulse website</span></Link>
        <nav className="pc-tabs" aria-label="Pamphlets">
          {slides.map((s, i) => <button key={s.id} type="button" aria-current={i === index ? "true" : undefined} onClick={() => go(i)}>{s.name}</button>)}
        </nav>
        <div className="pc-arrows">
          <button type="button" aria-label="Previous pamphlet" disabled={index === 0} onClick={() => go(index - 1)}>←</button>
          <button type="button" aria-label="Next pamphlet" disabled={index === count - 1} onClick={() => go(index + 1)}>→</button>
        </div>
      </header>

      <div className="pc-track" ref={track} onScroll={onScroll}>
        <section className="pc-slide pc-sainik" id="sainik-school" aria-label="Sainik School pamphlet" ref={sainikSlide}><div className="pc-sainik-body" ref={sainikBody}>{sainik}</div></section>

        <section className="pc-slide" id="video" aria-label={PROGRAMMES_VIDEO.title}>
          <div className="pc-split">
            <div className="pc-media"><video src={PROGRAMMES_VIDEO.src} poster={PROGRAMMES_VIDEO.poster} controls preload="none" playsInline aria-label={PROGRAMMES_VIDEO.title} /></div>
            <div className="pc-info">
              <p className="pc-eyebrow">WATCH &amp; LISTEN · 3 MIN</p>
              <h2>{PROGRAMMES_VIDEO.title}</h2>
              <p>{PROGRAMMES_VIDEO.summary}</p>
              <ul className="pc-points">
                <li>Sainik School, RMS &amp; RIMC entrance</li>
                {IMAGE_PAMPHLETS.map(p => <li key={p.id}>{p.title}</li>)}
              </ul>
              <div className="pc-actions"><a className="pc-button" href={PROGRAMMES_VIDEO.src} download={PROGRAMMES_VIDEO.file}>Download video ↓</a></div>
            </div>
          </div>
        </section>

        {IMAGE_PAMPHLETS.map(p => (
          <section className="pc-slide" id={p.id} key={p.id} aria-label={`${p.title} pamphlet`}>
            <div className="pc-split">
              <a className="pc-media" href={p.src} target="_blank" rel="noopener noreferrer" title="Open full size">
                <Image src={p.src} alt={p.alt} width={p.width} height={p.height} sizes="(max-width: 900px) 92vw, 50vw" />
              </a>
              <div className="pc-info">
                <p className="pc-eyebrow">{p.badge.toUpperCase()}</p>
                <h2>{p.title}</h2>
                <p>{p.summary}</p>
                <div className="pc-actions">
                  <a className="pc-button" href={p.src} download={p.file}>Download pamphlet ↓</a>
                  <a className="pc-button pc-button-ghost" href={whatsappHref(contact, `Hello EduPulse, I would like details about ${p.title}.`)} target="_blank" rel="noopener noreferrer">Ask on WhatsApp ↗</a>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <footer className="pc-foot">
        <div className="pc-dots">{slides.map((s, i) => <button key={s.id} type="button" aria-label={`Show ${s.name}`} aria-current={i === index ? "true" : undefined} onClick={() => go(i)} />)}</div>
        <span className="pc-count" aria-live="polite">{index + 1} / {count} · {slides[index].name.replace("▶ ", "")}</span>
      </footer>
    </div>
  );
}

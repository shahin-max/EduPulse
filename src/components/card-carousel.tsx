"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * A row of cards that scrolls sideways (swipe, trackpad or the arrow buttons), one card per snap.
 * Children are the cards (e.g. <li> elements); `label` names the list for screen readers.
 */
export default function CardCarousel({ label, children }: { label: string; children: React.ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  function update() {
    const el = track.current;
    if (el) setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function scroll(direction: number) {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (el && card) el.scrollBy({ left: direction * (card.offsetWidth + 20), behavior: "smooth" });
  }

  return <div className="card-carousel">
    <ul className="card-carousel-track" ref={track} onScroll={update} aria-label={label}>{children}</ul>
    {!(edges.start && edges.end) && <div className="card-carousel-controls">
      <button type="button" aria-label="Previous" disabled={edges.start} onClick={() => scroll(-1)}><ArrowLeft size={18} /></button>
      <button type="button" aria-label="Next" disabled={edges.end} onClick={() => scroll(1)}><ArrowRight size={18} /></button>
    </div>}
  </div>;
}

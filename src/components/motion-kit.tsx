"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useSpring, useTransform, type Variants } from "motion/react";

/** Shared animation building blocks for the courses pages. */
export const EASE = [0.2, 0.7, 0.2, 1] as const;
export const stagger: Variants = { show: { transition: { staggerChildren: 0.08 } } };
export const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: EASE } },
};
const word: Variants = {
  hidden: { y: "110%", rotate: 4 },
  show: { y: "0%", rotate: 0, transition: { duration: 0.85, ease: EASE } },
};

/** Splits text into words that slide up one after another (needs a parent with `stagger`). */
export function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return words.map((w, i) => (
    <Fragment key={i}><span className="hero-word"><motion.span variants={word}>{w}</motion.span></span>{i < words.length - 1 ? " " : null}</Fragment>
  ));
}

/** Counts up from 0 to `to` the first time it scrolls into view. */
export function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: 1.4, ease: EASE, onUpdate: v => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to]);
  return <span ref={ref}>{prefix}{value}{suffix}</span>;
}

/** Fades and lifts its children into view once, as the section scrolls in. */
export function Reveal({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "section" }) {
  const Tag = motion[as];
  return <Tag className={className} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>{children}</Tag>;
}

/** Card that tilts toward the pointer with a soft glow. */
export function TiltCard({ children, className, max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 200, damping: 20 });
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 200, damping: 20 });
  const glowX = useTransform(x, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);
  const glow = useTransform([glowX, glowY], ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, color-mix(in srgb, var(--leaf) 22%, transparent), transparent 60%)`);
  return (
    <motion.div
      variants={rise}
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); x.set((e.clientX - r.left) / r.width - 0.5); y.set((e.clientY - r.top) / r.height - 0.5); }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
      whileHover={{ y: -6 }}
    >
      <motion.span className="course-card-glow" style={{ background: glow }} aria-hidden="true" />
      {children}
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSelect } from "@/components/brand-select";
import { PHONE_PATTERN } from "@/components/enquiry-form";
import { ApiError, publicApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useContactInfo, whatsappHref } from "@/lib/site-content";
import {
  istDateTime, SCHOLARSHIP_GRADES, scholarshipsApi, slabRows, testWindow, type OpenScholarshipTest,
} from "@/lib/scholarships-api";
import { trackEvent } from "@/components/analytics";

/** Same rule as the register page and the API: 8-72 characters with a letter and a number. */
const PASSWORD_PATTERN = "(?=.*[A-Za-z])(?=.*\\d).{8,72}";
const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

const DEFAULT_BODY = "Students can win a scholarship on their EduPulse course fees through our Scholarship Test. Register below and our team will call you with the test date, syllabus and how scholarships are awarded.";

/**
 * Content of the header "Scholarship Test" dialog. When a test is taking registrations
 * (GET /scholarship-tests/current) it shows the details and lets students register for the online
 * test; otherwise it shows the editable site.scholarship text and the interest form.
 */
export function ScholarshipPanel({ fallbackTitle, fallbackBody }: { fallbackTitle?: string; fallbackBody?: string }) {
  const [state, setState] = useState<{ loading: boolean; test: OpenScholarshipTest | null }>({ loading: true, test: null });

  useEffect(() => {
    let live = true;
    scholarshipsApi.current()
      .then(r => { if (live) setState({ loading: false, test: r.test }); })
      .catch(() => { if (live) setState({ loading: false, test: null }); });
    return () => { live = false; };
  }, []);

  if (state.loading) return <>
    <h2 id="dialog-title">{fallbackTitle ?? "Scholarship Test"}</h2>
    <p className="dialog-body scholarship-loading"><Loader2 className="animate-spin" size={16} /> Checking the next test…</p>
  </>;

  if (!state.test) return <>
    <h2 id="dialog-title">{fallbackTitle ?? "Scholarship Test"}</h2>
    <p className="dialog-body">{fallbackBody ?? DEFAULT_BODY}</p>
    <ScholarshipForm />
  </>;

  const t = state.test;
  return <>
    <h2 id="dialog-title">{t.title}</h2>
    {t.description && <p className="dialog-body">{t.description}</p>}
    <ul className="scholarship-facts">
      <li><CalendarClock size={16} aria-hidden="true" /><span>{testWindow(t.opens_at, t.closes_at, t.duration_minutes)}</span></li>
      {t.registration_closes_at && <li><CalendarClock size={16} aria-hidden="true" /><span>Register by {istDateTime(t.registration_closes_at)}</span></li>}
      {t.eligible_grades.length > 0 && <li><CheckCircle2 size={16} aria-hidden="true" /><span>For {t.eligible_grades.join(", ")} students</span></li>}
    </ul>
    {t.slabs.length > 0 && <table className="scholarship-slabs">
      <caption>Scholarships you can win</caption>
      <thead><tr><th scope="col">Your score</th><th scope="col">Scholarship</th></tr></thead>
      <tbody>{slabRows(t.slabs).map(r => <tr key={r.score}><td>{r.score}</td><td>{r.award}</td></tr>)}</tbody>
    </table>}
    <Registration test={t} />
  </>;
}

function Registration({ test }: { test: OpenScholarshipTest }) {
  const { user, status, register, withToken } = useAuth();
  const classes = test.eligible_grades.length ? test.eligible_grades : SCHOLARSHIP_GRADES;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; existing?: boolean } | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <div className="enquiry-form enquiry-done" role="status">
    <CheckCircle2 size={34} className="enquiry-done-icon" aria-hidden="true" />
    <h3>You&apos;re registered.</h3>
    <p>Take the test in your student portal during the test window. Your result and any scholarship you win will appear there.</p>
    <div className="enquiry-done-actions"><Button asChild><Link href="/student/scholarships">Open my student portal <ArrowRight /></Link></Button></div>
  </div>;

  if (status === "loading") return <p className="dialog-body scholarship-loading"><Loader2 className="animate-spin" size={16} /> Loading…</p>;

  if (user && !user.roles.includes("STUDENT")) return <p className="scholarship-note">
    Registration is for student accounts. You are signed in as staff; students register from their own account.
  </p>;

  async function join(grade: string) {
    await withToken(token => scholarshipsApi.join(token, test.id, grade));
    setDone(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const grade = get("grade");
    setError(null);
    if (!user) {
      if (get("password") !== String(data.get("confirm") ?? "")) return setError({ message: "The two passwords do not match." });
    }
    setBusy(true);
    try {
      if (!user) {
        try {
          await register({ fullName: get("name"), mobile: get("phone").replace(/[\s-]/g, ""), email: get("email") || undefined, password: String(data.get("password")), grade });
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) return setError({ message: "You already have an account with these details.", existing: true });
          throw e;
        }
      }
      await join(grade);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Could not register. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const classField = <div className="enquiry-field"><span id="grade-label" className="enquiry-label">Current class</span><BrandSelect name="grade" aria-labelledby="grade-label" options={classes} defaultValue={classes[0]} /></div>;

  return <form className="enquiry-form scholarship-form" onSubmit={submit}>
    {user
      ? <>
        <p className="scholarship-note">Registering as <strong>{user.full_name}</strong>.</p>
        {classField}
      </>
      : <>
        <p className="scholarship-note">Create your free student account to register. Already have one? <Link href="/login">Log in</Link> first.</p>
        <div className="enquiry-row">
          <label>Student name<input name="name" required autoComplete="name" minLength={2} maxLength={160} placeholder="Full name" /></label>
          <label>Phone number<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title="Enter a valid 10-digit mobile number" placeholder="10-digit mobile" /></label>
        </div>
        <div className="enquiry-row">
          {classField}
          <label><span className="label-text">Email <span>(optional)</span></span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
        </div>
        <div className="enquiry-row">
          <label>Password<input name="password" type="password" required autoComplete="new-password" pattern={PASSWORD_PATTERN} title={PASSWORD_HINT} maxLength={72} placeholder="Create a password" /></label>
          <label>Confirm password<input name="confirm" type="password" required autoComplete="new-password" maxLength={72} placeholder="Repeat password" /></label>
        </div>
        <p className="enquiry-hint">{PASSWORD_HINT} You will use your phone number and this password to log in on the test day.</p>
      </>}
    {error && <div className="enquiry-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{error.message}{error.existing && <> <Link href="/login">Log in</Link> and register from this button again.</>}</span>
    </div>}
    <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>
      {busy ? <><Loader2 className="animate-spin" /> Registering...</> : <>{user ? "Register for the test" : "Create account & register"} <Send /></>}
    </Button>
  </form>;
}

type Sent = { kind: "saved"; id: number; whatsapp: string } | { kind: "failed"; message: string; whatsapp: string };

/**
 * Interest form, shown while no Scholarship Test is open. Saved as an admission enquiry with source
 * SCHOLARSHIP_TEST, so the office sees it in Admin → Enquiries and calls back when the next test opens.
 * WhatsApp is the fallback when the API can't be reached.
 */
export default function ScholarshipForm() {
  const contact = useContactInfo();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const whatsapp = whatsappHref(contact, [
      "Hello EduPulse Academy, I would like to register for the Scholarship Test.",
      `Name: ${get("name")}`,
      `Phone: ${get("phone")}`,
      `Class: ${get("grade")}`,
    ].join("\n"));
    setBusy(true);
    try {
      const enquiry = await publicApi.enquire({
        studentName: get("name"),
        mobile: get("phone").replace(/[\s-]/g, ""),
        email: get("email") || undefined,
        message: `Scholarship Test registration\nClass: ${get("grade")}`,
        source: "SCHOLARSHIP_TEST",
      });
      trackEvent("generate_lead", { form: "scholarship_test" });
      setSent({ kind: "saved", id: enquiry.id, whatsapp });
    } catch (e) {
      setSent({ kind: "failed", message: e instanceof Error ? e.message : "Could not send the registration.", whatsapp });
    } finally {
      setBusy(false);
    }
  }

  if (sent?.kind === "saved") return <div className="enquiry-form enquiry-done" role="status">
    <CheckCircle2 size={34} className="enquiry-done-icon" aria-hidden="true" />
    <h3>You are registered.</h3>
    <p>Our team will call you with the test date, syllabus and details. Your reference number is <strong>#{sent.id}</strong>.</p>
    <div className="enquiry-done-actions">
      <Button asChild variant="outline"><a href={sent.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> Also message us on WhatsApp</a></Button>
    </div>
  </div>;

  return <form className="enquiry-form scholarship-form" onSubmit={submit}>
    <div className="enquiry-row">
      <label>Student name<input name="name" required autoComplete="name" minLength={2} maxLength={160} placeholder="Full name" /></label>
      <label>Phone number<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title="Enter a valid 10-digit mobile number" placeholder="10-digit mobile" /></label>
    </div>
    <div className="enquiry-row">
      <div className="enquiry-field"><span id="grade-label" className="enquiry-label">Current class</span><BrandSelect name="grade" aria-labelledby="grade-label" options={SCHOLARSHIP_GRADES} defaultValue="Class 5" /></div>
      <label><span className="label-text">Email <span>(optional)</span></span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
    </div>
    {sent?.kind === "failed" && <div className="enquiry-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{sent.message} You can send the same details on WhatsApp instead: <a href={sent.whatsapp} target="_blank" rel="noopener noreferrer">open WhatsApp</a>.</span>
    </div>}
    <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Registering...</> : <>Register for the test <Send /></>}</Button>
  </form>;
}

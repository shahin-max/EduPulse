"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSelect } from "@/components/brand-select";
import { publicApi, request, type ApiCourse } from "@/lib/api";
import { contact, programs, whatsappLink } from "@/lib/site";

const NOT_SURE = "Not sure yet - need guidance";
const programOptions = [...programs.map(p => p.title), NOT_SURE];

/** Same rule as MOBILE_REGEX in the API once spaces and dashes are removed: 10-15 digits, optional +. */
export const PHONE_PATTERN = "\\+?[0-9 \\-]{10,20}";

type Sent = { kind: "saved"; id: number; whatsapp: string } | { kind: "failed"; message: string; whatsapp: string };

/**
 * The website enquiry ("request a callback") form. Saves the enquiry in the LMS, where the team
 * follows it up; WhatsApp stays available as a second channel and as the fallback when the API is down.
 * `defaultProgram` is a program slug (e.g. from /contact?program=neet) to pre-select.
 */
export default function EnquiryForm({ defaultProgram }: { defaultProgram?: string | null }) {
  const preselected = programs.find(p => p.slug === defaultProgram)?.title;
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  // Course ids for linking the enquiry to the catalogue. Optional: without them the enquiry is still saved.
  useEffect(() => {
    request<ApiCourse[]>("/courses").then(setCourses).catch(() => {});
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const programTitle = get("program");
    const program = programs.find(p => p.title === programTitle);
    const course = courses.find(c => program?.courseSlugs.includes(c.slug));
    const whatsapp = whatsappLink([
      "Hello EduPulse Academy, I would like to know more.",
      `Name: ${get("name")}`,
      `Phone: ${get("phone")}`,
      `Interested in: ${programTitle}`,
      get("message") && `Message: ${get("message")}`,
    ].filter(Boolean).join("\n"));

    setBusy(true);
    try {
      const enquiry = await publicApi.enquire({
        studentName: get("name"),
        mobile: get("phone").replace(/[\s-]/g, ""),
        email: get("email") || undefined,
        interestedCourseId: course?.id,
        message: [`Program: ${programTitle}`, get("message")].filter(Boolean).join("\n"),
        source: "WEBSITE",
      });
      setSent({ kind: "saved", id: enquiry.id, whatsapp });
    } catch (e) {
      setSent({ kind: "failed", message: e instanceof Error ? e.message : "Could not send the enquiry.", whatsapp });
    } finally {
      setBusy(false);
    }
  }

  if (sent?.kind === "saved") return <div className="enquiry-form enquiry-done" role="status">
    <CheckCircle2 size={34} className="enquiry-done-icon" aria-hidden="true" />
    <h3>Thank you, we have your enquiry.</h3>
    <p>Our team will call you back shortly with batch timings and fees. Your reference number is <strong>#{sent.id}</strong>.</p>
    <div className="enquiry-done-actions">
      <Button asChild variant="outline"><a href={sent.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> Also message us on WhatsApp</a></Button>
      <Button variant="ghost" onClick={() => setSent(null)}>Send another enquiry</Button>
    </div>
  </div>;

  return <form className="enquiry-form" onSubmit={submit}>
    <div className="enquiry-row">
      <label>Your name<input name="name" required autoComplete="name" minLength={2} maxLength={160} placeholder="Full name" /></label>
      <label>Phone number<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title="Enter a valid 10-digit mobile number" placeholder="10-digit mobile" /></label>
    </div>
    <label><span className="label-text">Email <span>(optional)</span></span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
    <div className="enquiry-field"><span id="program-label" className="enquiry-label">Program of interest</span><BrandSelect key={preselected ?? "default"} name="program" aria-labelledby="program-label" options={programOptions} defaultValue={preselected} /></div>
    <label><span className="label-text">Message <span>(optional)</span></span><textarea name="message" rows={3} maxLength={1000} placeholder="Class, preferred timing, or any question" /></label>
    {sent?.kind === "failed" && <div className="enquiry-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{sent.message} You can send the same details on WhatsApp instead: <a href={sent.whatsapp} target="_blank" rel="noopener noreferrer">open WhatsApp</a>.</span>
    </div>}
    <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Sending...</> : <>Request a callback <Send /></>}</Button>
    <p className="enquiry-hint">Prefer to talk now? {contact.phones.map((phone, i) => <span key={phone.tel}>{i > 0 && " / "}<a href={`tel:${phone.tel}`}>{phone.display}</a></span>)} or <a href={whatsappLink("Hello EduPulse Academy, I would like to know more about your programs.")} target="_blank" rel="noopener noreferrer">WhatsApp us</a></p>
  </form>;
}

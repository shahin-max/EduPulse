"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, GraduationCap, KeyRound, Loader2, MapPin, MessageCircle, PhoneCall, Send, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSelect } from "@/components/brand-select";
import { PHONE_PATTERN } from "@/components/enquiry-form";
import { publicApi, type ApiBatch, type ApiCourse } from "@/lib/api";
import { contact, programs, whatsappLink } from "@/lib/site";

const NOT_SURE = "Not sure yet - need guidance";
const ANY_BATCH = "Any batch / help me choose";

const steps = [
  { title: "Apply online", text: "Fill in this form. It reaches our admissions team straight away.", icon: Send },
  { title: "Counselling call", text: "We call you to understand the student's goals and suggest the right course and batch.", icon: PhoneCall },
  { title: "Confirm & pay fees", text: "Visit the academy or confirm by phone, then complete the fee for the chosen batch.", icon: Wallet },
  { title: "Start learning", text: "The student gets a portal login for classes, study material, tests and results.", icon: KeyRound },
];

export const formatDate = (iso: string | null) => iso
  ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
  : null;

function batchLabel(batch: ApiBatch) {
  const start = formatDate(batch.start_date);
  return [batch.name, start && `starts ${start}`, batch.branches?.name].filter(Boolean).join(" · ");
}

type Result = { kind: "saved"; id: number } | { kind: "failed"; message: string; whatsapp: string };

type FormProps = { courses: ApiCourse[]; batches: ApiBatch[] };

/** Pre-selects the course from ?course=<catalogue slug> or ?program=<website program slug>. */
function AdmissionFormFromUrl(props: FormProps) {
  const params = useSearchParams();
  return <AdmissionForm {...props} course={params.get("course")} program={params.get("program")} />;
}

function AdmissionForm({ courses, batches, course: courseSlug, program: programSlug }: FormProps & { course?: string | null; program?: string | null }) {
  // Course choices come from the LMS catalogue; if the API is unreachable, from the website programs.
  const options = courses.length ? courses.map(c => c.title) : programs.map(p => p.title);
  const preselected = courses.find(c => c.slug === courseSlug)?.title
    ?? (() => {
      const program = programs.find(p => p.slug === programSlug);
      if (!program) return undefined;
      return courses.find(c => program.courseSlugs.includes(c.slug))?.title ?? (courses.length ? undefined : program.title);
    })();
  const [courseTitle, setCourseTitle] = useState(preselected ?? options[0] ?? NOT_SURE);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const course = courses.find(c => c.title === courseTitle);
  const courseBatches = useMemo(() => batches.filter(b => b.courses.id === course?.id), [batches, course]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const batch = get("batch");
    const message = [
      "Admission application (website)",
      `Course: ${get("course")}`,
      batch && batch !== ANY_BATCH && `Preferred batch: ${batch}`,
      `Class / grade: ${get("grade")}`,
      get("school") && `School: ${get("school")}`,
      `Parent / guardian: ${get("guardian")}`,
      get("notes") && `Notes: ${get("notes")}`,
    ].filter(Boolean).join("\n");

    setBusy(true);
    try {
      const enquiry = await publicApi.enquire({
        studentName: get("student"),
        mobile: get("mobile").replace(/[\s-]/g, ""),
        email: get("email") || undefined,
        interestedCourseId: course?.id,
        message,
        source: "WEBSITE_ADMISSION",
      });
      setResult({ kind: "saved", id: enquiry.id });
    } catch (e) {
      setResult({
        kind: "failed",
        message: e instanceof Error ? e.message : "Could not submit the application.",
        whatsapp: whatsappLink(`Hello EduPulse Academy, I would like to apply for admission.\nStudent: ${get("student")}\nMobile: ${get("mobile")}\n${message}`),
      });
    } finally {
      setBusy(false);
    }
  }

  if (result?.kind === "saved") return <div className="enquiry-form enquiry-done" role="status">
    <CheckCircle2 size={34} className="enquiry-done-icon" aria-hidden="true" />
    <h3>Application received.</h3>
    <p>Thank you. Our admissions team will call the number you gave to discuss the course, batch and fees. Your application number is <strong>#{result.id}</strong>; please mention it when you call or visit.</p>
    <div className="enquiry-done-actions">
      <Button asChild><Link href="/courses">Explore courses <ArrowRight /></Link></Button>
      <Button variant="ghost" onClick={() => setResult(null)}>Submit another application</Button>
    </div>
  </div>;

  return <form className="enquiry-form" onSubmit={submit}>
    <div className="enquiry-row">
      <label>Student&apos;s name<input name="student" required autoComplete="name" minLength={2} maxLength={160} placeholder="Full name" /></label>
      <label>Class / grade<input name="grade" required maxLength={30} placeholder="e.g. 5, 8 or 12 (PCB)" /></label>
    </div>
    <div className="enquiry-row">
      <label>Parent / guardian name<input name="guardian" required minLength={2} maxLength={160} placeholder="Full name" /></label>
      <label>Mobile number<input name="mobile" required type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title="Enter a valid 10-digit mobile number" placeholder="10-digit mobile" /></label>
    </div>
    <div className="enquiry-row">
      <label><span className="label-text">Email <span>(optional)</span></span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
      <label><span className="label-text">School <span>(optional)</span></span><input name="school" minLength={2} maxLength={160} placeholder="Current school" /></label>
    </div>
    <div className="enquiry-field"><span id="course-label" className="enquiry-label">Course</span><BrandSelect name="course" aria-labelledby="course-label" options={[...options, NOT_SURE]} defaultValue={courseTitle} onValueChange={setCourseTitle} /></div>
    {courseBatches.length > 0 && <div className="enquiry-field"><span id="batch-label" className="enquiry-label">Preferred batch</span><BrandSelect key={course?.id} name="batch" aria-labelledby="batch-label" options={[ANY_BATCH, ...courseBatches.map(batchLabel)]} /></div>}
    <label><span className="label-text">Anything we should know? <span>(optional)</span></span><textarea name="notes" rows={3} maxLength={1000} placeholder="Preferred timings, previous coaching, questions about fees..." /></label>
    {result?.kind === "failed" && <div className="enquiry-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{result.message} You can send the same details on WhatsApp instead: <a href={result.whatsapp} target="_blank" rel="noopener noreferrer">open WhatsApp</a>.</span>
    </div>}
    <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Submitting...</> : <>Submit application <Send /></>}</Button>
    <p className="enquiry-hint">Submitting this form does not commit you to anything; it only asks our team to call you.</p>
  </form>;
}

export default function AdmissionsPage({ courses, batches }: { courses: ApiCourse[]; batches: ApiBatch[] }) {
  return <div className="course-page contact-page admissions-page">
    <section className="course-hero contact-hero" aria-labelledby="admissions-title">
      <div className="course-hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
      <div className="page-container contact-hero-inner">
        <div className="contact-hero-copy">
          <nav className="course-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Admissions</span></nav>
          <p className="course-kicker"><span className="course-kicker-icon"><GraduationCap size={17} /></span>ADMISSIONS OPEN</p>
          <h1 id="admissions-title" className="hero-title course-title contact-title"><span>Apply for admission</span> <em>in a few minutes.</em></h1>
          <p className="course-intro">Tell us about the student and the course you are interested in. Our admissions team will call you to recommend the right batch and walk you through fees and timings.</p>
        </div>
      </div>
    </section>

    <section className="page-container contact-main" aria-label="Admission form and open batches">
      <div className="contact-form-card">
        <span className="contact-form-glow" aria-hidden="true" />
        <p className="section-kicker">ADMISSION FORM</p>
        <h2>Student details.</h2>
        <p className="contact-form-intro">Fields marked optional can be left empty. Everything else helps us place the student in the right batch.</p>
        {/* The prerendered HTML has the form without a pre-selected course; the URL is read once the page loads. */}
        <Suspense fallback={<AdmissionForm courses={courses} batches={batches} />}>
          <AdmissionFormFromUrl courses={courses} batches={batches} />
        </Suspense>
      </div>

      <aside className="contact-visit admissions-batches" aria-labelledby="batches-title">
        <div className="contact-visit-body">
          <p className="section-kicker">OPEN BATCHES</p>
          <h2 id="batches-title">Batches taking admissions</h2>
          {batches.length ? <ul className="admissions-batch-list">
            {batches.map(batch => <li key={batch.id}>
              <strong>{batch.courses.title}</strong>
              <span>{batch.name}</span>
              <small>
                {formatDate(batch.start_date) && <span><CalendarDays size={14} aria-hidden="true" /> Starts {formatDate(batch.start_date)}</span>}
                {batch.branches && <span><MapPin size={14} aria-hidden="true" /> {batch.branches.name}</span>}
                {batch.seatsAvailable !== null && <span><Users size={14} aria-hidden="true" /> {batch.seatsAvailable > 0 ? `${batch.seatsAvailable} seats left` : "Waiting list"}</span>}
              </small>
            </li>)}
          </ul> : <p className="admissions-empty"><ClipboardList size={18} aria-hidden="true" /> New batches are being scheduled. Apply now and we will call you as soon as the next batch for your course opens.</p>}
          <div className="admissions-help">
            <p>Questions before applying?</p>
            {contact.phones.map(phone => <a key={phone.tel} href={`tel:${phone.tel}`}><PhoneCall size={15} /> {phone.display}</a>)}
            <a href={whatsappLink("Hello EduPulse Academy, I have a question about admissions.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp us</a>
          </div>
        </div>
      </aside>
    </section>

    <section className="course-band contact-steps-band" aria-labelledby="steps-title">
      <div className="page-container">
        <div className="course-section-head">
          <p className="section-kicker">HOW ADMISSION WORKS</p>
          <h2 id="steps-title">From application to <span>your first class.</span></h2>
        </div>
        <ul className="courses-steps-list">
          {steps.map(({ title, text, icon: StepIcon }, i) => <li key={title}>
            <span className="courses-step-icon"><StepIcon size={22} /><span>{i + 1}</span></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>)}
        </ul>
      </div>
    </section>
  </div>;
}

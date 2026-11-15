import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, Trophy, UserRound } from "lucide-react";
import type { ApiFaculty } from "@/lib/api";
import type { HomeResults } from "@/lib/home-content";
import { departmentId, faculty as departments } from "@/lib/team";

/** "Results & achievements": only rendered when the academy has published real results. */
export function ResultsSection({ results }: { results: HomeResults }) {
  if (!results.achievements.length && !results.highlights.length) return null;
  return <section id="results" className="home-section page-container" aria-labelledby="results-title">
    <p className="section-kicker">RESULTS &amp; ACHIEVEMENTS</p>
    <h2 id="results-title">{results.heading ?? <>Our students, <span>their milestones.</span></>}</h2>
    <p className="section-intro">Every result here is a student who put in the work, with teachers who walked the path with them.</p>

    {results.highlights.length > 0 && <dl className="results-highlights">
      {results.highlights.map(h => <div key={`${h.value}-${h.label}`}><dt>{h.label}</dt><dd>{h.value}</dd></div>)}
    </dl>}

    {results.achievements.length > 0 && <ul className="achievements-grid">
      {results.achievements.map((a, i) => <li key={`${a.name}-${i}`} className="achievement-card">
        <span className="achievement-icon" aria-hidden="true"><Trophy size={20} /></span>
        <span className="achievement-text">
          <strong>{a.name}</strong>
          <span>{a.achievement}</span>
          {a.tag && <small>{a.tag}</small>}
        </span>
      </li>)}
    </ul>}
  </section>;
}

/** Up to four teachers from their LMS profiles; the subject departments until profiles are filled in. */
export function FacultySection({ teachers }: { teachers: ApiFaculty[] }) {
  const shown = teachers.slice(0, 4);
  return <section id="faculty" className="home-section page-container" aria-labelledby="home-faculty-title">
    <p className="section-kicker">OUR FACULTY</p>
    <h2 id="home-faculty-title">Mentors who know <span>the exams inside out.</span></h2>
    <p className="section-intro">Experienced teachers for every subject, from Class 6 foundations to entrance exams.</p>

    {shown.length > 0
      ? <ul className="home-faculty-grid">
        {shown.map(t => {
          const subjects = [...new Set(t.batch_faculty.map(b => b.subjects.name))];
          return <li key={t.user_id} className="home-teacher">
            <span className="home-teacher-photo">
              {t.users.photo_url
                ? <Image src={t.users.photo_url} alt={`Portrait of ${t.users.full_name}`} fill sizes="88px" />
                : <UserRound size={34} strokeWidth={1.4} aria-hidden="true" />}
            </span>
            <strong>{t.users.full_name}</strong>
            {t.qualification && <small>{t.qualification}</small>}
            {(t.specialization || subjects.length > 0) && <span className="home-teacher-subjects">{t.specialization ?? subjects.join(", ")}</span>}
          </li>;
        })}
      </ul>
      : <ul className="home-departments">
        {departments.map(d => <li key={d.department}>
          <Link href={`/faculty#${departmentId(d.department)}`}><d.icon size={20} aria-hidden="true" /><span>{d.department}<small>{d.subjects.slice(0, 3).join(" · ")}</small></span></Link>
        </li>)}
      </ul>}

    <p className="home-section-link"><Link className="text-link" href="/faculty"><GraduationCap size={17} /> Meet all our faculty <ArrowRight size={17} /></Link></p>
  </section>;
}

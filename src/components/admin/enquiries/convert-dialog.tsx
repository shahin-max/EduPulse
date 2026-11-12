"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { passwordLink, studentsApi, usersApi, type StudentProfileInput } from "@/lib/admin-api";
import { enquiriesApi, type Enquiry } from "@/lib/admin-ops-api";
import { CopyField } from "../user-dialogs";
import { ErrorAlert, errorText, Field, Optional } from "../ui";

/** Create a STUDENT account prefilled from an enquiry, then mark the enquiry CONVERTED. */
export function ConvertDialog({ enquiry, open, onOpenChange, onConverted }: {
  enquiry: Enquiry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: (enquiry: Enquiry) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <ConvertForm enquiry={enquiry} onConverted={onConverted} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

/**
 * The website's admission form writes details as "Label: value" lines in the message; pick them up
 * so staff do not retype them. The admission form asks for the parent's mobile, so that is also the
 * guardian's; the callback form's number may be the student's own.
 */
function profileFromEnquiry(enquiry: Enquiry) {
  const line = (label: RegExp) => (enquiry.message ?? "").split(/\r?\n/).map(l => l.trim()).find(l => label.test(l))?.replace(label, "").trim() ?? "";
  return {
    grade: line(/^class\s*\/\s*grade:\s*/i),
    schoolName: line(/^school:\s*/i),
    guardianName: line(/^parent\s*\/\s*guardian:\s*/i),
    guardianMobile: enquiry.source === "WEBSITE_ADMISSION" ? enquiry.mobile : "",
  };
}

function ConvertForm({ enquiry, onConverted, onClose }: { enquiry: Enquiry; onConverted: (enquiry: Enquiry) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [fullName, setFullName] = useState(enquiry.student_name);
  const [mobile, setMobile] = useState(enquiry.mobile);
  const [email, setEmail] = useState(enquiry.email ?? "");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState(() => profileFromEnquiry(enquiry));
  const setField = (key: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) => setProfile(p => ({ ...p, [key]: e.target.value }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: number; name: string; link?: string; statusError?: string; profileError?: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() && !mobile.trim()) return setError("Enter an email address or a mobile number.");
    setBusy(true);
    setError("");
    try {
      const created = await withToken(token => usersApi.create(token, {
        fullName: fullName.trim(), email: email.trim() || undefined, mobile: mobile.trim() || undefined, password: password || undefined, roles: ["STUDENT"],
      }));
      // Profile details are optional and saved separately; a failure here keeps the new account.
      let profileError: string | undefined;
      const details: StudentProfileInput = Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
      if (Object.keys(details).length) {
        if (details.guardianMobile) details.guardianMobile = details.guardianMobile.replace(/[\s-]/g, "");
        try {
          await withToken(token => studentsApi.updateProfile(token, created.id, details));
        } catch (e) {
          profileError = errorText(e, "Could not save the student details.");
        }
      }
      let statusError: string | undefined;
      try {
        const updated = await withToken(token => enquiriesApi.update(token, enquiry.id, { status: "CONVERTED" }));
        onConverted(updated);
      } catch (e) {
        statusError = errorText(e, "Could not mark the enquiry as converted.");
      }
      toast.success(`${created.full_name} added as a student`);
      setDone({ id: created.id, name: created.full_name, link: created.setupToken && passwordLink(created.setupToken), statusError, profileError });
    } catch (e) {
      setError(errorText(e, "Could not create the student."));
    } finally {
      setBusy(false);
    }
  }

  if (done) return <>
    <DialogHeader>
      <DialogTitle>Student created</DialogTitle>
      <DialogDescription>{done.name} now has a student account{done.statusError ? "." : " and the enquiry is marked converted."}</DialogDescription>
    </DialogHeader>
    {done.statusError && <ErrorAlert title="Enquiry not updated" message={`${done.statusError} Set the status to Converted manually.`} />}
    {done.profileError && <ErrorAlert title="Student details not saved" message={`${done.profileError} Add them on the student's page.`} />}
    {done.link ? <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">No password was set, so the account is <strong className="text-foreground">pending</strong>. Send this one-time link so they can choose a password. It expires in 1 hour.</p>
      <CopyField value={done.link} label="Password setup link" />
    </div> : <p className="text-sm text-muted-foreground">The account is active and can log in with the password you set.</p>}
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Done</Button>
      <Button asChild><Link href={`/admin/users/${done.id}`} onClick={onClose}>View student</Link></Button>
    </DialogFooter>
  </>;

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Convert to student</DialogTitle>
      <DialogDescription>Create a student account from this enquiry. The enquiry is then marked converted.</DialogDescription>
    </DialogHeader>
    <Field id="cv-name" label="Full name">
      <Input id="cv-name" required minLength={2} maxLength={160} value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="off" />
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="cv-mobile" label="Mobile">
        <Input id="cv-mobile" type="tel" pattern="\+?[0-9 ]{10,20}" title="10-15 digit phone number" value={mobile} onChange={e => setMobile(e.target.value)} autoComplete="off" />
      </Field>
      <Field id="cv-email" label={<>Email <Optional /></>}>
        <Input id="cv-email" type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />
      </Field>
    </div>
    <Field id="cv-password" label={<>Password <Optional /></>} hint="Leave empty to get a setup link the student opens to choose their own password.">
      <Input id="cv-password" type="password" autoComplete="new-password" pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" title="At least 8 characters, with a letter and a number" value={password} onChange={e => setPassword(e.target.value)} />
    </Field>
    <fieldset className="grid gap-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">Student details <Optional /></legend>
      <p className="-mt-1 text-xs text-muted-foreground">Filled in from the enquiry where possible. Check them before creating the account.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cv-grade" label="Class / grade"><Input id="cv-grade" maxLength={30} value={profile.grade} onChange={setField("grade")} autoComplete="off" /></Field>
        <Field id="cv-school" label="School"><Input id="cv-school" maxLength={160} value={profile.schoolName} onChange={setField("schoolName")} autoComplete="off" /></Field>
        <Field id="cv-guardian" label="Parent / guardian"><Input id="cv-guardian" maxLength={160} value={profile.guardianName} onChange={setField("guardianName")} autoComplete="off" /></Field>
        <Field id="cv-guardian-mobile" label="Guardian mobile"><Input id="cv-guardian-mobile" type="tel" pattern="\+?[0-9 \-]{10,20}" title="10-15 digit phone number" value={profile.guardianMobile} onChange={setField("guardianMobile")} autoComplete="off" /></Field>
      </div>
    </fieldset>
    <p className="text-xs text-muted-foreground">Role: <strong className="text-foreground">Student</strong>.</p>
    {error && <ErrorAlert title="Could not create student" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Create student</Button>
    </DialogFooter>
  </form>;
}

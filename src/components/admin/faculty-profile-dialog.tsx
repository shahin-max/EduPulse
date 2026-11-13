"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { json, type FacultyProfile } from "@/lib/admin-api";
import { ErrorAlert, errorText, Field, Optional } from "./ui";

/** Fields an admin can set on a faculty profile (PATCH /faculty/:userId). Send only what changes. */
type FacultyProfileInput = { qualification?: string; specialization?: string; biography?: string; employeeCode?: string; joinedOn?: string };

const FIELDS = [
  { key: "employeeCode", column: "employee_code", label: "Employee code", maxLength: 40 },
  { key: "joinedOn", column: "joined_on", label: "Joined on", type: "date" },
  { key: "qualification", column: "qualification", label: "Qualification", maxLength: 255, placeholder: "M.Sc. Physics, B.Ed." },
  { key: "specialization", column: "specialization", label: "Specialization", maxLength: 255, placeholder: "Mechanics for JEE" },
] as const;

export function FacultyProfileDialog({ userId, profile, open, onOpenChange, onSaved }: {
  userId: number;
  profile: FacultyProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <FacultyProfileForm userId={userId} profile={profile} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function FacultyProfileForm({ userId, profile, onSaved, onClose }: { userId: number; profile: FacultyProfile; onSaved: () => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const initial = (column: keyof FacultyProfile) => (column === "joined_on" ? profile.joined_on?.slice(0, 10) : profile[column]) ?? "";
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(f => [f.key, initial(f.column)])));
  const [biography, setBiography] = useState(profile.biography ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patch: FacultyProfileInput = {};
    for (const f of FIELDS) {
      const value = values[f.key].trim();
      if (value === initial(f.column)) continue;
      if (!value && (f.key === "employeeCode" || f.key === "joinedOn")) return setError(`${f.label} cannot be removed once saved; enter a new value instead.`);
      patch[f.key] = value;
    }
    if (biography !== (profile.biography ?? "")) patch.biography = biography;
    if (!Object.keys(patch).length) return onClose();
    setBusy(true);
    setError("");
    try {
      await withToken(token => request(`/faculty/${userId}`, { token, ...json("PATCH", patch) }));
      toast.success("Faculty details saved");
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the faculty details."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Faculty details</DialogTitle>
      <DialogDescription>Teachers can edit their qualification, specialization and introduction themselves. Filled-in profiles appear on the website&apos;s Faculty page.</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map(f => <Field key={f.key} id={`fp-${f.key}`} label={<>{f.label} <Optional /></>}>
        <Input id={`fp-${f.key}`} type={"type" in f ? f.type : "text"} maxLength={"maxLength" in f ? f.maxLength : undefined}
          placeholder={"placeholder" in f ? f.placeholder : undefined}
          value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} autoComplete="off" />
      </Field>)}
      <Field id="fp-bio" label={<>Introduction <Optional /></>} className="sm:col-span-2" hint={`${biography.length.toLocaleString("en-IN")} / 5,000 characters`}>
        <Textarea id="fp-bio" maxLength={5000} rows={5} value={biography} onChange={e => setBiography(e.target.value)} />
      </Field>
    </div>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter className="gap-2">
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save</Button>
    </DialogFooter>
  </form>;
}

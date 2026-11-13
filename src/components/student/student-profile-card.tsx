"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { json, type StudentProfile } from "@/lib/admin-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, errorText, Field, formatDate, Optional } from "@/components/admin/ui";

/** Fields students may change themselves (PATCH /students/me); admission number and joining date are set by the office. */
type StudentSelfInput = { dateOfBirth?: string; grade?: string; schoolName?: string; guardianName?: string; guardianMobile?: string; address?: string };

const FIELDS = [
  { key: "grade", column: "grade", label: "Class / grade", maxLength: 30, placeholder: "11" },
  { key: "schoolName", column: "school_name", label: "School", maxLength: 160, placeholder: "City Public School" },
  { key: "dateOfBirth", column: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "guardianName", column: "guardian_name", label: "Parent / guardian", maxLength: 160 },
  { key: "guardianMobile", column: "guardian_mobile", label: "Guardian mobile", type: "tel", placeholder: "98765 43210" },
] as const;

const loadProfile = (token: string) => request<StudentProfile>("/students/me", { token });

/** The student's own details on "My profile". */
export function StudentProfileCard() {
  const { data, error, loading, reload, setData } = useAdminData(loadProfile, "student-me");
  const [editing, setEditing] = useState(false);

  return <Card className="lg:row-span-2">
    <CardHeader>
      <CardTitle>Student details</CardTitle>
      <CardDescription>Your class, school and guardian. The academy uses these to reach your family.</CardDescription>
      {data && !editing && <CardAction><Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Button></CardAction>}
    </CardHeader>
    <CardContent>
      {loading && !data && <div className="grid gap-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-5 w-3/4" /></div>}
      {error && !data && <ErrorAlert message={error} onRetry={reload} />}
      {data && (editing
        ? <ProfileForm profile={data} onSaved={p => { setData(p); setEditing(false); }} onCancel={() => setEditing(false)} />
        : <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["Admission no.", data.admission_number],
            ["Class / grade", data.grade],
            ["School", data.school_name],
            ["Date of birth", data.date_of_birth && formatDate(data.date_of_birth)],
            ["Parent / guardian", data.guardian_name],
            ["Guardian mobile", data.guardian_mobile],
            ["Joined on", data.joined_on && formatDate(data.joined_on)],
            ["Address", data.address],
          ].map(([label, value]) => <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium break-words">{value || "—"}</dd>
          </div>)}
        </dl>)}
    </CardContent>
  </Card>;
}

function ProfileForm({ profile, onSaved, onCancel }: { profile: StudentProfile; onSaved: (p: StudentProfile) => void; onCancel: () => void }) {
  const { withToken } = useAuth();
  const initial = (column: keyof StudentProfile) => (column === "date_of_birth" ? profile.date_of_birth?.slice(0, 10) : profile[column]) ?? "";
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(f => [f.key, initial(f.column)])));
  const [address, setAddress] = useState(profile.address ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const patch: StudentSelfInput = {};
    for (const f of FIELDS) {
      const value = values[f.key].trim();
      if (value === initial(f.column)) continue;
      if (!value) return setError(`${f.label} cannot be removed once saved; enter a new value instead.`);
      patch[f.key] = f.key === "guardianMobile" ? value.replace(/[\s-]/g, "") : value;
    }
    if (address.trim() !== (profile.address ?? "")) {
      if (!address.trim()) return setError("Address cannot be removed once saved; enter a new value instead.");
      patch.address = address.trim();
    }
    if (!Object.keys(patch).length) return onCancel();
    setSaving(true);
    setError("");
    try {
      onSaved(await withToken(token => request<StudentProfile>("/students/me", { token, ...json("PATCH", patch) })));
      toast.success("Details saved");
    } catch (e) {
      setError(errorText(e, "Could not save your details."));
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map(f => <Field key={f.key} id={`st-${f.key}`} label={<>{f.label} <Optional /></>}>
        <Input id={`st-${f.key}`} type={"type" in f ? f.type : "text"} maxLength={"maxLength" in f ? f.maxLength : undefined}
          placeholder={"placeholder" in f ? f.placeholder : undefined}
          max={f.key === "dateOfBirth" ? new Date().toISOString().slice(0, 10) : undefined}
          value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
      </Field>)}
      <Field id="st-address" label={<>Address <Optional /></>} className="sm:col-span-2">
        <Textarea id="st-address" maxLength={2000} rows={3} value={address} onChange={e => setAddress(e.target.value)} />
      </Field>
    </div>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save</Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
    </div>
  </form>;
}

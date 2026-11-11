"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, GraduationCap, LayoutDashboard, Loader2, LogOut, Mail, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { authApi, homeFor, type RegisterInput } from "@/lib/api";

/** Same rule as PASSWORD_REGEX in the API: 8-72 characters with a letter and a number. */
const PASSWORD_PATTERN = "(?=.*[A-Za-z])(?=.*\\d).{8,72}";
const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

function AuthCard({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <section className="auth-page page-container">
    <div className="auth-card">
      <span className="auth-card-glow" aria-hidden="true" />
      <span className="program-icon"><GraduationCap size={26} /></span>
      <p className="section-kicker">EDUPULSE STUDENT PORTAL</p>
      <h1>{title}</h1>
      <p className="auth-intro">{intro}</p>
      {children}
    </div>
  </section>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="auth-error" role="alert"><AlertCircle size={16} aria-hidden="true" /> {message}</p>;
}

function PasswordInput(props: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return <span className="auth-password">
    <input {...props} type={visible ? "text" : "password"} />
    <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
  </span>;
}

/** Sends a signed-in visitor to their home: the admin portal for admins, the dashboard for everyone else. */
function useRedirectWhenSignedIn() {
  const { status, user } = useAuth();
  const router = useRouter();
  useEffect(() => { if (status === "authenticated") router.replace(homeFor(user)); }, [status, user, router]);
}

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useRedirectWhenSignedIn();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      // useRedirectWhenSignedIn navigates once the session is stored.
      await login({ login: String(data.get("login")).trim(), password: String(data.get("password")) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed. Please try again.");
      setBusy(false);
    }
  }

  return <AuthCard title="Welcome back." intro="Log in with the email address or mobile number you registered with.">
    <form className="enquiry-form auth-form" onSubmit={submit}>
      <label>Email or mobile<input name="login" required autoComplete="username" minLength={3} maxLength={254} placeholder="you@example.com or 98765 43210" /></label>
      <label>Password<PasswordInput name="password" required autoComplete="current-password" maxLength={72} placeholder="Your password" /></label>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Logging in...</> : <>Log in <ArrowRight /></>}</Button>
      <p className="enquiry-hint">New to EduPulse? <Link href="/register">Create a student account</Link></p>
    </form>
  </AuthCard>;
}

export function RegisterForm() {
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useRedirectWhenSignedIn();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    // Empty optional fields are left out: the API rejects an empty string for email or mobile.
    const optional = (key: string) => get(key) || undefined;
    const input: RegisterInput = {
      fullName: get("fullName"),
      email: optional("email"),
      mobile: optional("mobile"),
      password: String(data.get("password")),
      grade: optional("grade"),
      schoolName: optional("schoolName"),
    };
    if (!input.email && !input.mobile) return setError("Enter an email address or a mobile number.");
    if (input.password !== String(data.get("confirmPassword"))) return setError("The two passwords do not match.");

    setBusy(true);
    setError("");
    try {
      await register(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed. Please try again.");
      setBusy(false);
    }
  }

  return <AuthCard title="Join EduPulse." intro="Create your student account to follow your batches, classes, exams and fees in one place.">
    <form className="enquiry-form auth-form" onSubmit={submit}>
      <label>Full name<input name="fullName" required autoComplete="name" minLength={2} maxLength={160} placeholder="Student's full name" /></label>
      <div className="enquiry-row">
        <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
        <label>Mobile<input name="mobile" type="tel" inputMode="tel" autoComplete="tel" pattern="\+?[0-9 ]{10,20}" title="10-15 digit phone number" placeholder="98765 43210" /></label>
      </div>
      <p className="auth-note">Email or mobile is required; you can log in with either.</p>
      <div className="enquiry-row">
        <label><span className="label-text">Class / grade <span>(optional)</span></span><input name="grade" maxLength={30} placeholder="e.g. 9 or 12 (PCM)" /></label>
        <label><span className="label-text">School <span>(optional)</span></span><input name="schoolName" minLength={2} maxLength={160} placeholder="School name" /></label>
      </div>
      <div className="enquiry-row">
        <label>Password<PasswordInput name="password" required autoComplete="new-password" pattern={PASSWORD_PATTERN} title={PASSWORD_HINT} placeholder="Create a password" /></label>
        <label>Confirm password<PasswordInput name="confirmPassword" required autoComplete="new-password" placeholder="Repeat password" /></label>
      </div>
      <p className="auth-note">{PASSWORD_HINT}</p>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Creating account...</> : <>Create account <ArrowRight /></>}</Button>
      <p className="enquiry-hint">Already registered? <Link href="/login">Log in</Link></p>
    </form>
  </AuthCard>;
}

export function Dashboard() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  useEffect(() => { if (status === "anonymous") router.replace("/login"); }, [status, router]);

  if (!user) return <section className="auth-page page-container"><p className="auth-loading"><Loader2 className="animate-spin" /> Loading your account...</p></section>;

  return <AuthCard title={`Hello, ${user.full_name.split(" ")[0]}.`} intro="You are signed in. Your batches, classes and results will appear here as the portal grows.">
    <ul className="auth-details">
      {user.email && <li><Mail size={17} /><span>{user.email}<small>{user.email_verified_at ? "Verified" : "Not verified yet"}</small></span></li>}
      {user.mobile && <li><Phone size={17} /><span>{user.mobile}<small>{user.mobile_verified_at ? "Verified" : "Not verified yet"}</small></span></li>}
      <li><ShieldCheck size={17} /><span>{user.roles.map(role => role[0] + role.slice(1).toLowerCase()).join(", ")}<small>Account type</small></span></li>
    </ul>
    {user.roles.includes("ADMIN") && <Button asChild size="lg" className="auth-logout"><Link href="/admin"><LayoutDashboard /> Open admin portal</Link></Button>}
    <Button variant="outline" size="lg" className="auth-logout" onClick={async () => { await logout(); router.replace("/login"); }}><LogOut /> Log out</Button>
  </AuthCard>;
}

/** Opened from a link the academy shares: /set-password?token=... (new staff accounts and password resets). */
export function SetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirmPassword"))) return setError("The two passwords do not match.");
    setBusy(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set the password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!/^[0-9a-f]{64}$/i.test(token)) return <AuthCard title="Link not valid." intro="This password link is incomplete. Ask the academy for a new one, or use the full link you were sent.">
    <Button asChild size="lg" className="auth-logout"><Link href="/login">Go to login</Link></Button>
  </AuthCard>;

  if (done) return <AuthCard title="Password set." intro="Your password has been saved and your account is active. You can log in now.">
    <p className="enquiry-status" role="status"><CheckCircle2 size={16} aria-hidden="true" /> Any devices that were signed in have been signed out.</p>
    <Button asChild size="lg" className="auth-logout"><Link href="/login">Log in <ArrowRight /></Link></Button>
  </AuthCard>;

  return <AuthCard title="Set your password." intro="Choose a password for your EduPulse account. This link works once and expires after a short time.">
    <form className="enquiry-form auth-form" onSubmit={submit}>
      <label>New password<PasswordInput name="password" required autoComplete="new-password" pattern={PASSWORD_PATTERN} title={PASSWORD_HINT} placeholder="Create a password" /></label>
      <label>Confirm password<PasswordInput name="confirmPassword" required autoComplete="new-password" placeholder="Repeat password" /></label>
      <p className="auth-note">{PASSWORD_HINT}</p>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Saving...</> : <>Save password <ArrowRight /></>}</Button>
    </form>
  </AuthCard>;
}

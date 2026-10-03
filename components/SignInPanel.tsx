"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import styles from "./SignInPanel.module.css";

type Mode = "signin" | "signup" | "reset";

export default function SignInPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const configured = isSupabaseConfigured();

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    if (next === "reset") setPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!configured) {
      setError("Accounts aren't connected on this deployment yet.");
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter the email address you want to use with FPL Prism.");
      return;
    }
    if (mode !== "reset" && password.length < 8) {
      setError("Enter a password with at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin;

      if (mode === "reset") {
        const redirectTo = `${siteOrigin}/auth/callback?next=/reset-password`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
        if (resetError) throw resetError;
        setMessage("Password reset link sent. Open the email on this device, then choose a new password.");
        return;
      }

      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) throw authError;
        router.push("/account");
        router.refresh();
        return;
      }

      const redirectTo = `${siteOrigin}/auth/callback?next=/account`;
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (authError) throw authError;
      if (data.session) {
        router.push("/account");
        router.refresh();
      } else {
        setMessage("Account created. Check your email to confirm it, then come back and sign in.");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not complete that account action.");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "signin" ? "Sign in to FPL Prism" : mode === "signup" ? "Create an FPL Prism account" : "Reset your FPL Prism password";

  return (
    <main className="page">
      <div className={styles.layout}>
        <section className={styles.copy}>
          <h1>Account</h1>
          <p className="lead" style={{ marginTop: 8 }}>
            An account is optional. It saves your Team ID, default free transfers and planner style so they follow you to other devices.
            Every tool works without one.
          </p>
          <ul className={styles.points}>
            <li>This is a separate FPL Prism login, not your official FPL account.</li>
            <li>Never use or enter your FPL password here.</li>
            <li>No payment details are ever requested.</li>
          </ul>
          <p style={{ marginTop: 16 }}><Link href="/dashboard">Continue without an account</Link></p>
        </section>

        <section className="card">
          {mode !== "reset" && (
            <div className="segmented" role="tablist" aria-label="Account action" style={{ marginBottom: 16 }}>
              <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => switchMode("signin")}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>Create account</button>
            </div>
          )}
          <h2>{heading}</h2>
          {mode === "reset" && <p className="muted small" style={{ marginTop: 4 }}>We&apos;ll email you a link to choose a new password.</p>}

          {!configured && (
            <div className="notice notice-neutral" style={{ marginTop: 14 }}>
              Accounts aren&apos;t connected on this deployment yet, so sign-in is unavailable. You can still use every tool as a guest.
            </div>
          )}

          <form onSubmit={submit} className="stack" style={{ marginTop: 16 }} noValidate>
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required disabled={!configured} />
            </div>
            {mode !== "reset" && (
              <div className="field">
                <label htmlFor="auth-password">FPL Prism password</label>
                <input id="auth-password" className="input" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required disabled={!configured} aria-describedby="auth-password-hint" />
                <span id="auth-password-hint" className="field-hint">{mode === "signup" ? "Choose a new password. Don't reuse your FPL password." : "The password you created for FPL Prism, not your FPL one."}</span>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy || !configured}>
              {busy ? "Working…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
            {mode === "signin" && <button type="button" className="link-button small" style={{ alignSelf: "flex-start" }} onClick={() => switchMode("reset")}>Forgot password?</button>}
            {mode === "reset" && <button type="button" className="link-button small" style={{ alignSelf: "flex-start" }} onClick={() => switchMode("signin")}>Back to sign in</button>}
          </form>

          {error && <div className="notice notice-bad" role="alert" style={{ marginTop: 14 }}>{error}</div>}
          {message && <div className="notice notice-good" role="status" style={{ marginTop: 14 }}>{message}</div>}
          {mode === "signup" && <p className="small muted" style={{ marginTop: 14 }}>By creating an account you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>}
        </section>
      </div>
    </main>
  );
}

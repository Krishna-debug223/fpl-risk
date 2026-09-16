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
      setError("Cloud accounts are not connected to this deployment yet.");
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter the email address you want to use with FPL Risk.");
      return;
    }
    if (mode !== "reset" && password.length < 8) {
      setError("Enter a password with at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();

      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
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

      const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
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

  const heading = mode === "signin"
    ? "Continue your FPL Risk setup"
    : mode === "signup"
      ? "Save your FPL Risk setup"
      : "Reset your password";
  const cardCopy = mode === "signin"
    ? "Use the email and password you created for FPL Risk."
    : mode === "signup"
      ? "Create a free account. No payment details are required."
      : "We will email a secure recovery link. Your FPL Risk tools remain usable as a guest while you wait.";

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span>FR</span>
          <div><strong>FPL RISK</strong><small>Decision analytics</small></div>
        </Link>
        <nav className={styles.topNav}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/planner">8-GW Planner</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </header>

      <section className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>WELCOME TO FPL RISK</p>
          <h1>Save your setup.<br />Or jump straight in.</h1>
          <p>Sign in if you want your Team ID and planning defaults saved across sessions. You never need an account to use the live model, Transfer Lab, Player Market or Path Planner.</p>
          <ul>
            <li><i>✓</i><span>All current FPL Risk tools remain available without signing in.</span></li>
            <li><i>✓</i><span>Your account stores only the preferences you choose to save.</span></li>
            <li><i>✓</i><span>Signing in never requires your official FPL password.</span></li>
          </ul>
          <div className={styles.guestActions}>
            <Link href="/dashboard" className={styles.guest}>Don&apos;t sign in — continue as guest →</Link>
            <Link href="/pricing" className={styles.secondaryLink}>View pricing</Link>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.tabs}>
            <button className={mode === "signin" ? styles.active : ""} type="button" onClick={() => switchMode("signin")}>Sign in</button>
            <button className={mode === "signup" ? styles.active : ""} type="button" onClick={() => switchMode("signup")}>Create account</button>
          </div>
          <span className={styles.cardEyebrow}>{mode === "signin" ? "WELCOME BACK" : mode === "signup" ? "FREE ACCOUNT" : "ACCOUNT RECOVERY"}</span>
          <h2>{heading}</h2>
          <p className={styles.cardCopy}>{cardCopy}</p>

          <form onSubmit={submit}>
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            {mode !== "reset" && <>
              <label htmlFor="auth-password">Password</label>
              <input id="auth-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8+ characters" minLength={8} required />
            </>}
            {mode === "signin" && <button className={styles.resetLink} type="button" onClick={() => switchMode("reset")}>Forgot password?</button>}
            {mode === "reset" && <button className={styles.resetLink} type="button" onClick={() => switchMode("signin")}>← Back to sign in</button>}
            <button type="submit" disabled={busy || !configured}>{busy ? "Working…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create free account" : "Send reset link"}</button>
          </form>

          {!configured && <div className={styles.configNotice}><strong>Account backend setup required.</strong><span>The account experience is deployed, but authentication stays disabled until the production Supabase project URL and publishable key are connected.</span></div>}
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}
          <div className={styles.legal}>By creating an account, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</div>
          <Link href="/dashboard" className={styles.mobileGuest}>Continue without signing in</Link>
        </div>
      </section>
    </main>
  );
}

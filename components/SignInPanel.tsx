"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import styles from "./SignInPanel.module.css";

type Mode = "signin" | "signup";

export default function SignInPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!configured) {
      setError("Cloud accounts are not connected to this deployment yet.");
      return;
    }
    if (!email.trim() || password.length < 8) {
      setError("Enter your email and a password with at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        router.push("/account");
        router.refresh();
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
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
      setError(authError instanceof Error ? authError.message : "Could not complete sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span>FR</span>
          <div><strong>FPL RISK</strong><small>Decision analytics</small></div>
        </Link>
        <Link href="/pricing" className={styles.pricing}>Pricing</Link>
      </header>

      <section className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>OPTIONAL ACCOUNT</p>
          <h1>Save your setup.<br />Keep the product free.</h1>
          <p>FPL Risk does not require an account. Sign in only if you want your Team ID and planning defaults saved to your account for future sessions.</p>
          <ul>
            <li><i>✓</i><span>All current FPL Risk tools remain available without signing in.</span></li>
            <li><i>✓</i><span>Your account stores only the preferences you choose to save.</span></li>
            <li><i>✓</i><span>Signing in does not give FPL Risk your official FPL password.</span></li>
          </ul>
          <Link href="/" className={styles.guest}>Don&apos;t sign in — continue as guest →</Link>
        </div>

        <div className={styles.card}>
          <div className={styles.tabs}>
            <button className={mode === "signin" ? styles.active : ""} type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button>
            <button className={mode === "signup" ? styles.active : ""} type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button>
          </div>
          <span className={styles.cardEyebrow}>{mode === "signin" ? "WELCOME BACK" : "FREE ACCOUNT"}</span>
          <h2>{mode === "signin" ? "Continue your FPL Risk setup" : "Save your FPL Risk setup"}</h2>
          <p className={styles.cardCopy}>{mode === "signin" ? "Use the email and password you created for FPL Risk." : "Create a free account. No payment details are required."}</p>

          <form onSubmit={submit}>
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8+ characters" minLength={8} required />
            <button type="submit" disabled={busy || !configured}>{busy ? "Working…" : mode === "signin" ? "Sign in" : "Create free account"}</button>
          </form>

          {!configured && <div className={styles.configNotice}><strong>Account backend setup required.</strong><span>The sign-in UI is live, but this deployment still needs its Supabase project URL and publishable key connected before accounts can authenticate.</span></div>}
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}
          <div className={styles.legal}>By creating an account, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</div>
          <Link href="/" className={styles.mobileGuest}>Continue without signing in</Link>
        </div>
      </section>
    </main>
  );
}

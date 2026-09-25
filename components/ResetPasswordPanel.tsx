"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import styles from "./SignInPanel.module.css";
import LegalFooter from "./LegalFooter";

export default function ResetPasswordPanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!configured) {
      setError("Cloud accounts are not connected to this deployment yet.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Password updated. Taking you to your account…");
      window.setTimeout(() => {
        router.push("/account");
        router.refresh();
      }, 650);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>SECURE RECOVERY</p>
          <h1>Choose a new<br />password.</h1>
          <p>This page is only useful after opening the recovery email sent by FPL Prism. Your FPL tools remain available even if you decide not to finish the reset.</p>
          <Link href="/" className={styles.guest}>Continue as guest →</Link>
        </div>

        <div className={styles.card}>
          <span className={styles.cardEyebrow}>NEW PASSWORD</span>
          <h2>Reset your FPL Prism password</h2>
          <p className={styles.cardCopy}>Enter a new password for your optional FPL Prism account.</p>
          <form onSubmit={submit}>
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8+ characters" required />
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" required />
            <button type="submit" disabled={busy || !configured}>{busy ? "Updating…" : "Update password"}</button>
          </form>
          {!configured && <div className={styles.configNotice}><strong>Account backend setup required.</strong><span>Password recovery will activate as soon as the production Supabase project is connected.</span></div>}
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}
          <div className={styles.legal}>Didn&apos;t request a reset? You can safely leave this page and <Link href="/">continue as a guest</Link>.</div>
        </div>
      </section>
      <LegalFooter />
    </main>
  );
}

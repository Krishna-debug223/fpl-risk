"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import styles from "./SignInPanel.module.css";

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
      setError("Accounts aren't connected on this deployment yet.");
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
    <main className="page">
      <div className={styles.layout}>
        <section className={styles.copy}>
          <h1>Choose a new password</h1>
          <p className="lead" style={{ marginTop: 8 }}>
            This page works after you open the reset link we emailed. It changes your FPL Prism password only — your official FPL login is not affected.
          </p>
          <p style={{ marginTop: 16 }}><Link href="/dashboard">Continue without an account</Link></p>
        </section>

        <section className="card">
          <h2>New FPL Prism password</h2>
          {!configured && (
            <div className="notice notice-neutral" style={{ marginTop: 14 }}>
              Accounts aren&apos;t connected on this deployment yet, so password reset is unavailable.
            </div>
          )}
          <form onSubmit={submit} className="stack" style={{ marginTop: 16 }} noValidate>
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" className="input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required disabled={!configured} />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" className="input" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat it" required disabled={!configured} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || !configured}>{busy ? "Updating…" : "Update password"}</button>
          </form>
          {error && <div className="notice notice-bad" role="alert" style={{ marginTop: 14 }}>{error}</div>}
          {message && <div className="notice notice-good" role="status" style={{ marginTop: 14 }}>{message}</div>}
          <p className="small muted" style={{ marginTop: 14 }}>
            If the link has expired, <Link href="/sign-in">request a new one</Link> from the sign-in page.
          </p>
        </section>
      </div>
    </main>
  );
}

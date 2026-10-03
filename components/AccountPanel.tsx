"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  initialTeamId: string;
  initialFreeTransfers: number;
  initialStrategyMode: "safe" | "balanced" | "aggressive";
};

export default function AccountPanel({
  email,
  initialTeamId,
  initialFreeTransfers,
  initialStrategyMode,
}: Props) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(initialTeamId);
  const [freeTransfers, setFreeTransfers] = useState(initialFreeTransfers);
  const [strategyMode, setStrategyMode] = useState(initialStrategyMode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialTeamId) window.localStorage.setItem("fpl-risk-team-id", initialTeamId);
    else window.localStorage.removeItem("fpl-risk-team-id");
    window.localStorage.setItem("fpl-risk-free-transfers", String(initialFreeTransfers));
    window.localStorage.setItem("fpl-risk-strategy-mode", initialStrategyMode);
  }, [initialFreeTransfers, initialStrategyMode, initialTeamId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const normalizedTeamId = teamId.trim();
      if (normalizedTeamId && !/^\d+$/.test(normalizedTeamId)) {
        throw new Error("Team IDs are numbers only, for example 123456.");
      }
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          fpl_team_id: normalizedTeamId,
          default_free_transfers: freeTransfers,
          strategy_mode: strategyMode,
        },
      });
      if (updateError) throw updateError;

      if (normalizedTeamId) window.localStorage.setItem("fpl-risk-team-id", normalizedTeamId);
      else window.localStorage.removeItem("fpl-risk-team-id");
      window.localStorage.setItem("fpl-risk-free-transfers", String(freeTransfers));
      window.localStorage.setItem("fpl-risk-strategy-mode", strategyMode);
      setMessage("Saved. This browser and your account now use the same defaults.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your settings.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
      setBusy(false);
    }
  }

  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p className="lead">Signed in as <strong>{email}</strong>. These defaults load automatically on any browser where you sign in.</p>
        </div>
        <button type="button" className="btn" onClick={signOut} disabled={busy}>Sign out</button>
      </div>

      <form className="card stack" onSubmit={save} noValidate>
        <h2>Saved defaults</h2>
        <div className="field">
          <label htmlFor="account-team-id">FPL Team ID</label>
          <input id="account-team-id" className="input" inputMode="numeric" value={teamId} onChange={(event) => setTeamId(event.target.value)} placeholder="e.g. 123456" aria-describedby="account-team-hint" />
          <span id="account-team-hint" className="field-hint">The public number from your FPL Points page. Leave blank to remove it. Never your FPL password.</span>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="account-ft">Free transfers to assume</label>
            <select id="account-ft" className="select" value={freeTransfers} onChange={(event) => setFreeTransfers(Number(event.target.value))}>
              {[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <span className="field-hint">Public FPL data doesn&apos;t include this, so you set it.</span>
          </div>
          <div className="field">
            <label htmlFor="account-mode">Planner style</label>
            <select id="account-mode" className="select" value={strategyMode} onChange={(event) => setStrategyMode(event.target.value as "safe" | "balanced" | "aggressive")}>
              <option value="safe">Safe</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
            <span className="field-hint">Which plan the planner highlights first.</span>
          </div>
        </div>
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save defaults"}</button>
          <Link href="/dashboard" className="small">Go to dashboard</Link>
        </div>
        {message && <div className="notice notice-good" role="status">{message}</div>}
        {error && <div className="notice notice-bad" role="alert">{error}</div>}
      </form>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>What&apos;s stored</h2>
        <dl className="kv" style={{ marginTop: 10 }}>
          <dt>Plan</dt><dd>Free — every current feature is included</dd>
          <dt>Email</dt><dd>{email}, held by the sign-in provider</dd>
          <dt>Saved settings</dt><dd>Team ID, free transfers and planner style</dd>
          <dt>Never stored</dt><dd>Your FPL password or payment details</dd>
        </dl>
        <p className="small muted" style={{ marginTop: 12 }}>
          Signing out doesn&apos;t limit anything — all tools work as a guest. See the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </main>
  );
}

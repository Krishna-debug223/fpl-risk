"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AccountPanel.module.css";
import LegalFooter from "./LegalFooter";

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
        throw new Error("FPL Team ID must be numeric.");
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
      setMessage("Saved. Your account and this browser now use the same FPL defaults.");
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
    <main className={styles.shell}>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div><p className={styles.eyebrow}>CLOUD SAVE</p><h1>Your FPL Prism setup.</h1><p>Keep the product usable without an account, or save a few defaults here so your planning setup can follow you between sessions.</p></div>
          <aside><span>CURRENT PLAN</span><strong>Free</strong><p>All current FPL Prism features are included during launch.</p></aside>
        </section>

        <section className={styles.grid}>
          <form className={styles.card} onSubmit={save}>
            <div className={styles.cardHead}><div><span>ACCOUNT DEFAULTS</span><h2>Saved planning setup</h2></div><b>Cloud sync</b></div>
            <label>Email</label>
            <div className={styles.readOnly}>{email}</div>
            <label htmlFor="account-team-id">FPL Team ID</label>
            <input id="account-team-id" inputMode="numeric" value={teamId} onChange={(event) => setTeamId(event.target.value)} placeholder="e.g. 123456" />
            <small>Only the public numeric Team ID is saved. Never enter your FPL password.</small>

            <label htmlFor="account-ft">Default free transfers</label>
            <select id="account-ft" value={freeTransfers} onChange={(event) => setFreeTransfers(Number(event.target.value))}>
              {[0,1,2,3,4,5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>

            <label htmlFor="account-mode">Default planner style</label>
            <select id="account-mode" value={strategyMode} onChange={(event) => setStrategyMode(event.target.value as "safe" | "balanced" | "aggressive")}>
              <option value="safe">Safe</option><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option>
            </select>

            <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
            {message && <div className={styles.success}>{message}</div>}
            {error && <div className={styles.error}>{error}</div>}
          </form>

          <div className={styles.side}>
            <article><span>WHAT IS SAVED</span><h3>Small by design.</h3><p>Your login email is managed by the account provider. FPL Prism stores the Team ID and planning defaults above in account metadata. Your official FPL password is never requested or stored.</p></article>
            <article><span>CROSS-DEVICE SYNC</span><h3>Your saved defaults follow the account.</h3><p>After you sign in on another browser, opening this account page copies the saved Team ID and planner defaults into that browser for the rest of the FPL Prism experience.</p><Link href="/planner">Open 8-GW Planner →</Link></article>
            <article><span>GUEST MODE</span><h3>Signing in stays optional.</h3><p>Signing out does not block the model. You can continue using projections, Transfer Lab, Player Market and the Path Planner as a guest.</p><Link href="/dashboard">Open dashboard →</Link></article>
            <button className={styles.signOut} type="button" onClick={signOut} disabled={busy}>Sign out</button>
          </div>
        </section>
      </div>
      <LegalFooter />
    </main>
  );
}

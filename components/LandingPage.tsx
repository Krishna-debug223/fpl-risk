"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");

  function openDashboard(nextTeamId: string, demo = false) {
    const normalized = nextTeamId.trim();
    if (!/^\d+$/.test(normalized)) {
      setError("Enter the numeric Team ID from your public FPL URL.");
      return;
    }
    window.localStorage.setItem("fpl-risk-team-id", normalized);
    router.push(`/dashboard?team=${encodeURIComponent(normalized)}${demo ? "&demo=1" : ""}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    openDashboard(teamId);
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>PROBABILISTIC FPL DECISIONS</span>
          <h1>Make the call with the <em>whole range.</em></h1>
          <p className={styles.lead}>FPL Prism shows the expected points, floor, ceiling and risk behind your next move, so you can choose a safe hold or chase the upside with your eyes open.</p>
          <div className={styles.heroActions}>
            <form className={styles.teamForm} onSubmit={submit}>
              <label htmlFor="landing-team-id">Your FPL Team ID</label>
              <div className={styles.formRow}>
                <input id="landing-team-id" value={teamId} onChange={(event) => setTeamId(event.target.value)} placeholder="e.g. 123456" inputMode="numeric" aria-describedby="team-id-note" />
                <button type="submit">See my team →</button>
              </div>
              <span id="team-id-note" className={styles.formNote}>Read-only public data. Your FPL password is never requested.</span>
              {error && <span className={styles.formError}>{error}</span>}
            </form>
            <button type="button" className={styles.sampleButton} onClick={() => openDashboard("1", true)}>Try a sample squad</button>
          </div>
          <details className={styles.idHelp}>
            <summary>Where do I find my Team ID?</summary>
            <div className={styles.helpBody}>
              <p>Open your FPL team page. The number after <code>/entry/</code> in the address bar is your public Team ID.</p>
              <div className={styles.urlMock} aria-label="Example FPL URL showing the Team ID"><span>fantasy.premierleague.com/entry/</span><b>123456</b><span>/event/5</span></div>
            </div>
          </details>
        </div>

        <aside className={styles.exampleCard} aria-label="Illustrative FPL Prism output">
          <div className={styles.cardHeader}><span className={styles.eyebrow}>ILLUSTRATIVE OUTPUT</span><span className={styles.livePill}><i /> 10K paths</span></div>
          <h2>Transfer verdict</h2>
          <div className={styles.move}><span>HOLD</span><b>↗</b><span className={styles.moveAccent}>Mbeumo</span></div>
          <p className={styles.cardCopy}>A higher median with enough ceiling to chase rank without paying for unnecessary variance.</p>
          <div className={styles.metricRow}><div><span>Chance to beat hold</span><strong>62%</strong></div><div><span>Expected edge</span><strong className={styles.green}>+2.4</strong></div></div>
          <div className={styles.range}><div className={styles.rangeTrack}><i /><b /></div><div><span>Floor <strong>3.1</strong></span><span>Median <strong>6.4</strong></span><span>Ceiling <strong>11.8</strong></span></div></div>
          <Link href="/dashboard" className={styles.cardLink}>Explore the live model →</Link>
          <small className={styles.disclaimer}>Example values for illustration. Live output uses the current FPL feed.</small>
        </aside>
      </section>

      <section className={styles.proof} aria-label="What FPL Prism measures">
        <div><span className={styles.proofNumber}>01</span><strong>Expected points plus range</strong><p>See the average and the outcomes around it.</p></div>
        <div><span className={styles.proofNumber}>02</span><strong>Rank-aware choices</strong><p>Protect, balance or chase with the same projections.</p></div>
        <div><span className={styles.proofNumber}>03</span><strong>A public record</strong><p>Every committed forecast can be checked in Modelbook.</p></div>
      </section>

      <section className={styles.trust}>
        <div><span className={styles.eyebrow}>MODELBOOK</span><h2>Receipts, not vibes.</h2><p>See how prior projections compared with official FPL points, including the misses and the range.</p><div className={styles.scorecard}><span><b>1.41</b> GW4 mean error</span><span><b>79.5%</b> within 2 points</span><span><b>GW3 + GW4</b> archived</span></div></div>
        <Link href="/modelbook">Open the Modelbook →</Link>
      </section>

      <section className={styles.guides} aria-label="FPL Prism guides">
        <div><span className={styles.eyebrow}>FPL DECISION GUIDES</span><p>Plain-language explainers for the choices managers make every Gameweek.</p></div>
        <nav><Link href="/fpl-captain-picks">Captain picks</Link><Link href="/fpl-transfer-planner">Transfer planner</Link><Link href="/fpl-expected-points">Expected points</Link><Link href="/fpl-team-risk">Team risk</Link></nav>
      </section>
      <footer className={styles.footer}><span>FPL Prism · Independent FPL analytics</span><span>Not affiliated with, endorsed by or sponsored by the Premier League.</span></footer>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("fpl-risk-team-id");
    if (saved && /^\d+$/.test(saved)) setTeamId(saved);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = teamId.trim();
    if (!/^\d{1,12}$/.test(normalized)) {
      setError("Team IDs are numbers only, for example 123456.");
      return;
    }
    setError("");
    router.push(`/dashboard?team=${encodeURIComponent(normalized)}`);
  }

  return (
    <main className="page">
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>Check your FPL squad and transfers before the deadline</h1>
          <p className="lead" style={{ marginTop: 12 }}>
            FPL Prism projects points for every player over the next five Gameweeks, shows how wide the likely range is,
            and compares legal transfers after budget and points hits. Free, and no account needed.
          </p>

          <form className={`card ${styles.form}`} onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="landing-team-id">Your FPL Team ID</label>
              <div className="inline-form">
                <input
                  id="landing-team-id"
                  className="input"
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  placeholder="e.g. 123456"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={Boolean(error)}
                  aria-describedby="landing-team-hint"
                />
                <button type="submit" className="btn btn-primary">Open my squad</button>
              </div>
            </div>
            <p id="landing-team-hint" className="field-hint">
              On the FPL website, open <em>Points</em>. The number after <code>/entry/</code> in the address is your Team ID —
              e.g. fantasy.premierleague.com/entry/<strong>123456</strong>/event/7 (example). Public data only; never enter your FPL password.
            </p>
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="row small" style={{ marginTop: 4 }}>
              <span className="muted">Or:</span>
              <Link href="/dashboard?demo=1">try a sample squad</Link>
              <Link href="/dashboard?view=market">browse player forecasts</Link>
            </div>
          </form>
        </div>

        <aside className={`card ${styles.example}`} aria-label="Illustrative transfer comparison">
          <div className="row-between">
            <h2 className={styles.exampleTitle}>What a transfer check looks like</h2>
            <span className="badge">Illustrative · fictional players</span>
          </div>
          <table className="table" style={{ marginTop: 12 }}>
            <tbody>
              <tr><td>Sell Jordan Reed</td><td className="r">24.0 pts</td></tr>
              <tr><td>Buy Evan Mercer</td><td className="r">31.2 pts</td></tr>
              <tr><td>Gain over 5 Gameweeks</td><td className="r">+7.2</td></tr>
              <tr><td>Hit (no free transfers)</td><td className="r">−4</td></tr>
              <tr><td><strong>Net gain</strong></td><td className="r pos"><strong>+3.2</strong></td></tr>
              <tr><td>Budget left</td><td className="r">£0.0m</td></tr>
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 12 }}>
            &ldquo;The move adds 3.2 projected points over five Gameweeks after the hit, but Mercer has more playing-time uncertainty.&rdquo;
            Real results use the live FPL feed and your squad.
          </p>
        </aside>
      </section>

      <section className={styles.tools} aria-labelledby="tools-heading">
        <h2 id="tools-heading">What you can do</h2>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <Link href="/dashboard?view=team" className={`card ${styles.tool}`}>
            <h3>See your squad</h3>
            <p>Starting XI, bench and captain with next-Gameweek projections, availability flags and chip windows.</p>
          </Link>
          <Link href="/dashboard?view=transfer" className={`card ${styles.tool}`}>
            <h3>Compare transfers</h3>
            <p>Pick players to sell and get the best legal replacements under one budget — or a clear &ldquo;hold&rdquo;.</p>
          </Link>
          <Link href="/dashboard?view=market" className={`card ${styles.tool}`}>
            <h3>Research players</h3>
            <p>Filter by club, position and price; open any player to see fixtures, playing time and where the points come from.</p>
          </Link>
          <Link href="/planner" className={`card ${styles.tool}`}>
            <h3>Plan eight weeks ahead</h3>
            <p>Compare transferring now with rolling, and see a week-by-week path with captain and bank.</p>
          </Link>
        </div>
      </section>

      <section className={`grid-2 ${styles.facts}`}>
        <div>
          <h2>Good to know</h2>
          <ul className={styles.list}>
            <li>FPL Prism only reads public FPL data. It never changes your team, captain or chips.</li>
            <li>Every number is an estimate with a range. Expected points are an average, not a promise.</li>
            <li>Public data doesn&apos;t include your selling prices or free transfers, so you set those assumptions.</li>
          </ul>
        </div>
        <div>
          <h2>Checking the model</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Forecasts are frozen at each deadline and compared with official points afterwards, misses included.
          </p>
          <p style={{ marginTop: 8 }}><Link href="/modelbook">Open the Modelbook</Link> · <Link href="/how-it-works">How it works</Link></p>
        </div>
      </section>
    </main>
  );
}

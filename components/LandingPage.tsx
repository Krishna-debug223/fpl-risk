"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ARCHIVED_GAMEWEEKS, archivedReport } from "@/lib/modelbook";
import styles from "./LandingPage.module.css";

type TickerRow = { id: number; name: string; team: string; fixture: string; projected: number };

// Illustrations only: fictional players, matching the example in the product brief.
const PITCH_ROWS: Array<Array<{ name: string; pts: string; out?: boolean }>> = [
  [{ name: "Hale", pts: "4.1" }],
  [{ name: "Okafor", pts: "4.6" }, { name: "Brandt", pts: "3.9" }, { name: "Lowe", pts: "4.2" }, { name: "Ferris", pts: "3.4" }],
  [{ name: "Nash", pts: "5.8" }, { name: "Reed", pts: "4.8", out: true }, { name: "Ito", pts: "5.1" }, { name: "Duarte", pts: "4.4" }],
  [{ name: "Kerr", pts: "6.3" }, { name: "Vance", pts: "5.5" }],
];

const RANGE_SCALE = 15;
const RANGE_EXAMPLE = [
  { name: "Kerr", expected: 6.3, low: 2, high: 13, note: "Wide: hauls and blanks both likely" },
  { name: "Nash", expected: 5.8, low: 3, high: 9, note: "Narrow: steady minutes and returns" },
  { name: "Vance", expected: 5.5, low: 1, high: 12, note: "Rotation risk widens the range" },
];

const PLAN_EXAMPLE = [
  { gw: 6, label: "Reed → Mercer", roll: false },
  { gw: 7, label: "Roll", roll: true },
  { gw: 8, label: "2 transfers", roll: false },
  { gw: 9, label: "Roll", roll: true },
  { gw: 10, label: "Ferris → Adeyemi", roll: false },
];

const FAQ = [
  { q: "Is FPL Prism free?", a: "Yes. Every feature that exists today is free, and you don't need an account. Possible paid tiers are listed on the pricing page as roadmap ideas only." },
  { q: "Do I need my FPL password?", a: "No, and you should never enter it here. FPL Prism only uses your public Team ID to read the squad FPL already publishes." },
  { q: "Can it change my team?", a: "No. It only reads public data. You make any transfer, captain or chip choice yourself in the official FPL app." },
  { q: "How accurate are the forecasts?", a: "Each Gameweek's forecasts are frozen at the deadline and scored against official points in the Modelbook, including the biggest misses, so you can judge for yourself." },
  { q: "Is this affiliated with the Premier League?", a: "No. FPL Prism is an independent project and is not endorsed or sponsored by the Premier League." },
];

export default function LandingPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");
  const [savedTeam, setSavedTeam] = useState("");
  const [ticker, setTicker] = useState<{ gameweek: number; rows: TickerRow[] } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("fpl-risk-team-id");
      if (saved && /^\d+$/.test(saved)) setSavedTeam(saved);
    } catch {
      // Storage can be unavailable (private mode); the form still works.
    }
  }, []);

  // Live strip of this Gameweek's highest projections. If the export is
  // unavailable the strip simply isn't shown.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ledger/snapshot", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { gameweek?: number; rows?: TickerRow[] } | null) => {
        if (cancelled || !data?.rows?.length || !data.gameweek) return;
        const rows = [...data.rows].sort((a, b) => b.projected - a.projected).slice(0, 14);
        setTicker({ gameweek: data.gameweek, rows });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const latestGw = ARCHIVED_GAMEWEEKS[0];
  const latest = latestGw ? archivedReport(latestGw)?.report : null;
  const biggestMiss = latest?.largestMisses[0];

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

  function focusForm() {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <main className={styles.landing}>
      {/* ---------- Hero ---------- */}
      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>Free Fantasy Premier League planner</p>
            <h1 className={styles.title}>Check your FPL squad and transfers before the deadline</h1>
            <p className={styles.lead}>
              Projected points for every player over the next five Gameweeks, how wide the likely range is,
              and whether a transfer beats holding after budget and hits.
            </p>

            {savedTeam && (
              <div className={`card ${styles.welcome}`}>
                <div>
                  <strong>Welcome back</strong>
                  <p className="small muted">Your squad (Team ID {savedTeam}) is saved on this device.</p>
                </div>
                <Link href={`/dashboard?team=${encodeURIComponent(savedTeam)}`} className="btn btn-primary">Open my squad</Link>
              </div>
            )}

            <form className={`card ${styles.form}`} onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="landing-team-id">{savedTeam ? "Open a different team" : "Your FPL Team ID"}</label>
                <div className="inline-form">
                  <input
                    id="landing-team-id"
                    ref={inputRef}
                    className="input"
                    value={teamId}
                    onChange={(event) => setTeamId(event.target.value)}
                    placeholder="e.g. 123456"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-invalid={Boolean(error)}
                    aria-describedby="landing-team-hint"
                  />
                  <button type="submit" className={savedTeam ? "btn" : "btn btn-primary"}>{savedTeam ? "Open" : "Open my squad"}</button>
                </div>
              </div>
              <p id="landing-team-hint" className="field-hint">
                On the FPL website, open <em>Points</em>. The number after <code>/entry/</code> in the address is your Team ID.
                Public data only — never enter your FPL password.
              </p>
              {error && <p className="field-error" role="alert">{error}</p>}
              <div className="row small">
                <span className="muted">Or</span>
                <Link href="/dashboard?demo=1">try a sample squad</Link>
                <Link href="/dashboard?view=market">browse player forecasts</Link>
              </div>
            </form>
          </div>

          {/* Product preview: a squad with one player marked to sell, and the result. */}
          <figure className={styles.preview}>
            <div className={styles.pitch} role="img" aria-label="Illustrative squad with Reed selected to sell">
              <span className={styles.pitchArc} aria-hidden="true" />
              {PITCH_ROWS.map((row, index) => (
                <div key={index} className={styles.pitchRow}>
                  {row.map((player) => (
                    <div key={player.name} className={`${styles.player} ${player.out ? styles.playerOut : ""}`}>
                      <span className={styles.shirt} aria-hidden="true" />
                      <span className={styles.playerName}>{player.name}</span>
                      <span className={styles.playerPts}>{player.pts}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className={`card ${styles.resultCard}`}>
              <span className="badge badge-good">Transfer leads</span>
              <div className={styles.resultMove}>Reed → Mercer</div>
              <dl className={styles.resultNums}>
                <div><dt>Gain</dt><dd>+7.2</dd></div>
                <div><dt>Hit</dt><dd>−4</dd></div>
                <div><dt>Net</dt><dd className="pos">+3.2</dd></div>
              </dl>
            </div>
            <figcaption className={styles.caption}>Illustration · fictional players</figcaption>
          </figure>
        </div>
      </section>

      {/* ---------- Live strip ---------- */}
      {ticker && (
        <section className={styles.ticker} aria-label={`Highest projected players for Gameweek ${ticker.gameweek}`}>
          <div className={styles.tickerLabel}>GW{ticker.gameweek} top projections</div>
          <div className={styles.tickerViewport}>
            <ul className={styles.tickerTrack}>
              {[...ticker.rows, ...ticker.rows].map((row, index) => (
                <li key={`${row.id}-${index}`} aria-hidden={index >= ticker.rows.length || undefined}>
                  <strong>{row.name}</strong>
                  <span>{row.team} · {row.fixture}</span>
                  <b>{row.projected.toFixed(1)}</b>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/modelbook" className={styles.tickerLink}>All players</Link>
        </section>
      )}

      {/* ---------- Feature rows ---------- */}
      <section className={styles.section} aria-labelledby="features-heading">
        <div className={styles.wrap}>
          <h2 id="features-heading" className={styles.sectionTitle}>Everything before the deadline, on one screen</h2>

          <article className={styles.feature}>
            <div className={styles.featureCopy}>
              <span className={styles.featureNum}>01</span>
              <h3>See the range, not just the average</h3>
              <p>
                Two players can both average six points while one is a steady starter and the other a boom-or-bust pick.
                Every forecast shows its likely range, so you can tell them apart.
              </p>
              <Link href="/dashboard?view=market">Browse player forecasts</Link>
            </div>
            <figure className={`card ${styles.featureVisual}`}>
              <div className={styles.rangeHead}><span>Next 5 Gameweeks</span><span>Expected · likely range</span></div>
              {RANGE_EXAMPLE.map((row) => (
                <div key={row.name} className={styles.rangeRow}>
                  <div className={styles.rangeName}><strong>{row.name}</strong><span>{row.note}</span></div>
                  <div className={styles.rangeTrack} aria-hidden="true">
                    <span className={styles.rangeBar} style={{ left: `${(row.low / RANGE_SCALE) * 100}%`, width: `${((row.high - row.low) / RANGE_SCALE) * 100}%` }} />
                    <span className={styles.rangeMean} style={{ left: `${(row.expected / RANGE_SCALE) * 100}%` }} />
                  </div>
                  <span className={styles.rangeNum}>{row.expected.toFixed(1)} <small>{row.low}–{row.high}</small></span>
                </div>
              ))}
              <figcaption className={styles.caption}>Illustration · fictional players</figcaption>
            </figure>
          </article>

          <article className={`${styles.feature} ${styles.featureFlip}`}>
            <div className={styles.featureCopy}>
              <span className={styles.featureNum}>02</span>
              <h3>Know if a transfer is worth the hit</h3>
              <p>
                Pick the players you&apos;d sell. FPL Prism finds legal replacements under one budget, subtracts any
                4-point hits, and says plainly when holding is the better call.
              </p>
              <Link href="/dashboard?view=transfer">Compare transfers</Link>
            </div>
            <figure className={`card ${styles.featureVisual}`}>
              <table className="table">
                <tbody>
                  <tr><td>Sell Jordan Reed</td><td className="r">24.0 pts</td></tr>
                  <tr><td>Buy Evan Mercer</td><td className="r">31.2 pts</td></tr>
                  <tr><td>Gain over 5 Gameweeks</td><td className="r">+7.2</td></tr>
                  <tr><td>Hit (no free transfers)</td><td className="r">−4</td></tr>
                  <tr><td><strong>Net gain</strong></td><td className="r pos"><strong>+3.2</strong></td></tr>
                </tbody>
              </table>
              <figcaption className={styles.caption}>Illustration · fictional players</figcaption>
            </figure>
          </article>

          <article className={styles.feature}>
            <div className={styles.featureCopy}>
              <span className={styles.featureNum}>03</span>
              <h3>Plan eight Gameweeks ahead</h3>
              <p>
                Compare moving now with rolling your transfer. Safe, Balanced and Aggressive plans each come with a
                week-by-week path, captain and bank.
              </p>
              <Link href="/planner">Open the planner</Link>
            </div>
            <figure className={`card ${styles.featureVisual}`}>
              <ol className={styles.plan}>
                {PLAN_EXAMPLE.map((step) => (
                  <li key={step.gw} className={step.roll ? styles.planRoll : undefined}>
                    <span className={styles.planGw}>GW{step.gw}</span>
                    <span className={styles.planDot} aria-hidden="true" />
                    <span className={styles.planLabel}>{step.label}</span>
                  </li>
                ))}
              </ol>
              <figcaption className={styles.caption}>Illustration · fictional plan</figcaption>
            </figure>
          </article>
        </div>
      </section>

      {/* ---------- Track record band (real data from the latest scored report) ---------- */}
      {latest && (
        <section className={styles.band} aria-labelledby="record-heading">
          <div className={`${styles.wrap} ${styles.bandGrid}`}>
            <div>
              <h2 id="record-heading">Every forecast gets checked</h2>
              <p>
                Forecasts are frozen at each deadline, then scored against official points, misses included.
                This is how GW{latest.gameweek} went for the {latest.activeCohort.count} players who played.
              </p>
              <Link href={`/modelbook/reports/gw${latest.gameweek}`} className={styles.bandLink}>Read the GW{latest.gameweek} report</Link>
            </div>
            <dl className={styles.bandStats}>
              <div><dt>Average miss</dt><dd>{latest.activeCohort.mae.toFixed(2)}<small> pts</small></dd></div>
              <div><dt>Within 2 points</dt><dd>{latest.activeCohort.within2.toFixed(0)}<small>%</small></dd></div>
              {biggestMiss && (
                <div>
                  <dt>Biggest miss</dt>
                  <dd>{(biggestMiss.absoluteError ?? Math.abs(biggestMiss.error)).toFixed(1)}<small> pts</small></dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      {/* ---------- Steps ---------- */}
      <section className={styles.section} aria-labelledby="steps-heading">
        <div className={styles.wrap}>
          <h2 id="steps-heading" className={styles.sectionTitle}>Three steps, about a minute</h2>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNum}>1</span>
              <h3>Find your Team ID</h3>
              <p>It&apos;s the number in your FPL Points page address. No login needed.</p>
            </li>
            <li>
              <span className={styles.stepNum}>2</span>
              <h3>Check the numbers</h3>
              <p>Captain options, availability flags and the transfer that adds the most.</p>
            </li>
            <li>
              <span className={styles.stepNum}>3</span>
              <h3>Decide in FPL</h3>
              <p>Make the move yourself in the official app. FPL Prism never touches your team.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-heading">
        <div className={`${styles.wrap} ${styles.faqGrid}`}>
          <div>
            <h2 id="faq-heading" className={styles.sectionTitle}>Questions</h2>
            <p className="muted" style={{ marginTop: 8 }}>More detail in <Link href="/how-it-works">How it works</Link>.</p>
          </div>
          <div className="stack-sm">
            {FAQ.map((item) => (
              <details key={item.q} className="disclosure">
                <summary>{item.q}</summary>
                <div className="disclosure-body"><p className="muted">{item.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Closing call to action ---------- */}
      <section className={styles.closing}>
        <div className={styles.wrap}>
          <h2>Try it with your squad</h2>
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <button type="button" className="btn btn-primary" onClick={focusForm}>Enter my Team ID</button>
            <Link href="/dashboard?demo=1" className="btn">See a sample squad</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

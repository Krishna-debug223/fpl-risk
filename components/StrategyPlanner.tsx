"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type { BootstrapPayload, FplFixture, FplPlayer, HistoricalPayload, ManagerPayload } from "@/lib/types";
import type { SportsbookPayload } from "@/lib/sportsbook";
import { assessChips, type ChipAdvice } from "@/lib/risk-v12";
import { buildStrategyPlans, type StrategyMode, type StrategyPlannerResult } from "@/lib/strategy-planner";
import { chipStatus, formatClock, formatDeadline, money, pts, riskBadge, signed, toneBadge } from "./dashboard/format";
import styles from "./StrategyPlanner.module.css";

const modeCopy: Record<StrategyMode, { label: string; detail: string }> = {
  safe: { label: "Safe", detail: "Prefers steadier players and stronger evidence; fewer volatile swaps." },
  balanced: { label: "Balanced", detail: "Maximises projected points while still counting uncertainty." },
  aggressive: { label: "Aggressive", detail: "Accepts a wider range of outcomes for more upside." },
};
const modes: StrategyMode[] = ["safe", "balanced", "aggressive"];

export default function StrategyPlanner() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [fixtures, setFixtures] = useState<FplFixture[]>([]);
  const [history, setHistory] = useState<HistoricalPayload | null>(null);
  const [sportsbook, setSportsbook] = useState<SportsbookPayload | null>(null);
  const [manager, setManager] = useState<ManagerPayload | null>(null);
  const [teamId, setTeamId] = useState("");
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [mode, setMode] = useState<StrategyMode>("balanced");
  const [loading, setLoading] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [computing, setComputing] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [planError, setPlanError] = useState("");
  const [result, setResult] = useState<StrategyPlannerResult | null>(null);
  const [stale, setStale] = useState(false);
  const [chipAdvice, setChipAdvice] = useState<ChipAdvice[]>([]);

  useEffect(() => {
    const savedMode = window.localStorage.getItem("fpl-risk-strategy-mode");
    if (savedMode === "safe" || savedMode === "balanced" || savedMode === "aggressive") setMode(savedMode);
    const savedFt = window.localStorage.getItem("fpl-risk-free-transfers");
    if (savedFt != null && /^[0-5]$/.test(savedFt)) setFreeTransfers(Number(savedFt));

    let cancelled = false;
    async function loadFeeds() {
      setLoading(true);
      setFeedError("");
      try {
        const [bootstrapResponse, fixturesResponse, sportsbookResponse] = await Promise.all([
          fetch("/api/fpl/bootstrap", { cache: "no-store" }),
          fetch("/api/fpl/fixtures", { cache: "no-store" }),
          fetch("/api/sportsbook", { cache: "no-store" }),
        ]);
        if (!bootstrapResponse.ok || !fixturesResponse.ok) throw new Error("FPL data could not be loaded. Try again in a moment.");
        const bootstrapData = (await bootstrapResponse.json()) as BootstrapPayload;
        const fixtureData = (await fixturesResponse.json()) as { fixtures: FplFixture[] };
        if (!cancelled) {
          setBootstrap(bootstrapData);
          setFixtures(fixtureData.fixtures ?? []);
          if (sportsbookResponse.ok) setSportsbook((await sportsbookResponse.json()) as SportsbookPayload);
        }
        try {
          const historicalResponse = await fetch("/api/fpl/history", { cache: "no-store" });
          if (historicalResponse.ok && !cancelled) setHistory((await historicalResponse.json()) as HistoricalPayload);
        } catch {
          // Historical priors are optional.
        }
      } catch (loadError) {
        if (!cancelled) setFeedError(loadError instanceof Error ? loadError.message : "FPL data could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadFeeds();

    // Reopen the remembered squad so the planner starts where the dashboard left off.
    const remembered = window.localStorage.getItem("fpl-risk-team-id");
    if (remembered && /^\d+$/.test(remembered)) {
      setTeamId(remembered);
      void importTeamId(remembered);
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const players = useMemo(() => bootstrap?.elements ?? [], [bootstrap]);
  const teams = useMemo(() => bootstrap?.teams ?? [], [bootstrap]);
  const events = useMemo(() => bootstrap?.events ?? [], [bootstrap]);
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const squad = useMemo(
    () => manager?.picks.map((pick) => playerMap.get(pick.element)).filter((player): player is FplPlayer => Boolean(player)) ?? [],
    [manager, playerMap],
  );

  function invalidate() {
    if (result) setStale(true);
    setResult(null);
    setChipAdvice([]);
  }

  async function importTeamId(id: string) {
    const requested = id.trim();
    if (!/^\d{1,12}$/.test(requested)) {
      setTeamError("Team IDs are numbers only, for example 123456.");
      return;
    }
    setLoadingTeam(true);
    setTeamError("");
    try {
      const response = await fetch("/api/fpl/entry", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: requested }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not import that FPL team.");
      setManager(data as ManagerPayload);
      invalidate();
      window.localStorage.setItem("fpl-risk-team-id", requested);
    } catch (importError) {
      setTeamError(importError instanceof Error ? importError.message : "Could not import that FPL team.");
    } finally {
      setLoadingTeam(false);
    }
  }

  function importTeam(event: FormEvent) {
    event.preventDefault();
    void importTeamId(teamId);
  }

  async function buildPlan() {
    if (!manager || !bootstrap || squad.length !== 15 || !fixtures.length) {
      setPlanError("A complete 15-player squad and loaded FPL data are needed to build a plan.");
      return;
    }
    setComputing(true);
    setPlanError("");
    setResult(null);
    setStale(false);
    setChipAdvice([]);
    // Let "Building…" paint before the search blocks the main thread. Animation
    // frames pause in background tabs, so a short timeout also releases it.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
      window.setTimeout(resolve, 50);
    });

    try {
      const sellingPrices = new Map(manager.picks.map((pick) => [pick.element, pick.selling_price ?? playerMap.get(pick.element)?.now_cost ?? 0]));
      const next = buildStrategyPlans({
        players, teams, fixtures, events, squad,
        bank: manager.bank ?? 0,
        sellingPrices,
        freeTransfers,
        history: history?.players,
        sportsbook,
        horizon: 8,
      });
      if (!next) throw new Error("No valid plan could be built from this squad with the current fixtures.");

      const byPosition = (inXi: boolean) => manager.picks
        .filter((pick) => (inXi ? pick.position <= 11 : pick.position > 11))
        .map((pick) => playerMap.get(pick.element))
        .filter((player): player is FplPlayer => Boolean(player));
      setChipAdvice(assessChips({
        players, squad,
        starters: byPosition(true),
        bench: byPosition(false),
        fixtures, teams, events,
        history: history?.players,
        chipsUsed: manager.chipsUsed,
        freeTransfers,
      }));
      setResult(next);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Could not build the plan.");
    } finally {
      setComputing(false);
    }
  }

  function chooseMode(next: StrategyMode) {
    setMode(next);
    window.localStorage.setItem("fpl-risk-strategy-mode", next);
  }

  const plan = result?.plans[mode] ?? null;
  const deadlineFor = (eventId: number) => result?.events.find((event) => event.id === eventId)?.deadlineTime;
  const usesListedPrices = manager?.picks.some((pick) => pick.selling_price == null) ?? false;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Planner</h1>
          <p className="lead">
            Compare making a transfer now with rolling it, or making a different move later, across the next eight Gameweeks.
          </p>
        </div>
      </div>

      {feedError && <div className="notice notice-bad" role="alert" style={{ marginBottom: 16 }}>{feedError}</div>}

      <section className={`card ${styles.setup}`} aria-label="Plan inputs">
        <div className="stack-sm">
          <h2>1. Squad</h2>
          {manager ? (
            <p>
              <strong>{manager.teamName}</strong>
              <span className="muted"> · {manager.freeHitRevert ? `GW${manager.freeHitRevert.squadEvent} squad, restored after Free Hit` : `picks as of GW${manager.eventId}`} · {money(manager.bank)} in the bank</span>
            </p>
          ) : (
            <p className="muted">{loadingTeam ? "Importing…" : "No squad imported yet."}</p>
          )}
          <form onSubmit={importTeam} className="inline-form" noValidate>
            <label htmlFor="planner-team-id" className="sr-only">FPL Team ID</label>
            <input
              id="planner-team-id"
              className="input"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              placeholder="FPL Team ID, e.g. 123456"
              inputMode="numeric"
              aria-invalid={Boolean(teamError)}
            />
            <button className="btn" disabled={loadingTeam || loading}>{loadingTeam ? "Importing…" : manager ? "Re-import" : "Import"}</button>
          </form>
          {teamError && <p className="field-error" role="alert">{teamError}</p>}
          {manager?.activeChip === "freehit" && (manager.freeHitRevert ? (
            <p className="notice notice-neutral small">Free Hit was played in GW{manager.freeHitRevert.freeHitEvent}, so the plan starts from the GW{manager.freeHitRevert.squadEvent} squad that FPL restores.</p>
          ) : (
            <p className="notice notice-warn small">These GW{manager.eventId} picks were a temporary Free Hit squad and the restored squad couldn&apos;t be loaded, so the plan starts from the Free Hit team.</p>
          ))}
        </div>

        <div className="stack-sm">
          <h2>2. Free transfers now</h2>
          <div className="segmented" role="radiogroup" aria-label="Free transfers available now">
            {[0, 1, 2, 3, 4, 5].map((count) => (
              <button key={count} type="button" role="radio" aria-checked={freeTransfers === count}
                onClick={() => { setFreeTransfers(count); window.localStorage.setItem("fpl-risk-free-transfers", String(count)); invalidate(); }}>
                {count}
              </button>
            ))}
          </div>
          <p className="field-hint">Your assumption. FPL&apos;s public data doesn&apos;t show it.</p>
        </div>

        <div className="stack-sm">
          <h2>3. Build</h2>
          <button type="button" className="btn btn-primary" onClick={buildPlan} disabled={!manager || loading || computing}>
            {computing ? "Building plans…" : result ? "Rebuild plans" : "Build plans"}
          </button>
          <p className="field-hint">Takes a few seconds. Builds Safe, Balanced and Aggressive plans together.</p>
        </div>
      </section>

      {planError && <div className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>{planError}</div>}
      {stale && !result && !computing && (
        <div className="notice notice-warn" style={{ marginTop: 16 }}>Your inputs changed, so the previous plans were cleared. Build again to see plans for the new inputs.</div>
      )}

      {!result && !computing && !stale && manager && (
        <div className="empty" style={{ marginTop: 20 }}>
          <strong>Ready to build</strong>
          Uses {manager.teamName}, {money(manager.bank)} in the bank, {freeTransfers} free transfer{freeTransfers === 1 ? "" : "s"}{usesListedPrices ? " and current listed prices as sale values" : ""}.
        </div>
      )}

      {result && plan && (
        <div className="stack-lg" style={{ marginTop: 24 }}>
          {result.horizon < 8 && (
            <div className="notice notice-warn">Only {result.horizon} future Gameweek{result.horizon === 1 ? " has" : "s have"} published fixtures, so plans cover {result.horizon} instead of 8.</div>
          )}

          <section>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div>
                <h2>Compare the three plans</h2>
                <p className="muted small">
                  Over {result.horizon} Gameweeks (GW{result.events[0]?.id}–{result.events[result.events.length - 1]?.id}).
                  &quot;Hold&quot; keeps your squad with the best lineup and captain each week, and makes no transfers.
                </p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th className="r">Projected (net of hits)</th>
                    <th className="r">vs hold</th>
                    <th className="r">Transfers</th>
                    <th className="r">Hit points</th>
                    <th>Risk</th>
                    <th>Confidence</th>
                    <th><span className="sr-only">Select</span></th>
                  </tr>
                </thead>
                <tbody>
                  {modes.map((item) => {
                    const candidate = result.plans[item];
                    return (
                      <tr key={item} className={item === mode ? styles.selectedRow : undefined}>
                        <td>
                          <strong>{modeCopy[item].label}</strong>
                          <div className="muted tiny">{modeCopy[item].detail}</div>
                        </td>
                        <td className="r strong">{pts(candidate.expectedPoints)}</td>
                        <td className={`r ${candidate.expectedGain > 0 ? "pos" : candidate.expectedGain < 0 ? "neg" : ""}`}>{signed(candidate.expectedGain)}</td>
                        <td className="r">{candidate.transferCount}</td>
                        <td className="r">{candidate.totalHits ? `−${candidate.totalHits}` : "0"}</td>
                        <td><span className={riskBadge(candidate.risk)}>{candidate.risk}</span></td>
                        <td>{candidate.confidence}</td>
                        <td className="r">
                          {item === mode
                            ? <span className="badge badge-accent">Showing</span>
                            : <button type="button" className="btn btn-sm" onClick={() => chooseMode(item)}>Show</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>
              Hold baseline: {pts(plan.baselinePoints)} points. Projected totals already subtract hit points; don&apos;t subtract them again.
            </p>
          </section>

          <section>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div>
                <h2>{modeCopy[mode].label} plan, week by week</h2>
                <p className="muted small">
                  Ends with {money(plan.endingBank)} in the bank and {plan.endingFreeTransfers} free transfer{plan.endingFreeTransfers === 1 ? "" : "s"}.
                  Average data quality {Math.round(plan.averageDataQuality)}/100.
                </p>
              </div>
            </div>
            <ol className={styles.steps}>
              {plan.steps.map((step) => {
                const deadline = deadlineFor(step.eventId);
                return (
                  <li key={step.eventId} className="card card-tight">
                    <div className={styles.stepHead}>
                      <div>
                        <strong>{step.eventName}</strong>
                        <span className="muted small"> · deadline {formatDeadline(deadline)}</span>
                      </div>
                      <span className={step.action === "ROLL" ? "badge" : "badge badge-accent"}>
                        {step.action === "ROLL" ? "Roll (no transfer)" : `${step.moves.length} transfer${step.moves.length === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    {step.moves.length > 0 && (
                      <ul className={styles.moves}>
                        {step.moves.map((move) => (
                          <li key={`${move.outgoingId}-${move.incomingId}`}>
                            <span>{move.outgoingName} → <strong>{move.incomingName}</strong></span>
                            <span className="muted small">{signed(move.expectedEdge)} pts over the rest of the plan</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <dl className={styles.stepMeta}>
                      <div><dt>Projected (net)</dt><dd>{pts(step.projectedPoints)}</dd></div>
                      <div><dt>Hit</dt><dd>{step.hitCost ? `−${step.hitCost}` : "0"}</dd></div>
                      <div><dt>Captain</dt><dd>{step.captainName}</dd></div>
                      <div><dt>Formation</dt><dd>{step.formation}</dd></div>
                      <div><dt>Bank after</dt><dd>{money(step.bankAfter)}</dd></div>
                      <div><dt>Free transfers after</dt><dd>{step.freeTransfersAfter}</dd></div>
                    </dl>
                  </li>
                );
              })}
            </ol>
            <p className="muted small" style={{ marginTop: 8 }}>
              Weekly projections include the suggested captain and subtract that week&apos;s hit. A move&apos;s gain covers the remaining weeks of the plan, not just that week.
            </p>
          </section>

          {chipAdvice.length > 0 && (
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Chips</h2>
                  <p>A separate check of your current squad. Chips are not part of the plans or their point totals above.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Chip</th><th>Assessment</th><th>Window</th><th>Why</th></tr></thead>
                  <tbody>
                    {chipAdvice.map((chip) => (
                      <tr key={chip.key}>
                        <td className="strong nowrap">{chip.label}</td>
                        <td><span className={toneBadge(chipStatus[chip.status].tone)}>{chipStatus[chip.status].label}</span></td>
                        <td className="nowrap">{chip.status === "USED" || chip.status === "UNAVAILABLE" ? "—" : chip.targetGw ? `GW${chip.targetGw}` : "None yet"}</td>
                        <td className="small">{chip.headline}. {chip.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <details className="disclosure">
            <summary><span>How the plans are searched<small>And what they can&apos;t account for.</small></span></summary>
            <div className="disclosure-body prose small">
              <p>
                Each week the search tries rolling, one transfer and two transfers from a shortlist of strong candidates per position, keeping budget,
                positions and the three-per-club limit legal. This plan evaluated {result.plans[mode].statesEvaluated.toLocaleString()} candidate squad states.
                It&apos;s a bounded search, so a better plan could exist outside it.
              </p>
              <p>
                Plans use today&apos;s information. Price changes, injuries, transfers between clubs and postponed matches can make later weeks out of date — rebuild as things change.
                {usesListedPrices ? " Sale values use current listed prices because public data doesn't include your selling prices." : ""}
              </p>
              <p className="muted">Generated {formatClock(result.generatedAt)} · planner v{result.plannerVersion}.</p>
            </div>
          </details>

          <p className="muted small">FPL Prism doesn&apos;t make transfers or pick your captain. Make changes in the official FPL app. <Link href="/dashboard?view=transfer">Compare a single move in Transfers</Link>.</p>
        </div>
      )}
    </main>
  );
}

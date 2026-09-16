"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  BootstrapPayload,
  FplFixture,
  FplPlayer,
  HistoricalPayload,
  ManagerPayload,
} from "@/lib/types";
import type { SportsbookPayload } from "@/lib/sportsbook";
import { MODEL_VERSION, assessChips, type ChipAdvice } from "@/lib/risk-v12";
import {
  buildStrategyPlans,
  type StrategyMode,
  type StrategyPlannerResult,
} from "@/lib/strategy-planner";
import styles from "./StrategyPlanner.module.css";

const modeCopy: Record<StrategyMode, { label: string; detail: string }> = {
  safe: {
    label: "Safe",
    detail: "Prefers stable projections, stronger data and fewer volatile swaps.",
  },
  balanced: {
    label: "Balanced",
    detail: "Optimizes expected points while keeping uncertainty in the decision.",
  },
  aggressive: {
    label: "Aggressive",
    detail: "Tolerates more variance when the upside path is stronger.",
  },
};

const money = (value: number | null | undefined) =>
  value == null ? "—" : `£${(value / 10).toFixed(1)}m`;

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function chipTone(status: ChipAdvice["status"]) {
  if (status === "PLAY") return styles.play;
  if (status === "CONSIDER") return styles.consider;
  if (status === "USED" || status === "UNAVAILABLE") return styles.muted;
  return styles.hold;
}

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
  const [error, setError] = useState("");
  const [result, setResult] = useState<StrategyPlannerResult | null>(null);
  const [chipAdvice, setChipAdvice] = useState<ChipAdvice[]>([]);

  useEffect(() => {
    const remembered = window.localStorage.getItem("fpl-risk-team-id");
    if (remembered && /^\d+$/.test(remembered)) setTeamId(remembered);

    let cancelled = false;
    async function loadFeeds() {
      setLoading(true);
      setError("");
      try {
        const [bootstrapResponse, fixturesResponse, sportsbookResponse] = await Promise.all([
          fetch("/api/fpl/bootstrap", { cache: "no-store" }),
          fetch("/api/fpl/fixtures", { cache: "no-store" }),
          fetch("/api/sportsbook", { cache: "no-store" }),
        ]);
        if (!bootstrapResponse.ok || !fixturesResponse.ok) {
          throw new Error("Live FPL feeds are temporarily unavailable.");
        }
        const bootstrapData = (await bootstrapResponse.json()) as BootstrapPayload;
        const fixtureData = (await fixturesResponse.json()) as { fixtures: FplFixture[] };
        if (!cancelled) {
          setBootstrap(bootstrapData);
          setFixtures(fixtureData.fixtures ?? []);
          if (sportsbookResponse.ok) {
            setSportsbook((await sportsbookResponse.json()) as SportsbookPayload);
          }
        }
        try {
          const historicalResponse = await fetch("/api/fpl/history", { cache: "no-store" });
          if (historicalResponse.ok && !cancelled) {
            setHistory((await historicalResponse.json()) as HistoricalPayload);
          }
        } catch {
          // Historical priors are optional and the planner can fall back to the live model.
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load model feeds.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadFeeds();
    return () => {
      cancelled = true;
    };
  }, []);

  const players = bootstrap?.elements ?? [];
  const teams = bootstrap?.teams ?? [];
  const events = bootstrap?.events ?? [];
  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const squad = useMemo(
    () =>
      manager?.picks
        .map((pick) => playerMap.get(pick.element))
        .filter((player): player is FplPlayer => Boolean(player)) ?? [],
    [manager, playerMap],
  );

  async function importTeam(event: FormEvent) {
    event.preventDefault();
    if (!/^\d+$/.test(teamId.trim())) {
      setError("Enter the numeric Team ID from your public FPL URL.");
      return;
    }
    setLoadingTeam(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/fpl/entry", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not import that FPL team.");
      setManager(data as ManagerPayload);
      window.localStorage.setItem("fpl-risk-team-id", teamId.trim());
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import that FPL team.");
    } finally {
      setLoadingTeam(false);
    }
  }

  async function buildPlan() {
    if (!manager || !bootstrap || squad.length !== 15 || !fixtures.length) {
      setError("Load a complete FPL squad before building the strategy path.");
      return;
    }
    setComputing(true);
    setError("");
    setResult(null);
    setChipAdvice([]);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const sellingPrices = new Map(
        manager.picks.map((pick) => [
          pick.element,
          pick.selling_price ?? playerMap.get(pick.element)?.now_cost ?? 0,
        ]),
      );
      const next = buildStrategyPlans({
        players,
        teams,
        fixtures,
        events,
        squad,
        bank: manager.bank ?? 0,
        sellingPrices,
        freeTransfers,
        history: history?.players,
        sportsbook,
        horizon: 8,
      });
      if (!next) throw new Error("The planner could not construct a legal 8-GW path from this squad.");

      const starters = manager.picks
        .filter((pick) => pick.position <= 11)
        .map((pick) => playerMap.get(pick.element))
        .filter((player): player is FplPlayer => Boolean(player));
      const bench = manager.picks
        .filter((pick) => pick.position > 11)
        .map((pick) => playerMap.get(pick.element))
        .filter((player): player is FplPlayer => Boolean(player));

      setChipAdvice(
        assessChips({
          players,
          squad,
          starters,
          bench,
          fixtures,
          teams,
          events,
          history: history?.players,
          chipsUsed: manager.chipsUsed,
          freeTransfers,
        }),
      );
      setResult(next);
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "Could not build the strategy path.");
    } finally {
      setComputing(false);
    }
  }

  const plan = result?.plans[mode] ?? null;
  const maxStates = result
    ? Math.max(...Object.values(result.plans).map((item) => item.statesEvaluated))
    : 0;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span>FR</span>
          <div>
            <strong>FPL RISK</strong>
            <small>8-GW Path Planner</small>
          </div>
        </Link>
        <div className={styles.headerMeta}>
          <span>Model {MODEL_VERSION}</span>
          <Link href="/">Back to dashboard →</Link>
        </div>
      </header>

      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>MULTI-GAMEWEEK STRATEGY</p>
            <h1>Plan the next move.<br />Then the move after that.</h1>
            <p className={styles.lead}>
              Search roll, single-transfer and two-transfer paths across the next eight Gameweeks using FPL Risk&apos;s own xPts model. The planner keeps budget, positions, club limits, hits and banked free transfers legal as the squad evolves.
            </p>
          </div>
          <aside className={styles.heroCard}>
            <span>WHAT&apos;S NEW</span>
            <strong>8-GW path search</strong>
            <p>Safe, Balanced and Aggressive plans all start from the same projection engine, then value uncertainty differently.</p>
            <div><b>{maxStates || "—"}</b><small>candidate states evaluated when a plan is built</small></div>
          </aside>
        </section>

        <section className={styles.setupCard}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>YOUR STARTING STATE</p>
              <h2>{manager ? manager.teamName : "Import your FPL squad"}</h2>
            </div>
            {manager && <span>{manager.managerName} · {money(manager.bank)} bank</span>}
          </div>

          <div className={styles.setupGrid}>
            <form onSubmit={importTeam} className={styles.importForm}>
              <label htmlFor="planner-team-id">FPL Team ID</label>
              <div>
                <input
                  id="planner-team-id"
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  placeholder="e.g. 123456"
                  inputMode="numeric"
                />
                <button disabled={loadingTeam || loading}>
                  {loadingTeam ? "Loading…" : manager ? "Reload" : "Import"}
                </button>
              </div>
            </form>

            <label className={styles.selectField}>
              Free transfers now
              <select
                value={freeTransfers}
                onChange={(event) => {
                  setFreeTransfers(Number(event.target.value));
                  setResult(null);
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <option value={value} key={value}>{value}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={styles.buildButton}
              onClick={buildPlan}
              disabled={!manager || loading || computing}
            >
              {computing ? "Searching strategy paths…" : "Build 8-GW plan"}
            </button>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </section>

        {plan && result && (
          <>
            <section className={styles.modeSection}>
              <div className={styles.sectionHead}>
                <div>
                  <p className={styles.eyebrow}>STRATEGY PROFILE</p>
                  <h2>Choose how much uncertainty you want to carry.</h2>
                </div>
                <span>Planner v{result.plannerVersion}</span>
              </div>
              <div className={styles.modeTabs}>
                {(Object.keys(modeCopy) as StrategyMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={mode === item ? styles.activeMode : ""}
                    onClick={() => setMode(item)}
                  >
                    <strong>{modeCopy[item].label}</strong>
                    <small>{modeCopy[item].detail}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.metrics}>
              <article>
                <span>8-GW NET xPTS</span>
                <strong>{plan.expectedPoints.toFixed(1)}</strong>
                <small>captaincy + transfer hits included</small>
              </article>
              <article>
                <span>EDGE VS HOLD</span>
                <strong className={plan.expectedGain >= 0 ? styles.positive : styles.negative}>{signed(plan.expectedGain)}</strong>
                <small>same squad, optimized captaincy baseline</small>
              </article>
              <article>
                <span>PLANNED MOVES</span>
                <strong>{plan.transferCount}</strong>
                <small>{plan.totalHits ? `${plan.totalHits} hit points` : "no hit points"}</small>
              </article>
              <article>
                <span>PLAN CONFIDENCE</span>
                <strong>{plan.confidence}</strong>
                <small>{plan.averageDataQuality.toFixed(0)}% average data quality</small>
              </article>
              <article>
                <span>PLAN RISK</span>
                <strong>{plan.risk}</strong>
                <small>lineup uncertainty across the path</small>
              </article>
            </section>

            <section className={styles.timelineSection}>
              <div className={styles.sectionHead}>
                <div>
                  <p className={styles.eyebrow}>DECISION PATH</p>
                  <h2>{modeCopy[mode].label} plan · {plan.horizon} Gameweeks</h2>
                </div>
                <span>{plan.statesEvaluated.toLocaleString()} states searched</span>
              </div>

              <div className={styles.timeline}>
                {plan.steps.map((step, index) => (
                  <article className={styles.step} key={`${step.eventId}-${index}`}>
                    <div className={styles.stepIndex}>{index + 1}</div>
                    <div className={styles.stepBody}>
                      <div className={styles.stepTop}>
                        <div>
                          <span>{step.eventName}</span>
                          <strong>{step.action === "ROLL" ? "ROLL TRANSFER" : step.moves.length > 1 ? "DOUBLE MOVE" : "TRANSFER"}</strong>
                        </div>
                        <b>{step.projectedPoints.toFixed(1)} xPts</b>
                      </div>
                      {step.moves.length ? (
                        <div className={styles.moves}>
                          {step.moves.map((move) => (
                            <div key={`${move.outgoingId}-${move.incomingId}`}>
                              <span>{move.outgoingName}</span>
                              <i>→</i>
                              <strong>{move.incomingName}</strong>
                              <small>{signed(move.expectedEdge)} remaining-horizon xPts</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.rollCopy}>Bank the transfer because the search values the extra flexibility more than the available immediate swaps.</p>
                      )}
                      <div className={styles.stepMeta}>
                        <span>Captain <b>{step.captainName}</b></span>
                        <span>Formation <b>{step.formation}</b></span>
                        <span>Bank <b>{money(step.bankAfter)}</b></span>
                        <span>Next FT <b>{step.freeTransfersAfter}</b></span>
                        {step.hitCost > 0 && <span className={styles.hit}>-{step.hitCost} hit</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.compareSection}>
              <div className={styles.sectionHead}>
                <div>
                  <p className={styles.eyebrow}>PATH COMPARISON</p>
                  <h2>Same squad. Three different risk budgets.</h2>
                </div>
              </div>
              <div className={styles.compareGrid}>
                {(Object.keys(result.plans) as StrategyMode[]).map((item) => {
                  const candidate = result.plans[item];
                  return (
                    <button key={item} type="button" onClick={() => setMode(item)} className={mode === item ? styles.selectedPlan : ""}>
                      <span>{modeCopy[item].label}</span>
                      <strong>{candidate.expectedPoints.toFixed(1)} xPts</strong>
                      <b>{signed(candidate.expectedGain)} vs hold</b>
                      <small>{candidate.transferCount} moves · {candidate.risk} risk · {candidate.confidence} confidence</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.chipSection}>
              <div className={styles.sectionHead}>
                <div>
                  <p className={styles.eyebrow}>CHIP WINDOWS</p>
                  <h2>Keep chips visible while planning transfers.</h2>
                </div>
                <span>Current squad scan</span>
              </div>
              <div className={styles.chipGrid}>
                {chipAdvice.map((chip) => (
                  <article key={chip.key}>
                    <div>
                      <strong>{chip.label}</strong>
                      <span className={`${styles.chipStatus} ${chipTone(chip.status)}`}>{chip.status}</span>
                    </div>
                    <h3>{chip.headline}</h3>
                    <p>{chip.reason}</p>
                    <small>{chip.targetGw ? `Strongest current window: GW${chip.targetGw}` : "No target Gameweek yet"}</small>
                  </article>
                ))}
              </div>
            </section>

            <div className={styles.methodNote}>
              <strong>How this improves FPL Risk:</strong> the old Transfer Lab asks whether one move is good over a fixed horizon. Path Planner asks whether making that move now is better than rolling, making a different move later, or combining two transfers once you have banked them. It uses our own projection engine rather than importing another site&apos;s xPts.
            </div>
          </>
        )}

        {!result && manager && !computing && (
          <section className={styles.emptyState}>
            <span>READY TO SEARCH</span>
            <h2>Turn a one-week recommendation into an eight-week strategy.</h2>
            <p>Build the path to compare rolling, immediate transfers and banked two-transfer packages before committing to the first move.</p>
          </section>
        )}
      </div>
    </main>
  );
}

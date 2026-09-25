"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { BootstrapPayload, FplFixture, FplPlayer, HistoricalPayload, ManagerPayload } from "@/lib/types";
import { MODEL_VERSION, positionName, projectPlayer, recommendReplacements, type HistoricalProfileMap, type Projection, type Recommendation } from "@/lib/risk";
import styles from "./LiveRefresh.module.css";
import BrandMark from "./BrandMark";

type Tab = "overview" | "transfer" | "market" | "model";
type SquadItem = { pick: ManagerPayload["picks"][number]; player: FplPlayer };
type ProjectionRow = { player: FplPlayer; projection: Projection };
type RecommendationGroup = { outgoing: FplPlayer; picks: Recommendation[]; sellingPrice: number };

const money = (value: number | null | undefined) => value == null ? "—" : `£${(value / 10).toFixed(1)}m`;

export default function LiveRefresh() {
  const [tab, setTab] = useState<Tab>("overview");
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [fixtures, setFixtures] = useState<FplFixture[]>([]);
  const [history, setHistory] = useState<HistoricalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [manager, setManager] = useState<ManagerPayload | null>(null);
  const [teamId, setTeamId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedOut, setSelectedOut] = useState<number[]>([]);
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [whyPlayer, setWhyPlayer] = useState<ProjectionRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFeedError("");
      try {
        const [bootstrapResponse, fixtureResponse] = await Promise.all([
          fetch("/api/fpl/bootstrap", { cache: "no-store" }),
          fetch("/api/fpl/fixtures", { cache: "no-store" }),
        ]);
        if (!bootstrapResponse.ok || !fixtureResponse.ok) throw new Error("Live FPL feed unavailable");
        const bootstrapData = await bootstrapResponse.json() as BootstrapPayload;
        const fixtureData = await fixtureResponse.json() as { fixtures: FplFixture[] };
        if (!cancelled) {
          setBootstrap(bootstrapData);
          setFixtures(fixtureData.fixtures ?? []);
        }
        try {
          const historicalResponse = await fetch("/api/fpl/history", { cache: "no-store" });
          if (historicalResponse.ok && !cancelled) setHistory(await historicalResponse.json() as HistoricalPayload);
        } catch {
          // Historical priors are optional; the live model remains usable without them.
        }
      } catch {
        if (!cancelled) setFeedError("Live FPL data is temporarily unavailable. Refresh in a moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const players = bootstrap?.elements ?? [];
  const teams = bootstrap?.teams ?? [];
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const historicalProfiles: HistoricalProfileMap | undefined = history?.players;

  const projections = useMemo<ProjectionRow[]>(() => {
    if (!bootstrap || !fixtures.length) return [];
    return players
      .filter((player) => !["u", "s", "n"].includes(player.status))
      .map((player) => ({ player, projection: projectPlayer(player, fixtures, teams, 1, historicalProfiles) }))
      .filter(({ projection }) => projection.expected > 0.1)
      .sort((a, b) => b.projection.expected - a.projection.expected)
      .slice(0, 10);
  }, [bootstrap, fixtures, historicalProfiles, players, teams]);

  const squad = useMemo<SquadItem[]>(() => manager?.picks
    .map((pick) => ({ pick, player: playerMap.get(pick.element) }))
    .filter((item): item is SquadItem => Boolean(item.player)) ?? [], [manager, playerMap]);

  const recommendationGroups = useMemo<RecommendationGroup[]>(() => {
    if (!manager || !bootstrap || !selectedOut.length) return [];
    const squadPlayers = squad.map(({ player }) => player);
    return selectedOut.map((id, index) => {
      const item = squad.find(({ player }) => player.id === id);
      if (!item) return null;
      const sellingPrice = item.pick.selling_price ?? item.player.now_cost;
      return {
        outgoing: item.player,
        sellingPrice,
        picks: recommendReplacements({
          players,
          squad: squadPlayers,
          fixtures,
          teams,
          outgoing: item.player,
          bank: manager.bank ?? 0,
          sellingPrice,
          horizon: 5,
          limit: 3,
          history: historicalProfiles,
          freeTransfers: Math.max(0, freeTransfers - index),
        }),
      };
    }).filter((group): group is RecommendationGroup => Boolean(group));
  }, [bootstrap, fixtures, freeTransfers, historicalProfiles, manager, players, selectedOut, squad, teams]);

  async function importTeam(event: FormEvent) {
    event.preventDefault();
    if (!/^\d+$/.test(teamId.trim())) {
      setTeamError("Enter the numeric Team ID from your FPL URL.");
      return;
    }
    setLoadingTeam(true);
    setTeamError("");
    try {
      const response = await fetch("/api/fpl/entry", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not import team");
      setManager(data as ManagerPayload);
      setSelectedOut([]);
      setTab("transfer");
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Could not import that team.");
    } finally {
      setLoadingTeam(false);
    }
  }

  function toggleOutgoing(id: number) {
    setSelectedOut((current) => current.includes(id) ? current.filter((playerId) => playerId !== id) : [...current, id]);
  }

  const nextEvent = bootstrap?.events.find((event) => event.is_next) ?? bootstrap?.events.find((event) => event.is_current);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => setTab("overview")}>
          <BrandMark className={styles.brandMark} />
          <span><strong>FPL PRISM</strong><small>Decision analytics</small></span>
        </button>
        <nav className={styles.nav} aria-label="Primary navigation">
          <button className={tab === "overview" ? styles.activeNav : ""} onClick={() => setTab("overview")}>Overview</button>
          <button className={tab === "transfer" ? styles.activeNav : ""} onClick={() => setTab("transfer")}>Transfer Lab</button>
          <button className={tab === "market" ? styles.activeNav : ""} onClick={() => setTab("market")}>Player Market</button>
          <button className={tab === "model" ? styles.activeNav : ""} onClick={() => setTab("model")}>Model</button>
        </nav>
        <div className={styles.liveStatus}><i /> {loading ? "Syncing" : feedError ? "Feed issue" : nextEvent?.name ?? "Live FPL"}</div>
      </header>

      {feedError && <div className={styles.errorBanner}>{feedError}</div>}

      {tab === "overview" && (
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>LIVE FPL DECISION ENGINE</span>
              <h1>Know the risk behind every move.</h1>
              <p>Live projections, legal transfer recommendations and uncertainty-aware decision support using the current FPL Prism model.</p>
            </div>
            <form className={styles.importForm} onSubmit={importTeam}>
              <input value={teamId} onChange={(event) => setTeamId(event.target.value)} placeholder="Enter FPL Team ID" inputMode="numeric" aria-label="FPL Team ID" />
              <button disabled={loadingTeam}>{loadingTeam ? "Loading…" : manager ? "Reload team" : "Analyze team"}</button>
              {teamError && <small className={styles.formError}>{teamError}</small>}
            </form>
          </section>

          <section className={styles.marketSection}>
            <div className={styles.sectionTitle}>
              <div><span className={styles.eyebrow}>LIVE MARKET</span><h2>Best projections right now</h2></div>
              <button onClick={() => setTab("market")}>Open Player Market →</button>
            </div>
            <div className={styles.railViewport}>
              <div className={styles.projectionRail}>
                {[...projections, ...projections].map(({ player, projection }, index) => {
                  const team = teamMap.get(player.team);
                  const fixture = projection.fixtureLabels[0] ?? "No fixture";
                  return (
                    <article className={styles.projectionCard} key={`${player.id}-${index}`}>
                      <div className={styles.cardTop}><span className={styles.teamBubble}>{team?.short_name ?? "FPL"}</span><span className={`${styles.confidence} ${styles[projection.confidence.toLowerCase()]}`}>{projection.confidence}</span></div>
                      <h3>{player.web_name}</h3>
                      <p>{team?.short_name ?? "—"} · {fixture}</p>
                      <div className={styles.cardBottom}><strong>{projection.expected.toFixed(1)} <small>xPTS</small></strong><button onClick={() => setWhyPlayer({ player, projection })}>Why?</button></div>
                    </article>
                  );
                })}
                {!projections.length && Array.from({ length: 4 }).map((_, index) => <div className={styles.projectionSkeleton} key={index} />)}
              </div>
            </div>
            <p className={styles.railHint}>Live next-Gameweek xPts · rail pauses when you hover</p>
          </section>

          {manager && (
            <section className={styles.teamReady}>
              <div><span className={styles.eyebrow}>TEAM LOADED</span><h2>{manager.teamName}</h2><p>{manager.managerName} · {money(manager.bank)} in the bank</p></div>
              <button onClick={() => setTab("transfer")}>Choose players to transfer →</button>
            </section>
          )}
        </div>
      )}

      {tab === "transfer" && (
        <div className={styles.page}>
          <div className={styles.pageHeading}>
            <div><span className={styles.eyebrow}>TRANSFER LAB</span><h1>Pick who you want out.</h1><p>Select any player from your loaded squad and the model will rank the best legal replacement for that exact player.</p></div>
            {manager && <div className={styles.managerBadge}><strong>{manager.teamName}</strong><span>{money(manager.bank)} bank</span></div>}
          </div>

          {!manager ? (
            <section className={styles.loadPanel}>
              <h2>Load your FPL team first</h2>
              <p>Your public Team ID lets FPL Prism check your actual squad, selling prices, bank and club-limit constraints.</p>
              <form className={styles.importForm} onSubmit={importTeam}>
                <input value={teamId} onChange={(event) => setTeamId(event.target.value)} placeholder="Enter FPL Team ID" inputMode="numeric" />
                <button disabled={loadingTeam}>{loadingTeam ? "Loading…" : "Load team"}</button>
              </form>
              {teamError && <small className={styles.formError}>{teamError}</small>}
            </section>
          ) : (
            <>
              <section className={styles.transferControls}>
                <div><span>FREE TRANSFERS</span><div className={styles.ftButtons}>{[0, 1, 2, 3, 4, 5].map((count) => <button key={count} className={freeTransfers === count ? styles.selectedFt : ""} onClick={() => setFreeTransfers(count)}>{count}</button>)}</div></div>
                <div className={styles.selectionCount}>{selectedOut.length ? `${selectedOut.length} selected` : "Select player(s) below"}</div>
              </section>

              <section className={styles.squadPanel}>
                <div className={styles.panelHeading}><div><span className={styles.eyebrow}>YOUR SQUAD</span><h2>Who do you want to transfer out?</h2></div><button onClick={() => setSelectedOut([])} disabled={!selectedOut.length}>Clear selection</button></div>
                <div className={styles.squadGrid}>
                  {squad.map(({ player, pick }) => {
                    const selected = selectedOut.includes(player.id);
                    const projection = projectPlayer(player, fixtures, teams, 5, historicalProfiles);
                    return (
                      <button className={`${styles.squadCard} ${selected ? styles.selectedSquad : ""}`} onClick={() => toggleOutgoing(player.id)} key={player.id} aria-pressed={selected}>
                        <span className={styles.selectionDot}>{selected ? "✓" : "+"}</span>
                        <strong>{player.web_name}</strong>
                        <small>{teamMap.get(player.team)?.short_name} · {positionName(player.element_type)} · {money(pick.selling_price ?? player.now_cost)}</small>
                        <span>{projection.expected.toFixed(1)} <small>5GW xPts</small></span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={styles.recommendationSection}>
                <div className={styles.panelHeading}><div><span className={styles.eyebrow}>MODEL PICKS</span><h2>{selectedOut.length ? "Best replacements for your selections" : "Select a player to see the best replacement"}</h2></div><span className={styles.modelTag}>Model v{MODEL_VERSION}</span></div>
                <div className={styles.recommendationGrid}>
                  {recommendationGroups.map((group, groupIndex) => {
                    const best = group.picks[0];
                    const incoming = best ? playerMap.get(best.incomingId) : null;
                    const outProjection = projectPlayer(group.outgoing, fixtures, teams, 5, historicalProfiles);
                    return (
                      <article className={styles.recommendationCard} key={group.outgoing.id}>
                        <div className={styles.swapHeader}>
                          <div><span>OUT</span><strong>{group.outgoing.web_name}</strong><small>{outProjection.expected.toFixed(1)} xPts</small></div>
                          <b>→</b>
                          {incoming && best ? <div><span>BEST IN</span><strong>{incoming.web_name}</strong><small>{best.incomingExpected.toFixed(1)} xPts</small></div> : <div><span>BEST IN</span><strong>No legal upgrade</strong><small>Hold the player</small></div>}
                        </div>
                        {best && incoming && (
                          <>
                            <div className={styles.edgeRow}><div><span>5GW EDGE</span><strong>{best.expectedGain >= 0 ? "+" : ""}{best.expectedGain.toFixed(1)}</strong></div><div><span>CONFIDENCE</span><strong>{best.confidence}</strong></div><div><span>MAX BUDGET</span><strong>{money(best.budget)}</strong></div></div>
                            <ul>{best.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                            {group.picks.length > 1 && <div className={styles.alternatives}><span>Next best:</span>{group.picks.slice(1).map((pick) => { const player = playerMap.get(pick.incomingId); return player ? <b key={player.id}>{player.web_name} <small>{pick.expectedGain >= 0 ? "+" : ""}{pick.expectedGain.toFixed(1)}</small></b> : null; })}</div>}
                            {groupIndex >= freeTransfers && <p className={styles.hitNote}>This slot includes the model's -4 transfer cost because your free transfers are exhausted.</p>}
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {tab === "market" && (
        <div className={styles.page}>
          <div className={styles.pageHeading}><div><span className={styles.eyebrow}>PLAYER MARKET</span><h1>Projection leaderboard</h1><p>Current next-Gameweek projections from the same engine used by Transfer Lab.</p></div></div>
          <section className={styles.tablePanel}>
            {projections.map(({ player, projection }, index) => <div className={styles.marketRow} key={player.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{player.web_name}</strong><small>{teamMap.get(player.team)?.short_name} · {positionName(player.element_type)}</small><b>{projection.expected.toFixed(1)} xPts</b><em>{projection.confidence}</em></div>)}
          </section>
        </div>
      )}

      {tab === "model" && (
        <div className={styles.page}>
          <div className={styles.pageHeading}><div><span className={styles.eyebrow}>MODEL TRANSPARENCY</span><h1>Risk Model v{MODEL_VERSION}</h1><p>Live player data, expected minutes, underlying xG/xA, team and opponent context, historical priors and legal FPL squad constraints feed the recommendation engine.</p></div></div>
          <section className={styles.modelGrid}><div><span>PROJECTION</span><strong>Component-based xPts</strong><p>Expected scoring actions are built fixture by fixture instead of extrapolating recent FPL points.</p></div><div><span>TRANSFER FILTER</span><strong>Legal moves only</strong><p>Position, selling price, bank, squad duplication, club limits and availability are enforced before ranking.</p></div><div><span>UNCERTAINTY</span><strong>Confidence + risk</strong><p>The model carries data quality and volatility into the recommendation rather than presenting xPts as certainty.</p></div></section>
        </div>
      )}

      {whyPlayer && (
        <div className={styles.modalBackdrop} onClick={() => setWhyPlayer(null)} role="presentation">
          <section className={styles.whyModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${whyPlayer.player.web_name} projection explanation`}>
            <button className={styles.closeButton} onClick={() => setWhyPlayer(null)}>×</button>
            <span className={styles.eyebrow}>WHY THIS PROJECTION?</span>
            <h2>{whyPlayer.player.web_name} · {whyPlayer.projection.expected.toFixed(1)} xPts</h2>
            <p>{whyPlayer.projection.fixtureLabels[0] ?? "No upcoming fixture"} · {whyPlayer.projection.confidence} confidence · {whyPlayer.projection.risk} risk</p>
            <div className={styles.componentGrid}>{Object.entries(whyPlayer.projection.components).map(([label, value]) => <div key={label}><span>{label.replace(/([A-Z])/g, " $1")}</span><strong>{value >= 0 ? "+" : ""}{value.toFixed(2)}</strong></div>)}</div>
            <small>Components shown are the model's one-Gameweek scoring contributions before rounding.</small>
          </section>
        </div>
      )}

      <footer className={styles.footer}><span>FPL Prism · Model v{MODEL_VERSION}</span><span>Independent project · Not affiliated with, endorsed by or sponsored by the Premier League.</span></footer>
    </main>
  );
}

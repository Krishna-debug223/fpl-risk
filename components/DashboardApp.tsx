"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BootstrapPayload, FplFixture, FplPlayer, FplTeam, HistoricalPayload, LivePointsPayload, ManagerPayload, NewsScanPayload, TeamIntelligencePayload } from "@/lib/types";
import {
  assessChips,
  historyBlendInfo,
  positionName,
  projectPlayer,
  recommendReplacements,
  recommendTeamTransfer,
  simulateTransfer,
  type ChipAdvice,
  type HistoricalProfileMap,
  type Recommendation,
  type TransferResult,
  MODEL_VERSION,
} from "@/lib/risk";
import { ArrowIcon, BoltIcon, GridIcon, MarketIcon, RefreshIcon, ShieldIcon, SwapIcon } from "./Icons";
import { DistributionChart, RiskReturnChart } from "./Charts";
import { trackProductEvent } from "@/lib/analytics";

type Tab = "overview" | "transfer" | "market" | "model";
type TransferSeed = { outId: number; inId: number; nonce: number } | null;

type SquadItem = {
  pick: ManagerPayload["picks"][number];
  player: FplPlayer;
};

const money = (value: number | null | undefined) => value == null ? "—" : `£${(value / 10).toFixed(1)}m`;
const rank = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("en-GB", { notation: value > 999999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
const num = (v: string | number | null | undefined) => Number.parseFloat(String(v ?? 0)) || 0;

export default function DashboardApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [fixtures, setFixtures] = useState<FplFixture[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalPayload | null>(null);
  const [teamIntelligenceLoaded, setTeamIntelligenceLoaded] = useState(false);
  const [manager, setManager] = useState<ManagerPayload | null>(null);
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [teamId, setTeamId] = useState("");
  const [dataError, setDataError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transferSeed, setTransferSeed] = useState<TransferSeed>(null);
  const [newsScan, setNewsScan] = useState<NewsScanPayload | null>(null);
  const [livePoints, setLivePoints] = useState<Record<number, { points: number; played: boolean }>>({});

  async function loadMarketData() {
    setRefreshing(true);
    setDataError("");
    try {
      const [bootstrapResponse, fixtureResponse] = await Promise.all([
        fetch("/api/fpl/bootstrap", { cache: "no-store" }),
        fetch("/api/fpl/fixtures", { cache: "no-store" }),
      ]);
      if (!bootstrapResponse.ok || !fixtureResponse.ok) throw new Error("FPL feed unavailable");
      const [bootstrapData, fixtureData] = await Promise.all([bootstrapResponse.json() as Promise<BootstrapPayload>, fixtureResponse.json()]);
      setBootstrap(bootstrapData);
      setFixtures(fixtureData.fixtures);

      // Optional model enhancements load independently so the core FPL experience stays fast and resilient.
      const [historicalResult, intelligenceResult] = await Promise.allSettled([
        fetch("/api/fpl/history", { cache: "no-store" }),
        fetch("/api/model/team-intelligence", { cache: "no-store" }),
      ]);

      if (historicalResult.status === "fulfilled" && historicalResult.value.ok) {
        setHistoricalData(await historicalResult.value.json());
      }

      if (intelligenceResult.status === "fulfilled" && intelligenceResult.value.ok) {
        const intelligence = await intelligenceResult.value.json() as TeamIntelligencePayload;
        const eloByTeam = new Map(intelligence.teams.map((team) => [team.id, team.elo]));
        setBootstrap((current) => current ? {
          ...current,
          teams: current.teams.map((team) => ({ ...team, elo: eloByTeam.get(team.id) })),
        } : current);
        setTeamIntelligenceLoaded(true);
      } else {
        setTeamIntelligenceLoaded(false);
      }
    } catch {
      setDataError("Live FPL data is temporarily unavailable. Try refreshing in a moment.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { void loadMarketData(); }, []);

  const currentEventId = bootstrap?.events.find((event) => event.is_next)?.id ?? bootstrap?.events.find((event) => event.is_current)?.id;
  const liveEventId = bootstrap?.events.find((event) => event.is_current)?.id ?? currentEventId;

  useEffect(() => {
    if (!currentEventId) return;
    let cancelled = false;
    const refreshNews = async () => {
      try {
        const response = await fetch(`/api/news/scan?event=${currentEventId}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as NewsScanPayload;
        if (!cancelled) setNewsScan(payload);
      } catch {
        // News is an enhancement; a temporary scan failure must not block the model.
      }
    };
    void refreshNews();
    const interval = window.setInterval(refreshNews, 5 * 60 * 1_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [currentEventId]);

  useEffect(() => {
    if (!liveEventId) return;
    let cancelled = false;
    const refreshLivePoints = async () => {
      try {
        const response = await fetch(`/api/fpl/live/${liveEventId}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as LivePointsPayload;
        if (cancelled) return;
        setLivePoints(Object.fromEntries(payload.elements.map((player) => [player.id, { points: player.points, played: player.played }])));
      } catch {
        // Keep the last successful points snapshot. The dashboard can still use bootstrap values.
      }
    };
    void refreshLivePoints();
    const interval = window.setInterval(refreshLivePoints, 60 * 1_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [liveEventId]);

  useEffect(() => {
    const eventByTab = {
      overview: "overview_viewed",
      transfer: "transfer_lab_viewed",
      market: "player_market_viewed",
      model: "model_viewed",
    } as const;
    trackProductEvent(eventByTab[tab]);
  }, [tab]);

  useEffect(() => {
    if (!manager) return;
    const saved = window.localStorage.getItem("fpl-risk-free-transfers");
    const parsed = saved == null ? 1 : Number.parseInt(saved, 10);
    setFreeTransfers(Number.isFinite(parsed) ? Math.max(0, Math.min(5, parsed)) : 1);
  }, [manager?.id]);

  function updateFreeTransfers(value: number) {
    const next = Math.max(0, Math.min(5, value));
    setFreeTransfers(next);
    window.localStorage.setItem("fpl-risk-free-transfers", String(next));
    trackProductEvent("free_transfers_set", { count: next });
  }

  async function importTeam(event?: React.FormEvent) {
    event?.preventDefault();
    if (!/^\d+$/.test(teamId.trim())) { setTeamError("Enter the numeric Team ID from your FPL URL."); return; }
    setTeamError("");
    setLoadingTeam(true);
    trackProductEvent("team_import_started");
    try {
      const response = await fetch("/api/fpl/entry", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not import team");
      setManager(data);
      setTab("overview");
      trackProductEvent("team_import_success", { gameweek: Number(data.eventId ?? 0) });
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Could not import that team.");
      trackProductEvent("team_import_failed");
    } finally {
      setLoadingTeam(false);
    }
  }

  function openTransfer(seed?: { outId: number; inId: number }) {
    if (seed) setTransferSeed({ ...seed, nonce: Date.now() });
    trackProductEvent("transfer_lab_opened", { source: seed ? "team_assessment" : "manual" });
    setTab("transfer");
  }

  function openModel(source: string) {
    trackProductEvent("model_opened", { source });
    setTab("model");
  }

  const currentEvent = bootstrap?.events.find((event) => event.is_current) ?? bootstrap?.events.find((event) => event.is_next);
  const playerMap = useMemo(() => new Map(bootstrap?.elements.map((player) => [player.id, player]) ?? []), [bootstrap]);
  const teamMap = useMemo(() => new Map(bootstrap?.teams.map((team) => [team.id, team]) ?? []), [bootstrap]);
  const squad: SquadItem[] = manager?.picks
    .map((pick) => ({ pick, player: playerMap.get(pick.element) }))
    .filter((item): item is SquadItem => Boolean(item.player)) ?? [];

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => setTab("overview")} aria-label="Go to FPL Risk overview">
            <div className="brand-mark"><ShieldIcon /></div>
            <div><strong>FPL RISK</strong><span>Decision analytics</span></div>
          </button>

          <nav className="nav" aria-label="Primary navigation">
            <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><GridIcon /> Overview</button>
            <button className={tab === "transfer" ? "active" : ""} onClick={() => setTab("transfer")}><SwapIcon /> Transfer Lab</button>
            <button className={tab === "market" ? "active" : ""} onClick={() => setTab("market")}><MarketIcon /> Player Market</button>
            <button className={tab === "model" ? "active" : ""} onClick={() => openModel("navigation")}><ShieldIcon /> Model</button>
          </nav>

          <div className="topbar-actions">
            <div className="competition-meta"><span className="season-tag">2026/27</span><span className="gw-tag">{currentEvent?.name ?? "LIVE FPL"}</span></div>
            <div className={`feed-status ${dataError ? "feed-error" : ""}`}><span /> {dataError ? "Feed issue" : refreshing ? "Syncing…" : "Live data"}</div>
            <button className="icon-button" onClick={() => void loadMarketData()} aria-label="Refresh live data"><RefreshIcon className={refreshing ? "spin" : ""} /></button>
          </div>
        </div>
      </header>

      {dataError && <div className="banner error-banner">{dataError}</div>}

      <section className="main-panel">
        <div className="content">
          {tab === "overview" && <Overview bootstrap={bootstrap} fixtures={fixtures} history={historicalData?.players} historicalData={historicalData} manager={manager} squad={squad} teamMap={teamMap} teamId={teamId} setTeamId={setTeamId} importTeam={importTeam} loadingTeam={loadingTeam} teamError={teamError} freeTransfers={freeTransfers} setFreeTransfers={updateFreeTransfers} onTransfer={openTransfer} onModel={() => openModel("overview")} newsScan={newsScan} livePoints={livePoints} />}
          {tab === "transfer" && <TransferLab bootstrap={bootstrap} fixtures={fixtures} history={historicalData?.players} squad={squad} manager={manager} freeTransfers={freeTransfers} setFreeTransfers={updateFreeTransfers} seed={transferSeed} onModel={() => openModel("transfer_lab")} />}
          {tab === "market" && <PlayerMarket bootstrap={bootstrap} fixtures={fixtures} history={historicalData?.players} />}
          {tab === "model" && <ModelPage historicalData={historicalData} teamIntelligenceLoaded={teamIntelligenceLoaded} />}
        </div>
      </section>

      <footer className="site-footer">
        <span>FPL Risk · Public Beta · Risk Model v{MODEL_VERSION}</span>
        <span className="footer-legal">Independent project · Not affiliated with the Premier League · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
      </footer>
    </main>
  );
}

function Overview({ bootstrap, fixtures, history, historicalData, manager, squad, teamMap, teamId, setTeamId, importTeam, loadingTeam, teamError, freeTransfers, setFreeTransfers, onTransfer, onModel, newsScan, livePoints }: {
  bootstrap: BootstrapPayload | null;
  fixtures: FplFixture[];
  history?: HistoricalProfileMap;
  historicalData: HistoricalPayload | null;
  manager: ManagerPayload | null;
  squad: SquadItem[];
  teamMap: Map<number, FplTeam>;
  teamId: string;
  setTeamId: (v: string) => void;
  importTeam: (e?: React.FormEvent) => void;
  loadingTeam: boolean;
  teamError: string;
  freeTransfers: number;
  setFreeTransfers: (value: number) => void;
  onTransfer: (seed?: { outId: number; inId: number }) => void;
  onModel: () => void;
  newsScan: NewsScanPayload | null;
  livePoints: Record<number, { points: number; played: boolean }>;
}) {
  if (!manager) {
    const top = bootstrap?.elements.filter((p) => p.minutes > 0).sort((a,b) => num(b.form)-num(a.form)).slice(0, 4) ?? [];
    return (
      <>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> LIVE 2026/27 DATA</div>
            <h1>Know the risk<br/><span>behind every move.</span></h1>
            <p>Import any public FPL team and quantify the upside, downside and uncertainty behind your transfers.</p>
            <form className="import-form" onSubmit={importTeam}>
              <div className="input-shell"><span>ID</span><input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="Enter FPL Team ID" inputMode="numeric" aria-label="FPL Team ID" /></div>
              <button type="submit" className="primary-button" disabled={loadingTeam}>{loadingTeam ? "Importing…" : <>Analyze team <ArrowIcon /></>}</button>
            </form>
            {teamError && <p className="field-error">{teamError}</p>}
            <p className="microcopy">No login or FPL password required. Uses public manager data.</p>
          </div>
          <div className="hero-visual">
            <div className="hero-index-card"><span>MODEL</span><strong>10K</strong><small>simulated paths</small></div>
            <div className="terminal-card floating">
              <div className="terminal-head"><span>TRANSFER OUTCOME</span><span className="positive">Calculated after import</span></div>
              <div className="preview-curve"><svg viewBox="0 0 360 120" aria-hidden="true"><path d="M0 107 C60 108 62 92 105 84 C144 76 146 21 193 18 C241 15 249 75 294 88 C326 98 344 104 360 107 L360 120 L0 120Z" fill="#00ff87" opacity="0.14"/><path d="M0 107 C60 108 62 92 105 84 C144 76 146 21 193 18 C241 15 249 75 294 88 C326 98 344 104 360 107" fill="none" stroke="#37003c" strokeWidth="3"/></svg></div>
              <div className="terminal-metrics"><div><span>Win probability</span><strong>—</strong></div><div><span>Downside risk</span><strong>—</strong></div><div><span>Outcome range</span><strong>—</strong></div></div>
              <div className="terminal-foot">10,000 simulated outcomes <span>YOUR TEAM DATA</span></div>
            </div>
          </div>
        </section>
        <section className="trust-strip"><span>LIVE PLAYER DATA</span><span>MONTE CARLO SIMULATION</span><span>BUDGET-AWARE AI</span><span>NO ACCOUNT REQUIRED</span></section>
        <NewsScanPanel scan={newsScan} />
        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">LIVE MARKET</span><h2>Form leaders right now</h2></div><span className="muted">Pulled from FPL when this page loads</span></div>
          <div className="leader-grid">
            {top.map((player, index) => <div className="leader-card" key={player.id}><div className="leader-rank">0{index+1}</div><div className="player-avatar">{player.web_name.slice(0,2).toUpperCase()}</div><div><strong>{player.web_name}</strong><span>{teamMap.get(player.team)?.short_name} · {positionName(player.element_type)}</span></div><div className="leader-stat"><strong>{num(player.form).toFixed(1)}</strong><span>FORM</span></div></div>)}
            {!bootstrap && Array.from({length:4}).map((_,i) => <div key={i} className="leader-card skeleton" />)}
          </div>
        </section>
      </>
    );
  }

  const players = bootstrap?.elements ?? [];
  const teams = bootstrap?.teams ?? [];
  const squadPlayers = squad.map(({ player }) => player);
  const sellingPrices = new Map(squad.map(({ pick, player }) => [player.id, pick.selling_price ?? player.now_cost]));
  const recommendation = recommendTeamTransfer({
    players,
    squad: squadPlayers,
    fixtures,
    teams,
    bank: manager.bank ?? 0,
    sellingPrices,
    horizon: 5,
    history,
    freeTransfers,
  });
  const recOut = recommendation ? players.find((p) => p.id === recommendation.outgoingId) : null;
  const recIn = recommendation ? players.find((p) => p.id === recommendation.incomingId) : null;
  const projections = squad.map(({player}) => projectPlayer(player, fixtures, teams, 5, history));
  const starters = squad.filter(({pick}) => pick.position <= 11);
  const projected = starters.reduce((sum, {pick, player}) => sum + projectPlayer(player, fixtures, teams, 1, history).expected * pick.multiplier, 0);
  const expectedByPlayer = new Map(squad.map(({ player }) => [player.id, projectPlayer(player, fixtures, teams, 1, history).expected]));
  const avgRisk = projections.length ? projections.reduce((sum,p) => sum + p.volatility,0)/projections.length : 0;
  const ownership = starters.length ? starters.reduce((sum,{player}) => sum + num(player.selected_by_percent),0)/starters.length : 0;
  const benchPlayers = squad.filter(({ pick }) => pick.position > 11).map(({ player }) => player);
  const chipAdvice = assessChips({
    players,
    squad: squadPlayers,
    starters: starters.map(({ player }) => player),
    bench: benchPlayers,
    fixtures,
    teams,
    events: bootstrap?.events ?? [],
    history,
    chipsUsed: manager.chipsUsed ?? [],
    freeTransfers,
  });
  const assessmentTitle = recOut && recIn ? `${recOut.web_name} → ${recIn.web_name}` : freeTransfers < 5 ? "Roll the transfer" : "No urgent move identified";

  return (
    <>
      <div className="page-title-row"><div><span className="eyebrow">TEAM #{manager.id}</span><h1 className="page-title">{manager.teamName}</h1><p>{manager.managerName} · Imported from {manager.eventId ? `GW${manager.eventId}` : "FPL"}</p></div><button className="secondary-button" onClick={() => onTransfer()}><SwapIcon /> Open Transfer Lab</button></div>
      <FreeTransferBar value={freeTransfers} onChange={setFreeTransfers} />
      <NewsScanPanel scan={newsScan} />
      <div className="metric-grid">
        <Metric label="Projected next GW" value={`${projected.toFixed(1)}`} suffix="xPts" tone="positive" />
        <Metric label="Overall rank" value={rank(manager.overallRank)} suffix="OR" />
        <Metric label="Squad value" value={money(manager.teamValue)} suffix={`${money(manager.bank)} bank`} />
        <Metric label="Portfolio risk" value={avgRisk < 7 ? "LOW" : avgRisk < 10 ? "MED" : "HIGH"} suffix={`${avgRisk.toFixed(1)} σ`} tone={avgRisk < 10 ? "positive" : "warning"} />
      </div>

      <section className="ai-assessment">
        <div className="ai-assessment-head">
          <div className="ai-orb"><BoltIcon /></div>
          <div><span className="eyebrow">FPL RISK AI · TEAM ASSESSMENT</span><h2>{assessmentTitle}</h2></div>
          {recommendation && <span className={`confidence-pill ${recommendation.confidence.toLowerCase()}`}>{recommendation.confidence} conviction</span>}
        </div>
        {recommendation && recOut && recIn ? (
          <div className="ai-assessment-body">
            <div className="ai-main-call">
              <span>MODEL-RECOMMENDED TRANSFER</span>
              <div className="ai-transfer-line"><strong>{recOut.web_name}</strong><ArrowIcon/><strong>{recIn.web_name}</strong></div>
              <p>The engine sees the strongest risk-adjusted five-Gameweek upgrade while respecting budget, position, club limits and the option value of your {freeTransfers} banked free transfer{freeTransfers === 1 ? "" : "s"}.</p>
              <div className="ai-reason-list">{recommendation.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
            </div>
            <div className="ai-scoreboard">
              <div><span>5GW EDGE</span><strong className={recommendation.expectedGain >= 0 ? "positive-text" : "negative-text"}>{recommendation.expectedGain >= 0 ? "+" : ""}{recommendation.expectedGain.toFixed(1)}</strong><small>projected points</small></div>
              <div><span>BUDGET</span><strong>{money(recommendation.budget)}</strong><small>available for replacement</small></div>
              <div><span>RISK</span><strong>{recommendation.outgoingRisk} → {recommendation.incomingRisk}</strong><small>model classification</small></div>
            </div>
            <div className="ai-actions"><button className="primary-button" onClick={() => onTransfer({ outId: recommendation.outgoingId, inId: recommendation.incomingId })}>Review this move <ArrowIcon /></button><button className="text-button" onClick={onModel}>Why this recommendation?</button></div>
          </div>
        ) : (
          <div className="ai-empty"><p>{squad.length === 15 ? `No single transfer clears the model's risk-adjusted threshold. With ${freeTransfers} free transfer${freeTransfers === 1 ? "" : "s"}, holding the move preserves flexibility for a stronger opportunity.` : "The engine needs a complete live squad and player market before it can rank legal upgrades."}</p><button className="text-button" onClick={onModel}>See how the model works</button></div>
        )}
      </section>

      <section className="chip-advisor panel">
        <div className="panel-head chip-advisor-head"><div><span className="eyebrow">AI CHIP PLANNER</span><h2>When should you use your chips?</h2><p>The model scans your current squad and the next six Gameweeks, while respecting the 2026/27 two-set chip structure.</p></div><button className="text-button" onClick={onModel}>Methodology →</button></div>
        <div className="chip-grid">
          {chipAdvice.map((chip) => <ChipCard key={chip.key} chip={chip} />)}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel pitch-panel">
          <div className="panel-head"><div><span className="eyebrow">YOUR SQUAD</span><h2>Starting XI</h2><p className="panel-subtitle">Actual points update live · xPts is the model projection for this Gameweek</p></div><span className="muted">Avg ownership {ownership.toFixed(1)}%</span></div>
          <div className="pitch">
            {[1,2,3,4].map((position) => <div className={`pitch-row pitch-row-${position}`} key={position}>{starters.filter(({player}) => player.element_type === position).map(({player,pick}) => <PlayerChip key={player.id} player={player} team={teamMap.get(player.team)} captain={pick.is_captain} expected={expectedByPlayer.get(player.id)} actual={livePoints[player.id]?.played ? livePoints[player.id].points : null} />)}</div>)}
          </div>
          <div className="bench"><span>BENCH</span>{squad.filter(({pick}) => pick.position > 11).map(({player}) => <PlayerChip compact key={player.id} player={player} team={teamMap.get(player.team)} expected={expectedByPlayer.get(player.id)} actual={livePoints[player.id]?.played ? livePoints[player.id].points : null} />)}</div>
        </section>
        <section className="panel intel-panel">
          <div className="panel-head"><div><span className="eyebrow">PORTFOLIO INTELLIGENCE</span><h2>Squad signals</h2></div></div>
          <Signal label="Expected output" value={`${projections.reduce((s,p)=>s+p.expected,0).toFixed(1)} xPts`} bar={74} status="Healthy" />
          <Signal label="Ownership concentration" value={`${ownership.toFixed(1)}% avg`} bar={Math.min(ownership*1.8,100)} status={ownership > 38 ? "Template-heavy" : "Balanced"} />
          <Signal label="Availability" value={`${squad.filter(({player}) => (player.chance_of_playing_next_round ?? 100) >= 75).length}/15`} bar={(squad.filter(({player}) => (player.chance_of_playing_next_round ?? 100)>=75).length/15)*100} status="Available" />
          <div className="intel-callout"><BoltIcon /><div><strong>Model transparency</strong><p>Every recommendation can be traced to live inputs, historical priors where available, transfer rules and a risk-adjusted scoring process.</p></div><button onClick={onModel}>Inspect <ArrowIcon /></button></div>
        </section>
      </div>
    </>
  );
}

function NewsScanPanel({ scan }: { scan: NewsScanPayload | null }) {
  const stateLabel = scan?.windowState === "active"
    ? "ACTIVE — LAST HOUR"
    : scan?.windowState === "closed"
      ? "DEADLINE PASSED"
      : "SCHEDULED";
  const alerts = scan?.alerts.slice(0, 5) ?? [];

  return (
    <section className="panel news-scan-panel">
      <div className="panel-head news-scan-head">
        <div><span className="eyebrow">LAST-MINUTE INPUTS</span><h2>Deadline news scan</h2><p>Official FPL availability and injury news is checked continuously. The one-hour scan window is shown here before the deadline.</p></div>
        <span className={`news-scan-state ${scan?.windowState ?? "loading"}`}>{scan ? stateLabel : "SYNCING"}</span>
      </div>
      {!scan ? <div className="news-scan-empty">Waiting for the official FPL feed…</div> : alerts.length === 0 ? <div className="news-scan-empty">No flagged availability news for the current Gameweek.</div> : (
        <div className="news-scan-list">
          {alerts.map((alert) => <div className="news-scan-row" key={alert.playerId}>
            <span className={`news-severity ${alert.severity}`} aria-label={`${alert.severity} severity`} />
            <div><strong>{alert.playerName}</strong><span>{alert.team} · {alert.news}</span></div>
            <b>{alert.chanceOfPlaying == null ? "—" : `${alert.chanceOfPlaying}%`}</b>
          </div>)}
        </div>
      )}
      {scan && <div className="news-scan-foot"><span>{scan.summary.total} flagged player{scan.summary.total === 1 ? "" : "s"} · {scan.summary.high} high risk</span><span>Checked {new Date(scan.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Official FPL feed</span></div>}
    </section>
  );
}

function TransferLab({ bootstrap, fixtures, history, squad, manager, freeTransfers, setFreeTransfers, seed, onModel }: {
  bootstrap: BootstrapPayload | null;
  fixtures: FplFixture[];
  history?: HistoricalProfileMap;
  squad: SquadItem[];
  manager: ManagerPayload | null;
  freeTransfers: number;
  setFreeTransfers: (value: number) => void;
  seed: TransferSeed;
  onModel: () => void;
}) {
  const players = bootstrap?.elements ?? [];
  const teams = bootstrap?.teams ?? [];
  const squadPlayers = squad.map(({ player }) => player);
  const [outId, setOutId] = useState<number | null>(null);
  const [inId, setInId] = useState<number | null>(null);
  const [horizon, setHorizon] = useState(5);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (seed) {
      setOutId(seed.outId);
      setInId(seed.inId);
      setResult(null);
      return;
    }
    if (!outId && squad[0]) setOutId(squad[0].player.id);
  }, [squad, outId, seed]);

  const outgoing = players.find((p) => p.id === outId) ?? null;
  const outgoingSquadItem = squad.find(({ player }) => player.id === outId);
  const sellingPrice = outgoingSquadItem?.pick.selling_price ?? outgoing?.now_cost ?? 0;
  const availableBudget = sellingPrice + (manager?.bank ?? 0);
  const squadIds = new Set(squadPlayers.map((player) => player.id));
  const clubCountsAfterSale = new Map<number, number>();
  squadPlayers.filter((player) => player.id !== outId).forEach((player) => clubCountsAfterSale.set(player.team, (clubCountsAfterSale.get(player.team) ?? 0) + 1));

  const eligibleIncoming = players
    .filter((player) => player.id !== outId && (!outgoing || player.element_type === outgoing.element_type))
    .filter((player) => !manager || (!squadIds.has(player.id) && player.now_cost <= availableBudget && (clubCountsAfterSale.get(player.team) ?? 0) < 3))
    .sort((a,b)=> num(b.form)-num(a.form));
  const incoming = players.find((p) => p.id === inId) ?? null;

  const aiPicks = outgoing ? recommendReplacements({
    players,
    squad: squadPlayers,
    fixtures,
    teams,
    outgoing,
    bank: manager?.bank ?? 0,
    sellingPrice: outgoingSquadItem?.pick.selling_price,
    horizon,
    limit: 3,
    history,
    freeTransfers,
  }) : [];

  function useRecommendation(recommendation: Recommendation, rankIndex: number) {
    setInId(recommendation.incomingId);
    setResult(null);
    trackProductEvent("ai_recommendation_selected", {
      rank: rankIndex + 1,
      horizon,
      confidence: recommendation.confidence,
      risk: recommendation.incomingRisk,
    });
  }

  function run() {
    if (!outgoing || !incoming) return;
    setRunning(true);
    window.setTimeout(() => {
      const simulation = simulateTransfer(outgoing, incoming, fixtures, teams, horizon, 10000, freeTransfers > 0 ? 0 : 4, history);
      setResult(simulation);
      trackProductEvent("transfer_simulation_run", {
        horizon,
        freeTransfers,
        hitApplied: freeTransfers === 0,
        verdict: simulation.expectedGain >= 3 ? "positive" : simulation.expectedGain > 0 ? "marginal" : "negative",
        successBand: simulation.successProbability >= 65 ? "65_plus" : simulation.successProbability >= 50 ? "50_64" : "under_50",
      });
      setRunning(false);
    }, 30);
  }

  const outProjection = outgoing ? projectPlayer(outgoing, fixtures, teams, horizon, history) : null;
  const inProjection = incoming ? projectPlayer(incoming, fixtures, teams, horizon, history) : null;
  const verdict = result ? result.expectedGain >= 3 ? "Positive edge" : result.expectedGain > 0 ? "Marginal edge" : "Negative edge" : "Awaiting simulation";

  return (
    <>
      <div className="page-title-row"><div><span className="eyebrow">DECISION ENGINE</span><h1 className="page-title">Transfer Lab</h1><p>Choose a player out, let the model rank legal replacements, then simulate the move.</p></div><div className="method-badge"><span className="live-dot" /> 10,000 paths</div></div>
      <div className="transfer-layout">
        <section className="panel transfer-builder">
          <div className="panel-head"><div><span className="eyebrow">BUILD A MOVE</span><h2>Transfer setup</h2></div></div>
          <label className="select-label">PLAYER OUT</label>
          <PlayerSelect value={outId} onChange={(id) => {setOutId(id); setInId(null); setResult(null);}} players={squad.length ? squadPlayers : players.slice().sort((a,b)=>num(b.selected_by_percent)-num(a.selected_by_percent)).slice(0,30)} teams={teams} placeholder={manager ? "Choose from your squad" : "Choose a player"} />

          {outgoing && (
            <div className="ai-recommendation-box">
              <div className="ai-rec-title"><div><BoltIcon/><span>AI RECOMMENDATIONS</span></div><button className="text-button small" onClick={onModel}>How ranked?</button></div>
              <p>Best legal {positionName(outgoing.element_type)} replacements for {money(availableBudget)} or less, ranked over {horizon} GW{horizon > 1 ? "s" : ""} using underlying xG/xA, team xG/xGA, minutes security and opponent-adjusted fixtures.</p>
              <div className="ai-pick-list">
                {aiPicks.map((recommendation, index) => {
                  const player = players.find((p) => p.id === recommendation.incomingId);
                  if (!player) return null;
                  return <button type="button" className={`ai-pick ${inId === player.id ? "selected" : ""}`} key={player.id} onClick={() => useRecommendation(recommendation, index)}>
                    <span className="ai-pick-rank">0{index + 1}</span>
                    <span className="ai-pick-player"><strong>{player.web_name}</strong><small>{money(player.now_cost)} · {recommendation.incomingRisk} risk · {recommendation.fixtureEdge >= 0.04 ? "fixture edge" : recommendation.fixtureEdge <= -0.04 ? "tougher run" : "neutral run"}</small></span>
                    <span className="ai-pick-edge"><strong>{recommendation.expectedGain >= 0 ? "+" : ""}{recommendation.expectedGain.toFixed(1)}</strong><small>{horizon}GW edge</small></span>
                    <span className={`confidence-dot ${recommendation.confidence.toLowerCase()}`}>{recommendation.confidence}</span>
                  </button>;
                })}
                {!aiPicks.length && <div className="ai-no-pick">No legal replacement clears the recommendation filter yet.</div>}
              </div>
            </div>
          )}

          <div className="swap-divider"><span /><SwapIcon /><span /></div>
          <label className="select-label">PLAYER IN</label>
          <PlayerSelect value={inId} onChange={(id) => {setInId(id); setResult(null);}} players={eligibleIncoming} teams={teams} placeholder="Choose replacement" />
          {manager && outgoing && <div className="budget-line"><span>Available budget</span><strong>{money(availableBudget)}</strong><small>selling price + {money(manager.bank)} bank</small></div>}
          <div className="control-row"><div><label className="select-label">HORIZON</label><div className="segmented">{[1,3,5].map((gw) => <button key={gw} className={horizon===gw?"active":""} onClick={()=>{setHorizon(gw);setResult(null);}}>{gw} GW</button>)}</div></div><div className="transfer-cost-box"><span>TRANSFER COST</span><strong className={freeTransfers > 0 ? "positive-text" : "negative-text"}>{freeTransfers > 0 ? "0 pts" : "-4 pts"}</strong><small>{freeTransfers > 0 ? `${freeTransfers} free transfer${freeTransfers === 1 ? "" : "s"} available` : "No free transfers remaining"}</small></div></div>
          {manager && <div className="transfer-ft-inline"><span>Free transfers remaining</span><FreeTransferSelector value={freeTransfers} onChange={(value) => { setFreeTransfers(value); setResult(null); }} compact /></div>}
          {outgoing && incoming && <div className="comparison-mini"><div><span>{outgoing.web_name}</span><strong>{outProjection?.expected.toFixed(1)} xPts</strong><small>{outProjection?.risk} risk · {money(outgoing.now_cost)}</small></div><ArrowIcon/><div><span>{incoming.web_name}</span><strong>{inProjection?.expected.toFixed(1)} xPts</strong><small>{inProjection?.risk} risk · {money(incoming.now_cost)}</small></div></div>}
          <button className="primary-button full" onClick={run} disabled={!outgoing || !incoming || running}>{running ? "Simulating 10,000 paths…" : <><BoltIcon /> Run simulation</>}</button>
          <p className="model-note">FPL Risk AI is an underlying-data projection engine. Recent FPL points do not drive the forecast: player xG/xA, team xG/xGA, expected minutes, opponent strength, FDR and decaying historical priors build the projection before the 10,000-path risk simulation.</p>
        </section>

        <section className="panel results-panel">
          <div className="panel-head"><div><span className="eyebrow">SIMULATION OUTPUT</span><h2>{outgoing && incoming ? `${outgoing.web_name} → ${incoming.web_name}` : "Choose a transfer"}</h2></div>{result && <span className={`verdict ${result.expectedGain>=0?"good":"bad"}`}>{verdict}</span>}</div>
          <div className="results-metrics">
            <ResultMetric label="Expected gain" value={result ? `${result.expectedGain>=0?"+":""}${result.expectedGain.toFixed(1)}` : "—"} suffix="pts" highlight />
            <ResultMetric label="Success probability" value={result ? `${result.successProbability.toFixed(0)}%` : "—"} suffix="beats hold" />
            <ResultMetric label="Downside risk" value={result ? `${result.downsideProbability.toFixed(0)}%` : "—"} suffix="loses 5+" />
            <ResultMetric label="Outcome volatility" value={result ? result.volatility.toFixed(1) : "—"} suffix="σ points" />
          </div>
          <DistributionChart samples={result?.samples ?? []} />
          <div className="percentile-row"><div><span>10TH PERCENTILE</span><strong>{result ? `${result.p10>0?"+":""}${result.p10.toFixed(0)}` : "—"}</strong><small>Downside case</small></div><div><span>MEDIAN</span><strong>{result ? `${result.median>0?"+":""}${result.median.toFixed(0)}` : "—"}</strong><small>Middle outcome</small></div><div><span>90TH PERCENTILE</span><strong>{result ? `${result.p90>0?"+":""}${result.p90.toFixed(0)}` : "—"}</strong><small>Upside case</small></div></div>
          <div className="verdict-card"><div className="verdict-icon"><ShieldIcon /></div><div><span className="eyebrow">MODEL READ</span><p>{!result ? "Run the model to get a plain-English read on the risk/reward profile." : result.expectedGain > 2.5 ? `The move has positive expected value across ${horizon} Gameweek${horizon>1?"s":""}. It wins in ${result.successProbability.toFixed(0)}% of simulations, but ${result.downsideProbability.toFixed(0)}% of paths still lose at least five points — useful upside without pretending the outcome is certain.` : result.expectedGain > 0 ? `There is a small expected edge, but the distribution is close enough that uncertainty dominates. This is a preference call rather than a high-conviction transfer.` : `The replacement underperforms the hold on expected value in this model. The upside exists, but you are taking additional decision risk without being compensated by the average simulated outcome.`}</p><button className="text-button inline-model-link" onClick={onModel}>Inspect model methodology →</button></div></div>
        </section>
      </div>
    </>
  );
}

function PlayerMarket({ bootstrap, fixtures, history }: { bootstrap: BootstrapPayload | null; fixtures: FplFixture[]; history?: HistoricalProfileMap }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(0);
  const players = bootstrap?.elements ?? [];
  const teams = bootstrap?.teams ?? [];
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const ranked = players.filter((p) => p.minutes > 0 && (!position || p.element_type === position) && p.web_name.toLowerCase().includes(query.toLowerCase())).map((player) => ({player, projection: projectPlayer(player, fixtures, teams, 5, history), historyInfo: historyBlendInfo(player, history)})).sort((a,b)=>b.projection.expected-a.projection.expected).slice(0,80);

  return (
    <>
      <div className="page-title-row"><div><span className="eyebrow">LIVE MARKET</span><h1 className="page-title">Player Risk Map</h1><p>Find players offering the strongest projected return for the uncertainty you take.</p></div></div>
      <section className="panel market-chart-panel"><div className="panel-head"><div><span className="eyebrow">RISK / RETURN</span><h2>5-Gameweek opportunity map</h2></div><div className="chart-legend"><span><i className="legend-gkp"/>GKP</span><span><i className="legend-def"/>DEF</span><span><i className="legend-mid"/>MID</span><span><i className="legend-fwd"/>FWD</span></div></div>{bootstrap ? <RiskReturnChart players={players} fixtures={fixtures} teams={teams} history={history}/> : <div className="chart-empty">Loading live player market…</div>}</section>
      <section className="panel market-table-panel"><div className="market-tools"><div><span className="eyebrow">PLAYER SCREENER</span><h2>Projected leaders</h2></div><div className="filters"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search player"/><select value={position} onChange={(e)=>setPosition(Number(e.target.value))}><option value={0}>All positions</option><option value={1}>Goalkeepers</option><option value={2}>Defenders</option><option value={3}>Midfielders</option><option value={4}>Forwards</option></select></div></div>
        <div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>PRICE</th><th>FORM</th><th>5GW xPTS</th><th>RISK</th><th>HIST PRIOR</th><th>OWNED</th><th>NET TRANSFERS</th></tr></thead><tbody>{ranked.map(({player,projection,historyInfo}) => <tr key={player.id}><td><div className="table-player"><div className="mini-avatar">{player.web_name.slice(0,2).toUpperCase()}</div><div><strong>{player.web_name}</strong><span>{teamMap.get(player.team)?.short_name} · {positionName(player.element_type)}</span></div></div></td><td>{money(player.now_cost)}</td><td>{num(player.form).toFixed(1)}</td><td className="positive-text"><strong>{projection.expected.toFixed(1)}</strong></td><td><span className={`risk-pill ${projection.risk.toLowerCase()}`}>{projection.risk}</span></td><td>{historyInfo.seasons ? <span className="history-pill">{historyInfo.seasons}S · {Math.round(historyInfo.influence * 100)}%</span> : <span className="muted">—</span>}</td><td>{num(player.selected_by_percent).toFixed(1)}%</td><td className={player.transfers_in_event-player.transfers_out_event>=0?"positive-text":"negative-text"}>{player.transfers_in_event-player.transfers_out_event>=0?"+":""}{rank(player.transfers_in_event-player.transfers_out_event)}</td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}

function ModelPage({ historicalData, teamIntelligenceLoaded }: { historicalData: HistoricalPayload | null; teamIntelligenceLoaded: boolean }) {
  return (
    <>
      <div className="model-hero">
        <div><span className="eyebrow">MODEL TRANSPARENCY</span><h1 className="page-title">Why the model says what it says.</h1><p>FPL Risk does not hide a transfer behind a black-box score. Model v1.1 builds FPL scoring components from underlying performance rather than recent point hauls, applies opponent and team context, enforces legal squad constraints, then quantifies the transfer with a reproducible risk simulation.</p></div>
        <div className="model-version"><span>RISK MODEL</span><strong>v{MODEL_VERSION}</strong><small>Launch baseline · explainable by design</small></div>
      </div>

      <section className="model-flow" aria-label="Model pipeline">
        <ModelStep number="01" title="Live + prior data" text="Live FPL minutes, player xG/xA, team-level xG/xGA, availability and fixtures are combined with up to three completed Premier League seasons. Small current-season samples are shrunk toward those priors instead of being extrapolated." />
        <ModelStep number="02" title="Score the actual FPL actions" text="Expected points are built from expected minutes, regressed xG/xA rates, opponent-adjusted clean-sheet probability, saves, defensive contributions, bonus and discipline. Recent goals, clean sheets and FPL points are outcomes—not the main forecast inputs." />
        <ModelStep number="03" title="Rank net decisions" text="Candidates are filtered to legal transfers and ranked on net expected gain after any -4 hit, uncertainty, availability and the option value of banking a free transfer. Ownership and transfer hype do not determine the recommendation." />
        <ModelStep number="04" title="10,000 reproducible outcomes" text="A seeded Monte Carlo simulation turns the projection into a distribution. The same inputs reproduce the same result, while appearance uncertainty is modelled once rather than double-counted." />
      </section>

      <div className="model-grid">
        <section className="panel model-card wide">
          <span className="eyebrow">PLAYER PROJECTION</span><h2>How expected points are built</h2>
          <p className="model-copy">v1.1 models the underlying events that create future FPL points. Current xG/xA and defensive rates are sample-size regressed, while actual recent point hauls are deliberately prevented from dominating the forecast.</p>
          <div className="formula-block"><code>component xPts = expected minutes + regressed xG goals + regressed xA assists + xGA clean-sheet probability + saves + DefCon + bonus − discipline</code><code>fixture xPts = component model × xG/xGA matchup context + small calibration anchor</code></div>
          <div className="weight-grid">
            <Weight label="Expected minutes" value="Core" text="Start probability, cameo probability and likely minutes if starting" />
            <Weight label="Attacking output" value="xG/xA" text="Position-specific goal points plus assists" />
            <Weight label="Defensive output" value="Poisson" text="Clean sheets, saves, goals conceded and DefCon thresholds" />
            <Weight label="Team / fixture context" value="xG/xGA first" text="Team chance quality, opponent xGA, home/away, FDR, static strength and optional Elo" />
            <Weight label="Historical prior" value="0–55%" text="Strongest early, fades to zero by 900 current-season minutes" />
            <Weight label="Recent FPL points" value="Not a driver" text="Goals, clean sheets, Form and PPG do not get multiplied forward after a haul" /><Weight label="Calibration anchor" value="6–14%" text="Historical level, ep_next and price are only a small guardrail around the component model" />
          </div>
          <p className="method-foot">Current team xG and xGA are shrunk toward league average early in the season and become more influential as matches accumulate. Actual scorelines are only a small residual signal because finishing and clean-sheet outcomes are noisy. FPL team ratings and optional Elo remain supporting priors rather than the core forecast. Scoring components follow the current official FPL scoring structure, including defensive-contribution thresholds.</p>
        </section>

        <section className="panel model-card">
          <span className="eyebrow">TRANSFER RULES</span><h2>What the recommendation engine will never ignore</h2>
          <ul className="check-list"><li>Same FPL position as the outgoing player</li><li>Replacement price must fit selling price + money in the bank</li><li>Already-owned players are excluded</li><li>Maximum three players from one Premier League club</li><li>Unavailable / ineligible players are removed from recommendations</li><li>You tell the model how many free transfers remain (0–5); a one-player move costs -4 only when none remain</li></ul>
        </section>

        <section className="panel model-card">
          <span className="eyebrow">RANKING SCORE</span><h2>Why one legal player ranks above another</h2>
          <p className="model-copy">Expected points remain the dominant signal. The engine then asks whether the extra return requires meaningfully more uncertainty.</p>
          <div className="score-stack"><div><span>Net expected gain</span><strong>Primary</strong></div><div><span>-4 hit when no free transfers remain</span><strong>Fully deducted</strong></div><div><span>Fixture + team quality</span><strong>Baked into xPts</strong></div><div><span>Added volatility</span><strong>Small penalty</strong></div><div><span>Availability</span><strong>Adjustment</strong></div><div><span>Banked-transfer option value</span><strong>Decision penalty / bonus</strong></div><div><span>Ownership / transfer hype</span><strong>Not used to rank</strong></div></div>
        </section>


        <section className="panel model-card wide">
          <span className="eyebrow">MODEL DATA HEALTH</span><h2>What is powering the model right now</h2>
          <div className="score-stack">
            <div><span>Live FPL player xG/xA + fixture feed</span><strong>Required</strong></div><div><span>Derived team xG/xGA matchup layer</span><strong>Active from live FPL underlying stats</strong></div>
            <div><span>Historical player priors</span><strong>{historicalData ? `${historicalData.seasons.length}/3 seasons${historicalData.partial ? " (partial)" : ""}` : "Live-only fallback"}</strong></div>
            <div><span>Club Elo team-strength enhancement</span><strong>{teamIntelligenceLoaded ? "Active" : "FPL-strength fallback"}</strong></div>
            <div><span>Simulation reproducibility</span><strong>Seeded / deterministic</strong></div>
          </div>
          <p className="method-foot">The app does not fail just because an optional research feed is unavailable. Historical and Elo sources improve the estimate when present; live FPL data and its own team-strength ratings remain the launch-safe fallback. Optional Elo source: <a href="https://github.com/olbauday/FPL-Core-Insights" target="_blank" rel="noreferrer">FPL-Core-Insights / ClubElo</a>.</p>
        </section>

        <section className="panel model-card wide historical-method">
          <span className="eyebrow">EARLY-SEASON STABILIZER</span><h2>How past Premier League seasons enter the model</h2>
          <p className="model-copy">For a player with Premier League history, the model builds a recency-weighted baseline from up to the last three completed seasons. The newest season gets the most weight, and seasons with meaningful minutes count more than tiny samples.</p>
          <div className="history-decay"><div><strong>GW1 / 0 min</strong><span>up to 55% historical influence</span></div><i /><div><strong>~450 min</strong><span>about half the prior remains</span></div><i /><div><strong>900+ min</strong><span>0% historical influence</span></div></div>
                    <p className="method-foot">Historical feed: {historicalData ? `${historicalData.seasons.join(", ")} loaded` : "loading / graceful live-only fallback"}. Historical source: <a href="https://github.com/vaastav/Fantasy-Premier-League" target="_blank" rel="noreferrer">Vaastav's Fantasy Premier League dataset</a>. The repository's code is MIT-licensed; underlying football/game data remains third-party property. Current-season FPL data always remains the live layer.</p>
        </section>

        <section className="panel model-card wide">
          <span className="eyebrow">CHIP DECISION ENGINE</span><h2>How chip timing is assessed</h2>
          <div className="outcome-grid"><Outcome label="Wildcard" text="Squad repair load vs the free transfers already banked" /><Outcome label="Free Hit" text="Blank/availability pressure and projected XI weakness across the next six GWs" /><Outcome label="Bench Boost" text="Projected bench output and how many bench players have usable fixtures" /><Outcome label="Triple Captain" text="Best single-player projection, with extra weight for Double Gameweeks" /></div>
          <p className="method-foot">The planner also checks whether a chip was already used in the current half and the first-set expiry before GW19. It recommends HOLD when the model does not see enough edge.</p>
        </section>

        <section className="panel model-card wide">
          <span className="eyebrow">MONTE CARLO RISK ENGINE</span><h2>Why we simulate instead of only showing xPts</h2>
          <div className="simulation-explainer"><div className="sim-number">10,000</div><p>For a chosen transfer, each simulated Gameweek samples player availability and a points outcome around the model mean. The distribution is deliberately right-skewed to allow occasional double-digit hauls and also includes low-return appearances. We then compare the transfer path against simply holding the outgoing player.</p></div>
          <div className="outcome-grid"><Outcome label="Expected gain" text="Average transfer advantage across all paths" /><Outcome label="Success probability" text="Share of model-generated paths where transfer beats hold; not yet a historically calibrated real-world frequency" /><Outcome label="Downside risk" text="Share where the move loses at least five points" /><Outcome label="Percentiles" text="Representative bad, middle and upside cases" /></div>
        </section>

        <section className="panel limitations-card">
          <div><span className="eyebrow">LIMITATIONS</span><h2>What the model does not know yet</h2></div>
          <div className="limitations-grid"><p><strong>Lineups can surprise it.</strong> Public FPL data cannot perfectly predict tactical rotation, late injuries or manager decisions.</p><p><strong>Historical form is not destiny.</strong> Club changes, role changes and tactical shifts can make an old-season baseline less representative; that is why its weight automatically decays.</p><p><strong>Player outcomes are not fully independent.</strong> A future version will model correlations between teammates and opposing players.</p><p><strong>It is a decision aid, not certainty.</strong> A high-quality decision can still lose in one real Gameweek. That uncertainty is exactly what the risk layer is designed to show.</p></div>
        </section>
      </div>
    </>
  );
}

function FreeTransferSelector({ value, onChange, compact = false }: { value: number; onChange: (value: number) => void; compact?: boolean }) {
  return <div className={`free-transfer-selector ${compact ? "compact" : ""}`} role="group" aria-label="Free transfers remaining">{[0,1,2,3,4,5].map((count) => <button type="button" key={count} className={value === count ? "active" : ""} onClick={() => onChange(count)}>{count}</button>)}</div>;
}

function FreeTransferBar({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <section className="free-transfer-bar"><div><span className="eyebrow">MANAGER INPUT</span><strong>How many free transfers do you have?</strong><p>FPL's public team feed does not reliably expose your current bank, so tell the model. You can bank up to five.</p></div><div className="free-transfer-control"><FreeTransferSelector value={value} onChange={onChange} /><small>{value === 0 ? "Your next single transfer is modelled at -4 points." : `${value} free transfer${value === 1 ? "" : "s"} available before a hit.`}</small></div></section>;
}

function ChipCard({ chip }: { chip: ChipAdvice }) {
  return <article className={`chip-card status-${chip.status.toLowerCase()}`}><div className="chip-card-top"><strong>{chip.label}</strong><span>{chip.status}</span></div><h3>{chip.headline}</h3><p>{chip.reason}</p><div className="chip-card-foot"><span>{chip.targetGw ? `TARGET GW${chip.targetGw}` : "NO TARGET YET"}</span><small>Model score {chip.score.toFixed(1)}</small></div></article>;
}

function ModelStep({ number, title, text }: { number: string; title: string; text: string }) { return <div className="model-step"><span>{number}</span><strong>{title}</strong><p>{text}</p></div>; }
function Weight({ label, value, text }: { label: string; value: string; text: string }) { return <div className="weight"><strong>{value}</strong><div><span>{label}</span><small>{text}</small></div></div>; }
function Outcome({ label, text }: { label: string; text: string }) { return <div className="outcome"><strong>{label}</strong><span>{text}</span></div>; }
function Metric({label,value,suffix,tone}:{label:string;value:string;suffix:string;tone?:"positive"|"warning"}) { return <div className="metric-card"><span>{label}</span><strong className={tone??""}>{value}</strong><small>{suffix}</small></div>; }
function ResultMetric({label,value,suffix,highlight}:{label:string;value:string;suffix:string;highlight?:boolean}) { return <div className={`result-metric ${highlight?"highlight":""}`}><span>{label}</span><strong>{value}</strong><small>{suffix}</small></div>; }
function Signal({label,value,bar,status}:{label:string;value:string;bar:number;status:string}) { return <div className="signal"><div className="signal-top"><div><strong>{label}</strong><span>{status}</span></div><b>{value}</b></div><div className="signal-track"><i style={{width:`${Math.min(bar,100)}%`}}/></div></div>; }
function PlayerChip({player,team,captain,compact,expected,actual}:{player:FplPlayer;team?:FplTeam;captain?:boolean;compact?:boolean;expected?:number;actual?:number|null}) {
  return <div className={`player-chip ${compact ? "compact" : ""}`}>
    <div className="shirt">{team?.short_name?.slice(0,2) ?? "--"}{captain&&<i>C</i>}</div>
    <div className="player-chip-main"><strong>{player.web_name}</strong><span>{team?.short_name} · {money(player.now_cost)}</span></div>
    <div className="player-chip-points" title="Actual points and single-gameweek model projection">
      <b>{actual == null ? "—" : actual}</b><span>actual</span><small>{expected == null ? "—" : expected.toFixed(1)} xPts</small>
    </div>
  </div>;
}
function PlayerSelect({value,onChange,players,teams,placeholder}:{value:number|null;onChange:(id:number)=>void;players:FplPlayer[];teams:FplTeam[];placeholder:string}) { const teamMap = new Map(teams.map(t=>[t.id,t])); return <div className="player-select-wrap"><select value={value??""} onChange={(e)=>onChange(Number(e.target.value))}><option value="" disabled>{placeholder}</option>{players.map(p=><option key={p.id} value={p.id}>{p.web_name} — {teamMap.get(p.team)?.short_name} · {positionName(p.element_type)} · {money(p.now_cost)}</option>)}</select>{value && (()=>{const p=players.find(x=>x.id===value);return p?<div className="select-player-meta"><span>{num(p.form).toFixed(1)} form</span><span>{num(p.selected_by_percent).toFixed(1)}% owned</span></div>:null})()}</div>; }

"use client";

import { useEffect, useMemo, useState, useRef, type FormEvent } from "react";

import DecisionPreview from "./DecisionPreview";
import SquadPitch, { type SquadPitchPlayer } from "./SquadPitch";
import styles from "./LiveRefreshV12.module.css";
import type {
  BootstrapPayload,
  FplFixture,
  FplPlayer,
  HistoricalPayload,
  ManagerPayload,
} from "@/lib/types";
import type { SportsbookPayload } from "@/lib/sportsbook";
import {
  MODEL_VERSION,
  assessChips,
  positionName,
  projectPlayer,
  recommendJointTransferPlan,
  recommendReplacements,
  type MarketProjection,
  type Recommendation,
  type RiskMode,
} from "@/lib/risk-v12";
import { analyzePortfolioRisk } from "@/lib/portfolio-risk";

type Tab = "overview" | "transfer" | "team" | "market" | "model";
type ProjectionRow = {
  player: FplPlayer;
  one: MarketProjection;
  three: MarketProjection;
  five: MarketProjection;
  value: number;
};
type SquadItem = SquadPitchPlayer;
type MarketSort =
  | "one" | "three" | "five" | "value" | "price" | "risk" | "sharpe" | "ownership";

const decisionContextCopy: Record<RiskMode, { label: string; detail: string }> = {
  protect: { label: "Protect rank", detail: "Prefer a tighter simulated range and a safer median when the downside matters most." },
  balanced: { label: "Balanced", detail: "Blend expected points, uncertainty and fixture quality without leaning into either extreme." },
  chase: { label: "Chase rank", detail: "Give controlled variance and high ceilings more weight when you need to make ground." },
  mini: { label: "Mini-league", detail: "Keep the expected edge while giving differentials a measured upside preference." },
};

const money = (value: number | null | undefined) =>
  value == null ? "—" : `£${(value / 10).toFixed(1)}m`;
const compactNumber = (value: number) =>
  new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const signedCompactNumber = (value: number) => {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${compactNumber(Math.abs(value))}`;
};
const signedPriceChange = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value) || value === 0) return "No move";
  return `${value > 0 ? "+" : "−"}£${(Math.abs(value) / 10).toFixed(1)}m`;
};
const riskRank: Record<MarketProjection["risk"], number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};
const tabLabels: Record<Tab, string> = {
  overview: "Overview",
  transfer: "Transfer Lab",
  team: "My Team",
  market: "Player Market",
  model: "Model",
};

function availabilityLabel(player: FplPlayer) {
  if (["u", "n"].includes(player.status)) return "Unavailable";
  if (player.status === "s") return "Suspended";
  if (player.status === "i")
    return `${player.chance_of_playing_next_round ?? 20}%`;
  if (player.status === "d")
    return `${player.chance_of_playing_next_round ?? 65}%`;
  return player.chance_of_playing_next_round == null
    ? "Available"
    : `${player.chance_of_playing_next_round}%`;
}

function chipTone(status: string) {
  if (status === "PLAY") return styles.play;
  if (status === "CONSIDER") return styles.consider;
  if (status === "USED") return styles.used;
  if (status === "UNAVAILABLE") return styles.unavailable;
  return styles.hold;
}

export default function LiveRefreshV12() {
  const whyDialogRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [fixtures, setFixtures] = useState<FplFixture[]>([]);
  const [history, setHistory] = useState<HistoricalPayload | null>(null);
  const [sportsbook, setSportsbook] = useState<SportsbookPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [manager, setManager] = useState<ManagerPayload | null>(null);
  const [teamId, setTeamId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedOut, setSelectedOut] = useState<number[]>([]);
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [whyPlayer, setWhyPlayer] = useState<ProjectionRow | null>(null);
  const [marketQuery, setMarketQuery] = useState("");
  const [marketPosition, setMarketPosition] = useState(0);
  const [marketTeam, setMarketTeam] = useState(0);
  const [marketMaxPrice, setMarketMaxPrice] = useState<number | null>(null);
  const [marketSort, setMarketSort] = useState<MarketSort>("five");
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [decisionContext, setDecisionContext] = useState<RiskMode>("balanced");

  useEffect(() => {
    const saved = window.localStorage.getItem("fpl-risk-decision-context") as RiskMode | null;
    if (saved && saved in decisionContextCopy) setDecisionContext(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("fpl-risk-decision-context", decisionContext);
  }, [decisionContext]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFeedError("");
      try {
        const [bootstrapResponse, fixtureResponse, sportsbookResponse] =
          await Promise.all([
            fetch("/api/fpl/bootstrap", { cache: "no-store" }),
            fetch("/api/fpl/fixtures", { cache: "no-store" }),
            fetch("/api/sportsbook", { cache: "no-store" }),
          ]);
        if (!bootstrapResponse.ok || !fixtureResponse.ok)
          throw new Error("Live FPL feed unavailable");
        const bootstrapData =
          (await bootstrapResponse.json()) as BootstrapPayload;
        const fixtureData = (await fixtureResponse.json()) as {
          fixtures: FplFixture[];
        };
        if (!cancelled) {
          setBootstrap(bootstrapData);
          setFixtures(fixtureData.fixtures ?? []);
          if (sportsbookResponse.ok)
            setSportsbook(
              (await sportsbookResponse.json()) as SportsbookPayload,
            );
        }
        try {
          const historicalResponse = await fetch("/api/fpl/history", {
            cache: "no-store",
          });
          if (historicalResponse.ok && !cancelled)
            setHistory((await historicalResponse.json()) as HistoricalPayload);
        } catch {
          // Historical priors are optional. The current-season model remains usable without them.
        }
      } catch {
        if (!cancelled)
          setFeedError(
            "Live FPL data is temporarily unavailable. Refresh in a moment.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const players = bootstrap?.elements ?? [];
  const teams = bootstrap?.teams ?? [];
  const events = bootstrap?.events ?? [];
  const historicalProfiles = history?.players;
  const marketPriceFloor = useMemo(() => {
    if (!players.length) return 40;
    const liveMinimum = Math.min(...players.map((player) => player.now_cost));
    return Math.max(0, Math.floor(liveMinimum / 5) * 5);
  }, [players]);
  const marketPriceCeiling = useMemo(() => {
    if (!players.length) return 150;
    const liveMaximum = Math.max(...players.map((player) => player.now_cost));
    return Math.max(150, Math.ceil(liveMaximum / 5) * 5);
  }, [players]);
  const effectiveMarketMaxPrice = marketMaxPrice ?? marketPriceCeiling;
  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const projectionRows = useMemo<ProjectionRow[]>(() => {
    if (!bootstrap || !fixtures.length) return [];
    return players.map((player) => {
      const one = projectPlayer(
        player,
        fixtures,
        teams,
        1,
        historicalProfiles,
        sportsbook,
        undefined,
        true,
      );
      const three = projectPlayer(
        player,
        fixtures,
        teams,
        3,
        historicalProfiles,
        sportsbook,
        undefined,
        true,
      );
      const five = projectPlayer(
        player,
        fixtures,
        teams,
        5,
        historicalProfiles,
        sportsbook,
        undefined,
        true,
      );
      const price = Math.max(player.now_cost / 10, 3.5);
      return { player, one, three, five, value: five.expected / price };
    });
  }, [bootstrap, fixtures, historicalProfiles, players, sportsbook, teams]);

  const projectionMap = useMemo(
    () => new Map(projectionRows.map((row) => [row.player.id, row])),
    [projectionRows],
  );
  const projectableMarket = useMemo(
    () =>
      projectionRows
        .filter(({ player }) => !["u", "n", "s"].includes(player.status))
        .filter(({ five }) => five.expected > 0.1),
    [projectionRows],
  );
  const bestNow = useMemo(
    () =>
      [...projectableMarket]
        .sort((a, b) => b.one.expected - a.one.expected)
        .slice(0, 10),
    [projectableMarket],
  );

  const squad = useMemo<SquadItem[]>(
    () =>
      manager?.picks
        .map((pick) => {
          const player = playerMap.get(pick.element);
          const row = player ? projectionMap.get(player.id) : null;
          return player && row
            ? { pick, player, one: row.one, three: row.three, five: row.five }
            : null;
        })
        .filter((item): item is SquadItem => Boolean(item)) ?? [],
    [manager, playerMap, projectionMap],
  );

  const squadPlayers = useMemo(() => squad.map((item) => item.player), [squad]);
  const sellingPrices = useMemo(
    () =>
      new Map(
        squad.map((item) => [
          item.player.id,
          item.pick.selling_price ?? item.player.now_cost,
        ]),
      ),
    [squad],
  );
  const starters = useMemo(
    () => squad.filter((item) => item.pick.position <= 11),
    [squad],
  );
  const bench = useMemo(
    () => squad.filter((item) => item.pick.position > 11),
    [squad],
  );

  const teamOneGw = useMemo(
    () =>
      starters.reduce(
        (total, item) =>
          total + item.one.expected * Math.max(item.pick.multiplier, 1),
        0,
      ),
    [starters],
  );
  const teamFiveGw = useMemo(
    () => starters.reduce((total, item) => total + item.five.expected, 0),
    [starters],
  );
  const teamRisk = useMemo(() => {
    if (!starters.length) return "—";
    const averageCv =
      starters.reduce(
        (sum, item) =>
          sum + item.one.volatility / Math.max(item.one.expected, 1),
        0,
      ) / starters.length;
    return averageCv < 0.52 ? "Low" : averageCv < 0.7 ? "Medium" : "High";
  }, [starters]);
  const portfolioRisk = useMemo(
    () => analyzePortfolioRisk(
      starters.map((item) => ({
        player: item.player,
        projection: item.five,
        weight: Math.max(item.pick.multiplier, 1),
      })),
      teams,
    ),
    [starters, teams],
  );

  const autoRecommendation = useMemo<Recommendation | null>(() => {
    if (!manager || !squadPlayers.length) return null;
    const candidates = squadPlayers.flatMap((outgoing) =>
      recommendReplacements({
        players,
        squad: squadPlayers,
        fixtures,
        teams,
        outgoing,
        bank: manager.bank ?? 0,
        sellingPrice: sellingPrices.get(outgoing.id),
        horizon: 5,
        limit: 1,
        history: historicalProfiles,
        freeTransfers,
        sportsbook,
        riskMode: decisionContext,
      }),
    );
    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => b.score - a.score)[0];
    const minimumEdge =
      freeTransfers === 0
        ? 0.9
        : freeTransfers >= 5
          ? 0.3
          : freeTransfers >= 2
            ? 0.55
            : 0.9;
    return best.expectedGain > minimumEdge && best.score > 0.15 ? best : null;
  }, [
    fixtures,
    freeTransfers,
    historicalProfiles,
    manager,
    players,
    sellingPrices,
    sportsbook,
    squadPlayers,
    teams,
    decisionContext,
  ]);

  const chipAdvice = useMemo(() => {
    if (!manager || !bootstrap || !squad.length) return [];
    return assessChips({
      players,
      squad: squadPlayers,
      starters: starters.map((item) => item.player),
      bench: bench.map((item) => item.player),
      fixtures,
      teams,
      events,
      history: historicalProfiles,
      chipsUsed: manager.chipsUsed,
      freeTransfers,
    });
  }, [
    bench,
    bootstrap,
    events,
    fixtures,
    freeTransfers,
    historicalProfiles,
    manager,
    players,
    squad,
    squadPlayers,
    starters,
    teams,
  ]);

  const jointPlan = useMemo(() => {
    if (!manager || !selectedOut.length) return null;
    return recommendJointTransferPlan({
      players,
      squad: squadPlayers,
      fixtures,
      teams,
      outgoingIds: selectedOut,
      bank: manager.bank ?? 0,
      sellingPrices,
      freeTransfers,
      history: historicalProfiles,
      sportsbook,
      horizon: 5,
    });
  }, [
    fixtures,
    freeTransfers,
    historicalProfiles,
    manager,
    players,
    selectedOut,
    sellingPrices,
    sportsbook,
    squadPlayers,
    teams,
  ]);

  const singleAlternatives = useMemo(() => {
    if (!manager || selectedOut.length !== 1) return [];
    const outgoing = playerMap.get(selectedOut[0]);
    if (!outgoing) return [];
    return recommendReplacements({
      players,
      squad: squadPlayers,
      fixtures,
      teams,
      outgoing,
      bank: manager.bank ?? 0,
      sellingPrice: sellingPrices.get(outgoing.id),
      horizon: 5,
      limit: 4,
      history: historicalProfiles,
      freeTransfers,
      sportsbook,
      riskMode: decisionContext,
    });
  }, [
    fixtures,
    freeTransfers,
    historicalProfiles,
    manager,
    playerMap,
    players,
    selectedOut,
    sellingPrices,
    sportsbook,
    squadPlayers,
    teams,
    decisionContext,
  ]);

  const marketRows = useMemo(() => {
    const query = marketQuery.trim().toLowerCase();
    const filtered = projectableMarket.filter(({ player }) => {
      if (
        query &&
        !`${player.web_name} ${player.first_name} ${player.second_name}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      if (marketPosition && player.element_type !== marketPosition)
        return false;
      if (marketTeam && player.team !== marketTeam) return false;
      if (player.now_cost > effectiveMarketMaxPrice) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (marketSort === "one") return b.one.expected - a.one.expected;
      if (marketSort === "three") return b.three.expected - a.three.expected;
      if (marketSort === "five") return b.five.expected - a.five.expected;
      if (marketSort === "value") return b.value - a.value;
      if (marketSort === "price") return b.player.now_cost - a.player.now_cost;
      if (marketSort === "risk")
        return riskRank[a.five.risk] - riskRank[b.five.risk];
      if (marketSort === "sharpe")
        return (b.five.distribution?.sharpe ?? 0) - (a.five.distribution?.sharpe ?? 0);
      return (
        Number.parseFloat(b.player.selected_by_percent || "0") -
        Number.parseFloat(a.player.selected_by_percent || "0")
      );
    });
  }, [
    effectiveMarketMaxPrice,
    marketPosition,
    marketQuery,
    marketSort,
    marketTeam,
    projectableMarket,
  ]);

  const marketLeaders = useMemo(() => {
    const topExpected = marketRows[0] ?? null;
    const topSharpe = [...marketRows].sort(
      (a, b) => (b.five.distribution?.sharpe ?? 0) - (a.five.distribution?.sharpe ?? 0),
    )[0] ?? null;
    const topCeiling = [...marketRows].sort(
      (a, b) => (b.one.distribution?.p90 ?? 0) - (a.one.distribution?.p90 ?? 0),
    )[0] ?? null;
    const bestValue = [...marketRows].sort((a, b) => b.value - a.value)[0] ?? null;
    return { topExpected, topSharpe, topCeiling, bestValue };
  }, [marketRows]);

  const marketSignals = useMemo(() => {
    const priceMover = [...marketRows]
      .filter(({ player }) => Number.isFinite(player.cost_change_event))
      .sort((a, b) => Math.abs(b.player.cost_change_event ?? 0) - Math.abs(a.player.cost_change_event ?? 0))[0] ?? null;
    const transferLeader = [...marketRows]
      .sort((a, b) => {
        const netB = (b.player.transfers_in_event ?? 0) - (b.player.transfers_out_event ?? 0);
        const netA = (a.player.transfers_in_event ?? 0) - (a.player.transfers_out_event ?? 0);
        return netB - netA;
      })[0] ?? null;
    const haulLeader = [...marketRows]
      .sort((a, b) => (b.one.distribution?.bands.haul ?? 0) - (a.one.distribution?.bands.haul ?? 0))[0] ?? null;
    const gameweekLeader = [...marketRows]
      .filter(({ player }) => Number.isFinite(player.event_points))
      .sort((a, b) => (b.player.event_points ?? 0) - (a.player.event_points ?? 0))[0] ?? null;
    const gameweekRank = gameweekLeader
      ? [...marketRows]
          .filter(({ player }) => Number.isFinite(player.event_points))
          .sort((a, b) => (b.player.event_points ?? 0) - (a.player.event_points ?? 0))
          .findIndex(({ player }) => player.id === gameweekLeader.player.id) + 1
      : null;
    return { priceMover, transferLeader, haulLeader, gameweekLeader, gameweekRank };
  }, [marketRows]);

  const selectedMarketRow = useMemo(
    () =>
      marketRows.find((row) => row.player.id === selectedMarketId) ??
      marketLeaders.topExpected,
    [marketLeaders.topExpected, marketRows, selectedMarketId],
  );

  const riskNotes = useMemo(() => {
    if (!manager) return [];
    const notes: Array<{
      title: string;
      detail: string;
      tone: "good" | "warn" | "neutral";
    }> = [];
    const availabilityConcerns = squad.filter((item) =>
      ["i", "d", "s", "u", "n"].includes(item.player.status),
    );
    notes.push({
      title: availabilityConcerns.length
        ? `${availabilityConcerns.length} availability flag${availabilityConcerns.length === 1 ? "" : "s"}`
        : "Availability looks clean",
      detail: availabilityConcerns.length
        ? availabilityConcerns
            .map((item) => item.player.web_name)
            .slice(0, 4)
            .join(", ")
        : "No imported squad player currently carries a major public availability flag.",
      tone: availabilityConcerns.length ? "warn" : "good",
    });
    const weak = [...squad].sort(
      (a, b) => a.five.expected - b.five.expected,
    )[0];
    if (weak)
      notes.push({
        title: `${weak.player.web_name} is the weakest 5-GW projection`,
        detail: `${weak.five.expected.toFixed(1)} xPts over five Gameweeks. Transfer Lab can compare legal upgrades.`,
        tone: "neutral",
      });
    const captain = [...starters].sort(
      (a, b) => b.one.expected - a.one.expected,
    )[0];
    if (captain)
      notes.push({
        title: `${captain.player.web_name} leads captaincy`,
        detail: `${captain.one.expected.toFixed(1)} one-GW xPts before the captain multiplier.`,
        tone: "good",
      });
    return notes;
  }, [manager, squad, starters]);

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
    } catch (error) {
      setTeamError(
        error instanceof Error ? error.message : "Could not import that team.",
      );
    } finally {
      setLoadingTeam(false);
    }
  }

  function toggleOutgoing(id: number) {
    setSelectedOut((current) =>
      current.includes(id)
        ? current.filter((playerId) => playerId !== id)
        : [...current, id],
    );
  }

  function showWhy(item: SquadPitchPlayer | ProjectionRow) {
    if ("pick" in item)
      setWhyPlayer({
        player: item.player,
        one: item.one,
        three: item.three,
        five: item.five,
        value: item.five.expected / Math.max(item.player.now_cost / 10, 3.5),
      });
    else setWhyPlayer(item);
  }

  useEffect(() => {
    if (!whyPlayer) return;
    const prior = document.activeElement as HTMLElement | null;
    const panel = whyDialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWhyPlayer(null);
      if (event.key === "Tab" && panel) {
        const buttons = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, [tabindex="0"]',
          ),
        );
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      prior?.focus();
    };
  }, [whyPlayer]);

  const nextEvent =
    events.find((event) => event.is_next) ??
    events.find((event) => event.is_current);
  const autoOutgoing = autoRecommendation
    ? playerMap.get(autoRecommendation.outgoingId)
    : null;
  const autoIncoming = autoRecommendation
    ? playerMap.get(autoRecommendation.incomingId)
    : null;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => setTab("overview")}>
          <span className={styles.brandMark}>FR</span>
          <span>
            <strong>FPL RISK</strong>
            <small>Decision analytics</small>
          </span>
        </button>
        <nav
          className={styles.nav}
          aria-label="Primary navigation"
          role="tablist"
        >
          {(["overview", "transfer", "team", "market", "model"] as Tab[]).map(
            (item) => (
              <button
                key={item}
                className={tab === item ? styles.activeNav : ""}
                onClick={() => setTab(item)}
                role="tab"
                aria-selected={tab === item}
              >
                {tabLabels[item]}
              </button>
            ),
          )}
        </nav>
        <div className={styles.liveStatus}>
          <i />{" "}
          {loading
            ? "Syncing"
            : feedError
              ? "Feed issue"
              : (nextEvent?.name ?? "Live FPL")}
        </div>
      </header>

      {feedError && <div className={styles.errorBanner}>{feedError}</div>}

      {tab === "overview" && (
        <div className={styles.page} role="tabpanel" aria-label="Overview">
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>LIVE FPL DECISION ENGINE</span>
              <h1>
                Know the risk
                <br />
                behind <em>every move.</em>
              </h1>
              <p>
                Import your squad, understand the model behind every player and
                compare transfers and chips before you commit.
              </p>
              <div className={styles.heroMeta}>
                <span>{nextEvent?.name ?? "Current GW"}</span>
                <span>Model {MODEL_VERSION}</span>
                <span>
                  {sportsbook?.available
                    ? sportsbook.configuredWeight > 0
                      ? "Market prior active"
                      : "Market feed connected"
                    : "Core model active"}
                </span>
              </div>
              <form className={styles.importCard} onSubmit={importTeam}>
                <span className={styles.eyebrow}>ANALYZE YOUR SQUAD</span>
                <h2>Enter your FPL Team ID</h2>
                <p>Use the number at the end of your public FPL team URL.</p>
                <div className={styles.importRow}>
                  <input
                    value={teamId}
                    onChange={(event) => setTeamId(event.target.value)}
                    placeholder="e.g. 123456"
                    inputMode="numeric"
                    aria-label="FPL Team ID"
                  />
                  <button disabled={loadingTeam}>
                    {loadingTeam ? "Loading…" : manager ? "Reload" : "Analyze"}
                  </button>
                </div>
                {teamError && (
                  <small className={styles.formError}>{teamError}</small>
                )}
                {manager && (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setTab("team")}
                  >
                    Open My Team →
                  </button>
                )}
              </form>
            </div>
            <DecisionPreview
              rows={bestNow}
              gameweek={nextEvent?.name ?? "Next gameweek"}
              onWhy={showWhy}
              onMarket={() => setTab("market")}
            />
          </section>

          <section className={styles.contextSection} aria-labelledby="decision-context-title">
            <div>
              <span className={styles.eyebrow}>DECISION POSTURE</span>
              <h2 id="decision-context-title">What are you playing for?</h2>
              <p>Use the same projections with a preference that matches your rank situation.</p>
            </div>
            <div className={styles.contextChoices} role="radiogroup" aria-label="Risk tolerance">
              {(Object.keys(decisionContextCopy) as RiskMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={decisionContext === mode ? styles.contextChoiceActive : styles.contextChoice}
                  onClick={() => setDecisionContext(mode)}
                  role="radio"
                  aria-checked={decisionContext === mode}
                >
                  {decisionContextCopy[mode].label}
                </button>
              ))}
            </div>
            <p className={styles.contextHint}>{decisionContextCopy[decisionContext].detail}</p>
          </section>

          <section className={styles.marketSection}>
            <div className={styles.sectionTitle}>
              <div>
                <span className={styles.eyebrow}>LIVE MARKET</span>
                <h2>Best projections right now</h2>
                <p>
                  Next-Gameweek xPts from the same engine used in Transfer Lab.
                </p>
              </div>
              <button onClick={() => setTab("market")}>
                Explore every player →
              </button>
            </div>
            <div className={styles.railViewport}>
              <div className={styles.projectionRail}>
                {[...bestNow, ...bestNow].map((row, index) => {
                  const team = teamMap.get(row.player.team);
                  return (
                    <article
                      className={styles.projectionCard}
                      key={`${row.player.id}-${index}`}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.teamBubble}>
                          {team?.short_name ?? "FPL"}
                        </span>
                        <span
                          className={`${styles.confidence} ${styles[row.one.confidence.toLowerCase()]}`}
                        >
                          {row.one.confidence}
                        </span>
                      </div>
                      <h3>{row.player.web_name}</h3>
                      <p>
                        {team?.short_name ?? "—"} ·{" "}
                        {row.one.fixtureLabels[0] ?? "BLANK"}
                      </p>
                      <div className={styles.cardBottom}>
                        <strong>
                          {row.one.expected.toFixed(1)} <small>xPTS</small>
                        </strong>
                        <button onClick={() => showWhy(row)}>Why?</button>
                      </div>
                      <div className={styles.cardRisk}>
                        <span>Range {row.one.distribution ? `${row.one.distribution.p10.toFixed(1)}–${row.one.distribution.p90.toFixed(1)}` : "—"}</span>
                        <span>Sharpe {row.one.distribution?.sharpe.toFixed(2) ?? "—"}</span>
                      </div>
                    </article>
                  );
                })}
                {!bestNow.length &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <div className={styles.projectionSkeleton} key={index} />
                  ))}
              </div>
            </div>
            <p className={styles.railHint}>
              Explore a player to see the thinking behind their forecast.
            </p>
          </section>

          <section className={styles.modelSnapshot}>
            <div className={styles.sectionTitle}>
              <div>
                <span className={styles.eyebrow}>MODEL SNAPSHOT</span>
                <h2>What the engine is reading</h2>
              </div>
              <button onClick={() => setTab("model")}>
                How the model works →
              </button>
            </div>
            <div className={styles.snapshotGrid}>
              <div>
                <span>PLAYER ROLE</span>
                <strong>Expected minutes</strong>
                <p>
                  Starts, historical role and current availability set the
                  playing-time foundation.
                </p>
              </div>
              <div>
                <span>UNDERLYING</span>
                <strong>xG + xA</strong>
                <p>
                  Player attacking rates are sample-size shrunk rather than
                  extrapolated from short-term points.
                </p>
              </div>
              <div>
                <span>FIXTURE</span>
                <strong>Team + opponent</strong>
                <p>
                  Home/away strength, xG/xGA, recent form, Elo and FDR shape
                  each fixture context.
                </p>
              </div>
              <div>
                <span>MARKET PRIOR</span>
                <strong>
                  {sportsbook?.available
                    ? sportsbook.configuredWeight > 0
                      ? "Sportsbook active"
                      : "Feed connected"
                    : "Optional"}
                </strong>
                <p>
                  {sportsbook?.note ??
                    "The sportsbook layer fails open: no market data means the core model is unchanged."}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "team" && (
        <div className={styles.page} role="tabpanel" aria-label="My Team">
          <div className={styles.pageHeading}>
            <div>
              <span className={styles.eyebrow}>MY TEAM</span>
              <h1>Your squad, in one focused workspace.</h1>
              <p>
                Squad shape, projections, chip guidance and the model's
                recommended move live here — separate from the rest of the app.
              </p>
            </div>
            {manager && (
              <div className={styles.managerBadge}>
                <strong>{manager.teamName}</strong>
                <span>{money(manager.bank)} bank</span>
              </div>
            )}
          </div>

          {!manager ? (
            <section className={styles.loadPanel}>
              <span className={styles.eyebrow}>LOAD YOUR TEAM</span>
              <h2>Import your 15-player squad</h2>
              <p>
                Your public Team ID is enough. No password or FPL login is
                required.
              </p>
              <form className={styles.importRow} onSubmit={importTeam}>
                <input
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  placeholder="FPL Team ID"
                  inputMode="numeric"
                />
                <button disabled={loadingTeam}>
                  {loadingTeam ? "Loading…" : "Load team"}
                </button>
              </form>
              {teamError && (
                <small className={styles.formError}>{teamError}</small>
              )}
            </section>
          ) : (
            <>
              <section className={styles.summarySection}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span className={styles.eyebrow}>TEAM SNAPSHOT</span>
                    <h2>{manager.teamName}</h2>
                    <p>
                      {manager.managerName} · imported from the public FPL API
                    </p>
                  </div>
                  <button onClick={() => setTab("transfer")}>
                    Open Transfer Lab →
                  </button>
                </div>
                <div className={styles.summaryGrid}>
                  <div>
                    <span>PROJECTED GW</span>
                    <strong>{teamOneGw.toFixed(1)}</strong>
                    <small>includes current captain multiplier</small>
                  </div>
                  <div>
                    <span>STARTING XI · 5GW</span>
                    <strong>{teamFiveGw.toFixed(1)}</strong>
                    <small>pre-transfer expectation</small>
                  </div>
                  <div>
                    <span>TEAM RISK</span>
                    <strong>{teamRisk}</strong>
                    <small>average starting-XI volatility</small>
                  </div>
                  <div>
                    <span>BANK</span>
                    <strong>{money(manager.bank)}</strong>
                    <small>
                      {freeTransfers} free transfer
                      {freeTransfers === 1 ? "" : "s"} assumed
                    </small>
                  </div>
                  <div>
                    <span>TEAM VALUE</span>
                    <strong>{money(manager.teamValue)}</strong>
                    <small>latest public FPL value</small>
                  </div>
                </div>
              </section>

              <section className={styles.portfolioPanel}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span className={styles.eyebrow}>PORTFOLIO RISK</span>
                    <h2>Where your squad is concentrated</h2>
                    <p>Covariance is added when players share a club or fixture, so team risk reflects the basket rather than a simple sum.</p>
                  </div>
                  <span className={`${styles.riskBadge} ${styles[portfolioRisk.risk.toLowerCase()]}`}>{portfolioRisk.risk}</span>
                </div>
                <div className={styles.portfolioGrid}>
                  <div className={styles.portfolioMetric}><span>PORTFOLIO SD</span><strong>{portfolioRisk.portfolioVolatility.toFixed(1)}</strong><small>5GW simulated points</small></div>
                  <div className={styles.portfolioMetric}><span>INDEPENDENT SD</span><strong>{portfolioRisk.independentVolatility.toFixed(1)}</strong><small>without covariance</small></div>
                  <div className={styles.portfolioMetric}><span>COVARIANCE UPLIFT</span><strong>{portfolioRisk.correlationImpact >= 0 ? "+" : ""}{portfolioRisk.correlationImpact.toFixed(1)}</strong><small>shared outcome risk</small></div>
                  <div className={styles.portfolioMetric}><span>TOP CLUB</span><strong>{portfolioRisk.topTeam}</strong><small>{(portfolioRisk.topTeamShare * 100).toFixed(0)}% of expected points</small></div>
                  <div className={styles.portfolioMetric}><span>TOP FIXTURE</span><strong>{portfolioRisk.topFixture}</strong><small>{(portfolioRisk.topFixtureShare * 100).toFixed(0)}% of expected points</small></div>
                </div>
              </section>

              <section className={styles.pitchSection}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span className={styles.eyebrow}>SQUAD VIEW</span>
                    <h2>Your actual FPL shape</h2>
                    <p>
                      Starting XI, bench order, captaincy, next fixture and
                      model xPts in one place.
                    </p>
                  </div>
                  <button onClick={() => setTab("transfer")}>
                    Select transfers →
                  </button>
                </div>
                <SquadPitch
                  players={squad}
                  teams={teams}
                  mode="inspect"
                  onPlayerClick={showWhy}
                  onInspect={showWhy}
                  compact
                />
              </section>

              <section className={styles.decisionGrid}>
                <article className={styles.recommendationHero}>
                  <div className={styles.panelHead}>
                    <div>
                      <span className={styles.eyebrow}>
                        AI RECOMMENDED MOVE
                      </span>
                      <h2>
                        {autoRecommendation && autoOutgoing && autoIncoming
                          ? "One move stands out"
                          : "Hold is a valid decision"}
                      </h2>
                    </div>
                    <span className={styles.modelPill}>
                      Model {MODEL_VERSION}
                    </span>
                  </div>
                  {autoRecommendation && autoOutgoing && autoIncoming ? (
                    <>
                      <div className={styles.autoSwap}>
                        <div>
                          <span>SELL</span>
                          <strong>{autoOutgoing.web_name}</strong>
                          <small>
                            {autoRecommendation.outgoingExpected.toFixed(1)} 5GW
                            xPts
                          </small>
                        </div>
                        <b>→</b>
                        <div>
                          <span>BUY</span>
                          <strong>{autoIncoming.web_name}</strong>
                          <small>
                            {autoRecommendation.incomingExpected.toFixed(1)} 5GW
                            xPts
                          </small>
                        </div>
                      </div>
                      <div className={styles.edgeStats}>
                        <div>
                          <span>NET 5GW EDGE</span>
                          <strong>
                            {autoRecommendation.expectedGain >= 0 ? "+" : ""}
                            {autoRecommendation.expectedGain.toFixed(1)}
                          </strong>
                        </div>
                        <div>
                          <span>CONFIDENCE</span>
                          <strong>{autoRecommendation.confidence}</strong>
                        </div>
                        <div>
                          <span>RISK</span>
                          <strong>
                            {autoRecommendation.outgoingRisk} →{" "}
                            {autoRecommendation.incomingRisk}
                          </strong>
                        </div>
                      </div>
                      <ul>
                        {autoRecommendation.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      <button
                        className={styles.primaryButton}
                        onClick={() => {
                          setSelectedOut([autoOutgoing.id]);
                          setTab("transfer");
                        }}
                      >
                        Inspect this transfer →
                      </button>
                    </>
                  ) : (
                    <div className={styles.holdCard}>
                      <strong>HOLD</strong>
                      <p>
                        No single legal move clears the model's current edge
                        threshold after transfer cost and uncertainty. Saving
                        the transfer remains part of the recommendation space.
                      </p>
                    </div>
                  )}
                </article>

                <article className={styles.chipPanel}>
                  <div className={styles.panelHead}>
                    <div>
                      <span className={styles.eyebrow}>CHIP STRATEGY</span>
                      <h2>Use it or hold it?</h2>
                    </div>
                    <small>2026/27: two sets, one per half</small>
                  </div>
                  <div className={styles.chipList}>
                    {chipAdvice.map((chip) => (
                      <div className={styles.chipRow} key={chip.key}>
                        <div>
                          <strong>{chip.label}</strong>
                          <small>{chip.headline}</small>
                        </div>
                        <span
                          className={`${styles.chipStatus} ${chipTone(chip.status)}`}
                        >
                          {chip.status}
                        </span>
                        <p>{chip.reason}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className={styles.opportunitySection}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span className={styles.eyebrow}>SQUAD SIGNALS</span>
                    <h2>What deserves attention</h2>
                  </div>
                </div>
                <div className={styles.signalGrid}>
                  {riskNotes.map((note) => (
                    <article
                      className={`${styles.signalCard} ${styles[note.tone]}`}
                      key={note.title}
                    >
                      <span>
                        {note.tone === "warn"
                          ? "WATCH"
                          : note.tone === "good"
                            ? "POSITIVE"
                            : "MODEL NOTE"}
                      </span>
                      <h3>{note.title}</h3>
                      <p>{note.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {tab === "transfer" && (
        <div className={styles.page} role="tabpanel" aria-label="Transfer Lab">
          <div className={styles.pageHeading}>
            <div>
              <span className={styles.eyebrow}>TRANSFER LAB</span>
              <h1>Choose players directly from the pitch.</h1>
              <p>
                The optimizer evaluates your selected outs together, so shared
                budget and club constraints stay legal across the whole transfer
                plan.
              </p>
            </div>
            {manager && (
              <div className={styles.managerBadge}>
                <strong>{manager.teamName}</strong>
                <span>{money(manager.bank)} bank</span>
              </div>
            )}
          </div>

          {!manager ? (
            <section className={styles.loadPanel}>
              <span className={styles.eyebrow}>LOAD YOUR TEAM</span>
              <h2>Start with your real 15-player squad</h2>
              <p>
                Your public Team ID is enough. No password or FPL login is
                required.
              </p>
              <form className={styles.importRow} onSubmit={importTeam}>
                <input
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  placeholder="FPL Team ID"
                  inputMode="numeric"
                />
                <button disabled={loadingTeam}>
                  {loadingTeam ? "Loading…" : "Load team"}
                </button>
              </form>
              {teamError && (
                <small className={styles.formError}>{teamError}</small>
              )}
            </section>
          ) : (
            <>
              <section className={styles.transferToolbar}>
                <div>
                  <span>FREE TRANSFERS</span>
                  <div className={styles.ftButtons}>
                    {[0, 1, 2, 3, 4, 5].map((count) => (
                      <button
                        key={count}
                        className={
                          freeTransfers === count ? styles.selectedFt : ""
                        }
                        onClick={() => setFreeTransfers(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <strong>
                    {selectedOut.length
                      ? `${selectedOut.length} selected`
                      : "Pick player(s) on the pitch"}
                  </strong>
                  <button
                    className={styles.textButton}
                    onClick={() => setSelectedOut([])}
                    disabled={!selectedOut.length}
                  >
                    Clear
                  </button>
                </div>
              </section>

              <SquadPitch
                players={squad}
                teams={teams}
                mode="transfer"
                selectedIds={selectedOut}
                onPlayerClick={(item) => toggleOutgoing(item.player.id)}
                onInspect={showWhy}
              />

              <section className={styles.planSection}>
                <div className={styles.panelHead}>
                  <div>
                    <span className={styles.eyebrow}>
                      JOINT TRANSFER OPTIMIZER
                    </span>
                    <h2>
                      {selectedOut.length
                        ? "Best legal combination"
                        : "Select who you want out"}
                    </h2>
                  </div>
                  <span className={styles.modelPill}>
                    {selectedOut.length
                      ? `${selectedOut.length} move${selectedOut.length === 1 ? "" : "s"}`
                      : "Waiting"}
                  </span>
                </div>
                {!selectedOut.length && (
                  <div className={styles.emptyPlan}>
                    <p>
                      Tap one or more players on the pitch. FPL Risk will search
                      replacements under one shared budget instead of
                      recommending each transfer independently.
                    </p>
                  </div>
                )}
                {selectedOut.length > 0 && !jointPlan && (
                  <div className={styles.emptyPlan}>
                    <strong>No legal combination found</strong>
                    <p>
                      Try removing one selection or changing the transfer set.
                    </p>
                  </div>
                )}
                {jointPlan && (
                  <>
                    <div className={styles.planSummary}>
                      <div>
                        <span>NET 5GW EDGE</span>
                        <strong>
                          {jointPlan.expectedGain >= 0 ? "+" : ""}
                          {jointPlan.expectedGain.toFixed(1)}
                        </strong>
                      </div>
                      <div>
                        <span>HIT COST</span>
                        <strong>-{jointPlan.transferCost}</strong>
                      </div>
                      <div>
                        <span>CONFIDENCE</span>
                        <strong>{jointPlan.confidence}</strong>
                      </div>
                      <div>
                        <span>SHARED BUDGET</span>
                        <strong>{money(jointPlan.totalBudget)}</strong>
                      </div>
                    </div>
                    <div className={styles.planMoves}>
                      {jointPlan.moves.map((move) => {
                        const outgoing = playerMap.get(move.outgoingId);
                        const incoming = playerMap.get(move.incomingId);
                        if (!outgoing || !incoming) return null;
                        return (
                          <article
                            key={`${move.outgoingId}-${move.incomingId}`}
                          >
                            <div>
                              <span>OUT</span>
                              <strong>{outgoing.web_name}</strong>
                              <small>
                                {move.outgoingExpected.toFixed(1)} xPts
                              </small>
                            </div>
                            <b>→</b>
                            <div>
                              <span>IN</span>
                              <strong>{incoming.web_name}</strong>
                              <small>
                                {move.incomingExpected.toFixed(1)} xPts
                              </small>
                            </div>
                            <em>
                              {move.expectedGain >= 0 ? "+" : ""}
                              {move.expectedGain.toFixed(1)}
                            </em>
                          </article>
                        );
                      })}
                    </div>
                    <ul className={styles.reasonList}>
                      {jointPlan.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    {jointPlan.expectedGain <= 0 && (
                      <div className={styles.holdNotice}>
                        <strong>HOLD still leads on net expectation.</strong>{" "}
                        The optimizer is showing the best legal combination, but
                        it does not currently beat doing nothing.
                      </div>
                    )}
                  </>
                )}
              </section>

              {selectedOut.length === 1 && singleAlternatives.length > 1 && (
                <section className={styles.alternativeSection}>
                  <div className={styles.panelHead}>
                    <div>
                      <span className={styles.eyebrow}>ALTERNATIVES</span>
                      <h2>Other legal replacements</h2>
                    </div>
                  </div>
                  <div className={styles.alternativeGrid}>
                    {singleAlternatives.slice(1).map((pick) => {
                      const incoming = playerMap.get(pick.incomingId);
                      return incoming ? (
                        <article key={pick.incomingId}>
                          <strong>{incoming.web_name}</strong>
                          <span>{money(incoming.now_cost)}</span>
                          <b>
                            {pick.expectedGain >= 0 ? "+" : ""}
                            {pick.expectedGain.toFixed(1)} xPts
                          </b>
                          <small>{pick.confidence} confidence</small>
                        </article>
                      ) : null;
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {tab === "market" && (
        <div className={styles.page} role="tabpanel" aria-label="Player Market">
          <section className={styles.marketMasthead}>
            <div className={styles.marketMastheadTop}>
              <div>
                <span className={styles.eyebrow}>LIVE PLAYER MARKET · GW5</span>
                <h1>The FPL tape.</h1>
                <p>
                  A cleaner view of the live player pool. Scan expected points like a market,
                  then open the reasoning behind every number.
                </p>
              </div>
              <div className={styles.marketLiveBadge}>
                <i />
                <span>MARKET OPEN</span>
                <strong>{marketRows.length}</strong>
                <small>projectable players</small>
              </div>
            </div>
            <div className={styles.marketTicker}>
              <span>Model {MODEL_VERSION}</span>
              <span>Next fixture window {nextEvent?.name ?? "Current GW"}</span>
              <span>{sportsbook?.available ? "Market prior connected" : "Core model · market prior optional"}</span>
              <span className={styles.marketTickerSignal}>
                <b>PRICE WATCH</b>
                <strong>
                  {marketSignals.priceMover
                    ? `${marketSignals.priceMover.player.web_name} ${signedPriceChange(marketSignals.priceMover.player.cost_change_event)}`
                    : "No move yet"}
                </strong>
              </span>
              <span className={styles.marketTickerSignal}>
                <b>TRANSFER FLOW</b>
                <strong>
                  {marketSignals.transferLeader
                    ? `${marketSignals.transferLeader.player.web_name} ${signedCompactNumber((marketSignals.transferLeader.player.transfers_in_event ?? 0) - (marketSignals.transferLeader.player.transfers_out_event ?? 0))}`
                    : "Waiting for feed"}
                </strong>
              </span>
              <span className={styles.marketTickerSignal}>
                <b>HAUL PROBABILITY</b>
                <strong>
                  {marketSignals.haulLeader?.one.distribution
                    ? `${marketSignals.haulLeader.player.web_name} ${Math.round(marketSignals.haulLeader.one.distribution.bands.haul)}%`
                    : "Waiting for model"}
                </strong>
              </span>
              <span className={styles.marketTickerSignal}>
                <b>GW POINTS RANK</b>
                <strong>
                  {marketSignals.gameweekLeader && marketSignals.gameweekRank
                    ? `#${marketSignals.gameweekRank} ${marketSignals.gameweekLeader.player.web_name} · ${marketSignals.gameweekLeader.player.event_points ?? 0} pts`
                    : "Waiting for feed"}
                </strong>
              </span>
            </div>
          </section>

          <section className={styles.marketMetricStrip} aria-label="Market summary">
            <article>
              <span>TOP 1GW xPTS</span>
              <strong>{marketLeaders.topExpected?.one.expected.toFixed(1) ?? "—"}</strong>
              <small>{marketLeaders.topExpected?.player.web_name ?? "Waiting for feed"}</small>
            </article>
            <article>
              <span>BEST SHARPE</span>
              <strong>{marketLeaders.topSharpe?.five.distribution?.sharpe.toFixed(2) ?? "—"}</strong>
              <small>{marketLeaders.topSharpe?.player.web_name ?? "Waiting for feed"}</small>
            </article>
            <article>
              <span>HIGHEST CEILING</span>
              <strong>{marketLeaders.topCeiling?.one.distribution?.p90.toFixed(1) ?? "—"}</strong>
              <small>{marketLeaders.topCeiling?.player.web_name ?? "Waiting for feed"}</small>
            </article>
            <article>
              <span>BEST 5GW VALUE</span>
              <strong>{marketLeaders.bestValue?.value.toFixed(2) ?? "—"}</strong>
              <small>{marketLeaders.bestValue?.player.web_name ?? "Waiting for feed"}</small>
            </article>
          </section>

          {selectedMarketRow && (
            <section className={styles.marketFocusCard} aria-label="Selected player snapshot">
              <div className={styles.marketFocusIdentity}>
                <span className={styles.marketFocusRank}>#{String(marketRows.indexOf(selectedMarketRow) + 1).padStart(2, "0")}</span>
                <div>
                  <span className={styles.eyebrow}>SELECTED PLAYER</span>
                  <h2>{selectedMarketRow.player.web_name}</h2>
                  <p>
                    {teamMap.get(selectedMarketRow.player.team)?.name ?? "—"} ·{" "}
                    {positionName(selectedMarketRow.player.element_type)} ·{" "}
                    {money(selectedMarketRow.player.now_cost)} · {selectedMarketRow.player.selected_by_percent}% owned
                  </p>
                </div>
              </div>
              <div className={styles.marketFocusStats}>
                <div><span>1GW</span><strong>{selectedMarketRow.one.expected.toFixed(1)}</strong></div>
                <div><span>1GW RANGE</span><strong>{selectedMarketRow.one.distribution ? `${selectedMarketRow.one.distribution.p10.toFixed(1)}–${selectedMarketRow.one.distribution.p90.toFixed(1)}` : "—"}</strong></div>
                <div><span>5GW</span><strong>{selectedMarketRow.five.expected.toFixed(1)}</strong></div>
                <div><span>SHARPE</span><strong>{selectedMarketRow.five.distribution?.sharpe.toFixed(2) ?? "—"}</strong></div>
              </div>
              <button className={styles.marketFocusAction} onClick={() => showWhy(selectedMarketRow)}>
                Open reasoning ↗
              </button>
            </section>
          )}

          <section className={styles.marketControls}>
            <label className={styles.marketSearch}>
              <span>SEARCH</span>
              <input
                value={marketQuery}
                onChange={(event) => setMarketQuery(event.target.value)}
                placeholder="Search player"
                aria-label="Search player"
              />
            </label>
            <label>
              <span>POSITION</span>
              <select
                value={marketPosition}
                onChange={(event) => setMarketPosition(Number(event.target.value))}
                aria-label="Position"
              >
                <option value={0}>All positions</option>
                <option value={1}>Goalkeepers</option>
                <option value={2}>Defenders</option>
                <option value={3}>Midfielders</option>
                <option value={4}>Forwards</option>
              </select>
            </label>
            <label>
              <span>CLUB</span>
              <select
                value={marketTeam}
                onChange={(event) => setMarketTeam(Number(event.target.value))}
                aria-label="Club"
              >
                <option value={0}>All clubs</option>
                {teams.map((team) => (
                  <option value={team.id} key={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.marketPriceControl}>
              <span>MAX PRICE <strong>{money(effectiveMarketMaxPrice)}</strong></span>
              <input
                type="range"
                min={marketPriceFloor}
                max={marketPriceCeiling}
                step={1}
                value={effectiveMarketMaxPrice}
                onChange={(event) => setMarketMaxPrice(Number(event.target.value))}
                aria-label="Maximum player price"
              />
            </label>
            <label>
              <span>SORT BY</span>
              <select
                value={marketSort}
                onChange={(event) => setMarketSort(event.target.value as MarketSort)}
                aria-label="Sort player market"
              >
                <option value="five">5GW xPts</option>
                <option value="one">1GW xPts</option>
                <option value="three">3GW xPts</option>
                <option value="value">Value</option>
                <option value="price">Price</option>
                <option value="risk">Lowest risk</option>
                <option value="sharpe">Sharpe ratio</option>
                <option value="ownership">Ownership</option>
              </select>
            </label>
          </section>

          <section className={styles.marketTableShell} aria-label="Player market rankings">
            <div className={styles.marketTableMeta}>
              <div>
                <span className={styles.eyebrow}>MARKET RANKING</span>
                <strong>{marketRows.length} players in view</strong>
                <small>Click any row to pin a player snapshot. Use Why? to inspect the model inputs.</small>
              </div>
              <div className={styles.marketTableLegend} aria-label="Market column guide">
                <span><i className={styles.legendDot} /> Higher xPts</span>
                <span><i className={`${styles.legendDot} ${styles.legendDotMuted}`} /> Lower risk</span>
              </div>
            </div>
            <div className={styles.marketTable} aria-label="Player market table">
              <div className={styles.marketHeader}>
              <span>#</span>
              <span>Player</span>
              <span>Price</span>
              <span>Next</span>
              <span>1GW</span>
              <span>3GW</span>
              <span>5GW</span>
              <span>1GW range</span>
              <span>5GW range</span>
              <span>Sharpe</span>
              <span>Bust / haul</span>
              <span>Risk</span>
              <span>Value</span>
              <span>Why</span>
              </div>
              {marketRows.map((row, index) => (
              <div
                className={`${styles.marketRow} ${selectedMarketId === row.player.id ? styles.marketRowSelected : ""}`}
                key={row.player.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMarketId(row.player.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedMarketId(row.player.id);
                }}
                aria-label={`Select ${row.player.web_name}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div className={styles.marketPlayerCell}>
                  <span className={styles.marketPlayerDot}>{teamMap.get(row.player.team)?.short_name?.slice(0, 2) ?? "FPL"}</span>
                  <div>
                    <strong>{row.player.web_name}</strong>
                    <small>{teamMap.get(row.player.team)?.short_name} · {positionName(row.player.element_type)} · {row.player.selected_by_percent}% owned</small>
                  </div>
                </div>
                <span>{money(row.player.now_cost)}</span>
                <span>{row.one.fixtureLabels[0] ?? "BLANK"}</span>
                <b>{row.one.expected.toFixed(1)}</b>
                <b>{row.three.expected.toFixed(1)}</b>
                <b>{row.five.expected.toFixed(1)}</b>
                <span>{row.one.distribution ? `${row.one.distribution.p10.toFixed(1)}–${row.one.distribution.p90.toFixed(1)}` : "—"}</span>
                <span>{row.five.distribution ? `${row.five.distribution.p10.toFixed(1)}–${row.five.distribution.p90.toFixed(1)}` : "—"}</span>
                <span>{row.five.distribution?.sharpe.toFixed(2) ?? "—"}</span>
                <span className={styles.bandInline} title="Probability of 0–2 points / 10+ points">
                  {row.five.distribution ? `${Math.round(row.five.distribution.bands.bust)}% / ${Math.round(row.five.distribution.bands.haul)}%` : "—"}
                </span>
                <span className={`${styles.riskBadge} ${styles[row.five.risk.toLowerCase()]}`}>{row.five.risk}</span>
                <span>{row.value.toFixed(2)}</span>
                <button onClick={(event) => { event.stopPropagation(); showWhy(row); }}>Why?</button>
              </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "model" && (
        <div className={styles.page} role="tabpanel" aria-label="Model">
          <div className={styles.pageHeading}>
            <div>
              <span className={styles.eyebrow}>MODEL TRANSPARENCY</span>
              <h1>Risk Model {MODEL_VERSION}</h1>
              <p>
                The number is not a black box. FPL Risk builds expected points
                from role, rates, fixtures, uncertainty and an optional external
                market prior.
              </p>
            </div>
          </div>

          <section className={styles.modelFlow}>
            {[
              "Live FPL player data",
              "Expected minutes",
              "Shrunk xG / xA rates",
              "Team + opponent context",
              "Sportsbook market prior",
              "FPL scoring components",
              "Fixture-level uncertainty",
              "P10 / P90 + Sharpe",
              "Bust / haul bands",
              "Portfolio covariance",
              "xPts + transfer decision",
            ].map((item, index) => (
              <div key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </section>

          <section className={styles.modelSection}>
            <div className={styles.sectionTitle}>
              <div>
                <span className={styles.eyebrow}>COMPONENT MODEL</span>
                <h2>What contributes to xPts</h2>
              </div>
            </div>
            <div className={styles.componentCards}>
              <article>
                <strong>Minutes</strong>
                <p>
                  Start probability, cameo probability, historical role and
                  current availability.
                </p>
              </article>
              <article>
                <strong>Goals</strong>
                <p>
                  Expected-goal rate, minutes and fixture-adjusted team attack.
                </p>
              </article>
              <article>
                <strong>Assists</strong>
                <p>
                  Expected-assist rate blended with historical and positional
                  priors.
                </p>
              </article>
              <article>
                <strong>Clean sheets</strong>
                <p>
                  Opponent attack, team defence, xGA and fixture-specific goal
                  expectation.
                </p>
              </article>
              <article>
                <strong>Saves + DefCon</strong>
                <p>
                  Position-specific rates contribute directly under current FPL
                  scoring.
                </p>
              </article>
              <article>
                <strong>Bonus</strong>
                <p>
                  Bonus rate is sample-size shrunk and kept subordinate to the
                  component model.
                </p>
              </article>
              <article>
                <strong>Discipline</strong>
                <p>
                  Yellow-card expectation creates a small negative component.
                </p>
              </article>
              <article>
                <strong>Historical priors</strong>
                <p>
                  Prior seasons matter early and decay toward zero as current
                  minutes accumulate.
                </p>
              </article>
              <article>
                <strong>Risk-adjusted range</strong>
                <p>Monte Carlo simulations show the 10th percentile floor, 90th percentile ceiling and a Sharpe-style points-to-variance ratio.</p>
              </article>
              <article>
                <strong>Outcome bands</strong>
                <p>Every player carries probabilities for a bust (0–2), floor (3–5), middle (6–9) and haul (10+) outcome.</p>
              </article>
            </div>
          </section>

          <section className={styles.modelSplit}>
            <article>
              <span className={styles.eyebrow}>SPORTSBOOK SIGNAL</span>
              <h2>External prior, not the model</h2>
              <p>
                Current EPL h2h and totals prices are converted to de-vigged
                probabilities. Total-goal odds are translated into an implied
                goal mean, then blended only when a calibrated model weight is
                configured.
              </p>
              <div className={styles.modelStatus}>
                <span>Provider</span>
                <strong>
                  {sportsbook?.provider === "the-odds-api"
                    ? "The Odds API"
                    : "Not configured"}
                </strong>
                <span>Matching fixtures</span>
                <strong>{sportsbook?.fixtures.length ?? 0}</strong>
                <span>Configured weight</span>
                <strong>
                  {((sportsbook?.configuredWeight ?? 0) * 100).toFixed(0)}%
                </strong>
                <span>Status</span>
                <strong>
                  {sportsbook?.calibrationStatus ?? "disabled-until-calibrated"}
                </strong>
              </div>
              <small>{sportsbook?.note}</small>
            </article>
            <article>
              <span className={styles.eyebrow}>UNCERTAINTY</span>
              <h2>Fixture first, horizon second</h2>
              <p>
                Each projected Gameweek carries its own appearance probability
                and outcome variance. Multi-fixture Gameweeks are aggregated
                from their underlying fixture context rather than receiving one
                generic risk label after the fact.
              </p>
              <div className={styles.modelStatus}>
                <span>Low risk</span>
                <strong>Tighter relative range</strong>
                <span>High risk</span>
                <strong>Wider outcome range</strong>
                <span>Confidence</span>
                <strong>Data coverage + signal quality</strong>
                <span>Portfolio</span>
                <strong>Club and fixture covariance</strong>
              </div>
            </article>
          </section>

          <section className={styles.modelSection}>
            <div className={styles.sectionTitle}>
              <div>
                <span className={styles.eyebrow}>DECISION LAYER</span>
                <h2>From xPts to actual FPL choices</h2>
              </div>
            </div>
            <div className={styles.componentCards}>
              <article>
                <strong>Transfer legality</strong>
                <p>
                  Same-position replacement, shared bank, selling prices,
                  duplicates and three-per-club are enforced.
                </p>
              </article>
              <article>
                <strong>Joint optimization</strong>
                <p>
                  Multiple selected transfers are solved together so two moves
                  cannot spend the same money or buy the same player.
                </p>
              </article>
              <article>
                <strong>Hold is allowed</strong>
                <p>
                  The automatic recommendation can return no transfer when the
                  edge does not justify the move.
                </p>
              </article>
              <article>
                <strong>Chip strategy</strong>
                <p>
                  Current and near-term squad projections drive Wildcard, Free
                  Hit, Bench Boost and Triple Captain guidance.
                </p>
              </article>
            </div>
          </section>

          <section className={styles.validationPanel}>
            <div>
              <span className={styles.eyebrow}>VALIDATION</span>
              <h2>No invented accuracy numbers</h2>
              <p>
                The repository has deterministic model-invariant checks. A
                proper walk-forward historical backtest is the next quantitative
                gate before publishing RMSE, calibration or hit-rate claims.
              </p>
            </div>
            <div>
              <strong>Current rule</strong>
              <p>
                Engineering checks can say the model behaves consistently. They
                cannot be marketed as proven predictive accuracy.
              </p>
            </div>
          </section>
        </div>
      )}

      {whyPlayer && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setWhyPlayer(null)}
          role="presentation"
        >
          <section
            ref={whyDialogRef}
            tabIndex={-1}
            className={styles.whyModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${whyPlayer.player.web_name} projection explanation`}
          >
            <button
              aria-label="Close player details"
              className={styles.closeButton}
              onClick={() => setWhyPlayer(null)}
            >
              ×
            </button>
            <span className={styles.eyebrow}>WHY THIS PROJECTION?</span>
            <div className={styles.whyTitle}>
              <div>
                <h2>{whyPlayer.player.web_name}</h2>
                <p>
                  {teamMap.get(whyPlayer.player.team)?.name} ·{" "}
                  {positionName(whyPlayer.player.element_type)} ·{" "}
                  {money(whyPlayer.player.now_cost)} ·{" "}
                  {availabilityLabel(whyPlayer.player)}
                </p>
              </div>
              <span
                className={`${styles.confidence} ${styles[whyPlayer.five.confidence.toLowerCase()]}`}
              >
                {whyPlayer.five.confidence} confidence
              </span>
            </div>
            <div className={styles.horizonGrid}>
              <div>
                <span>1 GW</span>
                <strong>{whyPlayer.one.expected.toFixed(1)}</strong>
              </div>
              <div>
                <span>3 GW</span>
                <strong>{whyPlayer.three.expected.toFixed(1)}</strong>
              </div>
              <div>
                <span>5 GW</span>
                <strong>{whyPlayer.five.expected.toFixed(1)}</strong>
              </div>
              <div>
                <span>RISK</span>
                <strong>{whyPlayer.five.risk}</strong>
              </div>
            </div>
            <div className={styles.distributionPanel}>
              <div className={styles.distributionMetric}><span>1 GW RANGE</span><strong>{whyPlayer.one.distribution ? `${whyPlayer.one.distribution.p10.toFixed(1)}–${whyPlayer.one.distribution.p90.toFixed(1)}` : "—"}</strong><small>single-gameweek P10 to P90</small></div>
              <div className={styles.distributionMetric}><span>FLOOR · P10</span><strong>{whyPlayer.five.distribution?.p10.toFixed(1) ?? "—"}</strong><small>10% of simulations land below this</small></div>
              <div className={styles.distributionMetric}><span>MEDIAN</span><strong>{whyPlayer.five.distribution?.median.toFixed(1) ?? "—"}</strong><small>central simulated outcome</small></div>
              <div className={styles.distributionMetric}><span>CEILING · P90</span><strong>{whyPlayer.five.distribution?.p90.toFixed(1) ?? "—"}</strong><small>90% of simulations land below this</small></div>
              <div className={styles.distributionMetric}><span>SHARPE-STYLE</span><strong>{whyPlayer.five.distribution?.sharpe.toFixed(2) ?? "—"}</strong><small>mean points per unit of spread</small></div>
            </div>
            <div className={styles.bandGrid} aria-label="Simulated outcome bands">
              {[
                ["0–2 BUST", whyPlayer.five.distribution?.bands.bust],
                ["3–5 FLOOR", whyPlayer.five.distribution?.bands.floor],
                ["6–9 MIDDLE", whyPlayer.five.distribution?.bands.middle],
                ["10+ HAUL", whyPlayer.five.distribution?.bands.haul],
              ].map(([label, value]) => (
                <div className={styles.bandCell} key={label as string}><span>{label}</span><strong>{value == null ? "—" : `${Math.round(value as number)}%`}</strong></div>
              ))}
            </div>
            <div className={styles.whyFixture}>
              <strong>
                {whyPlayer.one.fixtureLabels[0] ?? "No upcoming fixture"}
              </strong>
              <span>
                {whyPlayer.one.fixtureContexts[0]
                  ? `Attack factor ${whyPlayer.one.fixtureContexts[0].attackFactor.toFixed(2)} · CS ${(whyPlayer.one.fixtureContexts[0].cleanSheetProbability * 100).toFixed(0)}%`
                  : "Blank Gameweek"}
              </span>
            </div>
            <h3>One-Gameweek scoring components</h3>
            <div className={styles.componentGrid}>
              {Object.entries(whyPlayer.one.components).map(
                ([label, value]) => (
                  <div key={label}>
                    <span>{label.replace(/([A-Z])/g, " $1")}</span>
                    <strong>
                      {value >= 0 ? "+" : ""}
                      {value.toFixed(2)}
                    </strong>
                  </div>
                ),
              )}
            </div>
            <div className={styles.whyFooter}>
              <span>Data quality {whyPlayer.one.dataQuality}/100</span>
              <span>
                {whyPlayer.one.sportsbook.applied
                  ? `Market prior applied at ${(whyPlayer.one.sportsbook.effectiveWeight * 100).toFixed(1)}% effective weight`
                  : sportsbook?.available
                    ? "Market feed present; model weight currently disabled or unmatched"
                    : "Core model only"}
              </span>
            </div>
          </section>
        </div>
      )}

      <footer className={styles.footer}>
        <span>FPL Risk · Model {MODEL_VERSION}</span>
        <span>
          Independent project · Live public FPL data · Sportsbook layer is
          optional and fails open
        </span>
      </footer>
    </main>
  );
}

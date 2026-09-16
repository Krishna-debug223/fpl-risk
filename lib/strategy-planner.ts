import type { FplEvent, FplFixture, FplPlayer, FplTeam } from "./types";
import type { SportsbookPayload } from "./sportsbook";
import {
  projectPlayer,
  type HistoricalProfileMap,
  type MarketProjection,
  type ModelConfidence,
} from "./risk-v12";

export const PLANNER_VERSION = "1.0.0";

export type StrategyMode = "safe" | "balanced" | "aggressive";

export type PlannerMove = {
  outgoingId: number;
  incomingId: number;
  outgoingName: string;
  incomingName: string;
  expectedEdge: number;
};

export type PlannerStep = {
  eventId: number;
  eventName: string;
  action: "ROLL" | "TRANSFER";
  moves: PlannerMove[];
  hitCost: number;
  projectedPoints: number;
  captainName: string;
  formation: string;
  averageDataQuality: number;
  riskIndex: number;
  bankAfter: number;
  freeTransfersAfter: number;
};

export type StrategyPlan = {
  mode: StrategyMode;
  horizon: number;
  eventIds: number[];
  expectedPoints: number;
  baselinePoints: number;
  expectedGain: number;
  utilityScore: number;
  totalHits: number;
  transferCount: number;
  endingBank: number;
  endingFreeTransfers: number;
  averageDataQuality: number;
  riskIndex: number;
  risk: "Low" | "Medium" | "High";
  confidence: ModelConfidence;
  statesEvaluated: number;
  steps: PlannerStep[];
};

export type StrategyPlannerResult = {
  plannerVersion: string;
  generatedAt: string;
  horizon: number;
  events: Array<{ id: number; name: string; deadlineTime: string }>;
  plans: Record<StrategyMode, StrategyPlan>;
};

type EventProjection = {
  expected: number;
  volatility: number;
  dataQuality: number;
  risk: MarketProjection["risk"];
};

type PlayerProfile = {
  player: FplPlayer;
  projection: MarketProjection;
  byEvent: Map<number, EventProjection>;
};

type Lineup = {
  expected: number;
  captainId: number | null;
  formation: string;
  averageDataQuality: number;
  riskIndex: number;
};

type DraftState = {
  squadIds: number[];
  bank: number;
  freeTransfers: number;
  expectedPoints: number;
  utilityScore: number;
  totalHits: number;
  transferCount: number;
  qualitySum: number;
  riskSum: number;
  steps: PlannerStep[];
};

type RawMove = PlannerMove & {
  salePrice: number;
  buyPrice: number;
  scoreEdge: number;
};

const FORMATIONS: Array<[number, number, number]> = [
  [3, 4, 3],
  [3, 5, 2],
  [4, 3, 3],
  [4, 4, 2],
  [4, 5, 1],
  [5, 2, 3],
  [5, 3, 2],
  [5, 4, 1],
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function availability(player: FplPlayer) {
  if (["u", "n", "s"].includes(player.status)) return 0;
  const fallback =
    player.status === "a" ? 100 : player.status === "d" ? 65 : player.status === "i" ? 20 : 55;
  return clamp((player.chance_of_playing_next_round ?? fallback) / 100, 0, 1);
}

function futureEvents(events: FplEvent[], fixtures: FplFixture[], horizon: number) {
  const liveFixtureEvents = new Set(
    fixtures
      .filter((fixture) => !fixture.finished && fixture.event != null)
      .map((fixture) => fixture.event as number),
  );
  return events
    .filter((event) => !event.finished && liveFixtureEvents.has(event.id))
    .sort((a, b) => a.id - b.id)
    .slice(0, horizon);
}

function buildProfiles({
  players,
  fixtures,
  teams,
  eventIds,
  history,
  sportsbook,
}: {
  players: FplPlayer[];
  fixtures: FplFixture[];
  teams: FplTeam[];
  eventIds: number[];
  history?: HistoricalProfileMap;
  sportsbook?: SportsbookPayload | null;
}) {
  const profiles = new Map<number, PlayerProfile>();

  for (const player of players) {
    const projection = projectPlayer(
      player,
      fixtures,
      teams,
      eventIds.length,
      history,
      sportsbook,
      eventIds,
    );
    const expectedByEvent = new Map<number, number>(eventIds.map((id) => [id, 0]));

    projection.fixtureContexts.forEach((context, index) => {
      if (context.event == null || !expectedByEvent.has(context.event)) return;
      expectedByEvent.set(
        context.event,
        (expectedByEvent.get(context.event) ?? 0) + (projection.fixtureMeans[index] ?? 0),
      );
    });

    const totalExpected = Math.max(
      0.01,
      [...expectedByEvent.values()].reduce((sum, value) => sum + value, 0),
    );
    const byEvent = new Map<number, EventProjection>();
    eventIds.forEach((eventId) => {
      const expected = expectedByEvent.get(eventId) ?? 0;
      const share = clamp(expected / totalExpected, 0, 1);
      byEvent.set(eventId, {
        expected,
        volatility: projection.volatility * Math.sqrt(share),
        dataQuality: projection.dataQuality,
        risk: projection.risk,
      });
    });

    profiles.set(player.id, { player, projection, byEvent });
  }

  return profiles;
}

function eventProjection(profile: PlayerProfile | undefined, eventId: number): EventProjection {
  return (
    profile?.byEvent.get(eventId) ?? {
      expected: 0,
      volatility: 0,
      dataQuality: 0,
      risk: "High",
    }
  );
}

function chooseTop(
  squadIds: number[],
  count: number,
  position: number,
  eventId: number,
  profiles: Map<number, PlayerProfile>,
) {
  return squadIds
    .filter((id) => profiles.get(id)?.player.element_type === position)
    .sort(
      (a, b) =>
        eventProjection(profiles.get(b), eventId).expected -
        eventProjection(profiles.get(a), eventId).expected,
    )
    .slice(0, count);
}

function bestLineup(
  squadIds: number[],
  eventId: number,
  profiles: Map<number, PlayerProfile>,
): Lineup {
  const goalkeeper = chooseTop(squadIds, 1, 1, eventId, profiles);
  let best: Lineup | null = null;

  for (const [defenders, midfielders, forwards] of FORMATIONS) {
    const def = chooseTop(squadIds, defenders, 2, eventId, profiles);
    const mid = chooseTop(squadIds, midfielders, 3, eventId, profiles);
    const fwd = chooseTop(squadIds, forwards, 4, eventId, profiles);
    if (
      goalkeeper.length !== 1 ||
      def.length !== defenders ||
      mid.length !== midfielders ||
      fwd.length !== forwards
    ) {
      continue;
    }

    const starters = [...goalkeeper, ...def, ...mid, ...fwd];
    const captainId = [...starters].sort(
      (a, b) =>
        eventProjection(profiles.get(b), eventId).expected -
        eventProjection(profiles.get(a), eventId).expected,
    )[0] ?? null;
    const baseExpected = starters.reduce(
      (sum, id) => sum + eventProjection(profiles.get(id), eventId).expected,
      0,
    );
    const captainExpected = captainId
      ? eventProjection(profiles.get(captainId), eventId).expected
      : 0;
    const expected = baseExpected + captainExpected;
    const quality = average(
      starters.map((id) => eventProjection(profiles.get(id), eventId).dataQuality),
    );
    const baseVariance = starters.reduce((sum, id) => {
      const volatility = eventProjection(profiles.get(id), eventId).volatility;
      return sum + volatility * volatility;
    }, 0);
    const captainVolatility = captainId
      ? eventProjection(profiles.get(captainId), eventId).volatility
      : 0;
    const totalVariance = baseVariance + 3 * captainVolatility * captainVolatility;
    const riskIndex = Math.sqrt(totalVariance) / Math.max(expected, 1);
    const candidate: Lineup = {
      expected,
      captainId,
      formation: `${defenders}-${midfielders}-${forwards}`,
      averageDataQuality: quality,
      riskIndex,
    };
    if (!best || candidate.expected > best.expected) best = candidate;
  }

  return (
    best ?? {
      expected: 0,
      captainId: null,
      formation: "—",
      averageDataQuality: 0,
      riskIndex: 1,
    }
  );
}

function playerRemainingScore(
  profile: PlayerProfile,
  remainingEvents: number[],
  mode: StrategyMode,
) {
  const expected = remainingEvents.reduce(
    (sum, eventId) => sum + eventProjection(profile, eventId).expected,
    0,
  );
  const volatility = Math.sqrt(
    remainingEvents.reduce((sum, eventId) => {
      const value = eventProjection(profile, eventId).volatility;
      return sum + value * value;
    }, 0),
  );
  const quality = profile.projection.dataQuality;
  if (mode === "safe") return expected - volatility * 0.2 + quality * 0.012;
  if (mode === "aggressive") return expected + volatility * 0.055 + quality * 0.002;
  return expected - volatility * 0.07 + quality * 0.006;
}

function weeklyUtility(lineup: Lineup, hitCost: number, mode: StrategyMode) {
  const qualityBonus = (lineup.averageDataQuality - 50) * (mode === "safe" ? 0.018 : 0.008);
  const riskPenalty =
    mode === "safe"
      ? lineup.riskIndex * 5.2
      : mode === "balanced"
        ? lineup.riskIndex * 2.1
        : -lineup.riskIndex * 0.65;
  return lineup.expected - hitCost + qualityBonus - riskPenalty;
}

function playerSalePrice(
  playerId: number,
  initialSquadIds: Set<number>,
  sellingPrices: Map<number, number>,
  profiles: Map<number, PlayerProfile>,
) {
  if (initialSquadIds.has(playerId)) {
    return sellingPrices.get(playerId) ?? profiles.get(playerId)?.player.now_cost ?? 0;
  }
  return profiles.get(playerId)?.player.now_cost ?? 0;
}

function clubCount(squadIds: number[], teamId: number, profiles: Map<number, PlayerProfile>) {
  return squadIds.filter((id) => profiles.get(id)?.player.team === teamId).length;
}

function generateSingleMoves({
  state,
  step,
  eventIds,
  profiles,
  players,
  mode,
  initialSquadIds,
  sellingPrices,
  blockedOutgoing = new Set<number>(),
  blockedIncoming = new Set<number>(),
}: {
  state: Pick<DraftState, "squadIds" | "bank">;
  step: number;
  eventIds: number[];
  profiles: Map<number, PlayerProfile>;
  players: FplPlayer[];
  mode: StrategyMode;
  initialSquadIds: Set<number>;
  sellingPrices: Map<number, number>;
  blockedOutgoing?: Set<number>;
  blockedIncoming?: Set<number>;
}) {
  const remainingEvents = eventIds.slice(step);
  const squadSet = new Set(state.squadIds);
  const outgoing = [...state.squadIds]
    .filter((id) => !blockedOutgoing.has(id))
    .sort((a, b) => {
      const pa = profiles.get(a);
      const pb = profiles.get(b);
      return (
        (pa ? playerRemainingScore(pa, remainingEvents, mode) : -999) -
        (pb ? playerRemainingScore(pb, remainingEvents, mode) : -999)
      );
    })
    .slice(0, 6);

  const poolByPosition = new Map<number, FplPlayer[]>();
  for (let position = 1; position <= 4; position += 1) {
    poolByPosition.set(
      position,
      players
        .filter((player) => player.element_type === position)
        .filter((player) => !squadSet.has(player.id))
        .filter((player) => !blockedIncoming.has(player.id))
        .filter((player) => availability(player) >= 0.5)
        .sort((a, b) => {
          const pa = profiles.get(a.id);
          const pb = profiles.get(b.id);
          return (
            (pb ? playerRemainingScore(pb, remainingEvents, mode) : -999) -
            (pa ? playerRemainingScore(pa, remainingEvents, mode) : -999)
          );
        })
        .slice(0, 14),
    );
  }

  const moves: RawMove[] = [];
  for (const outgoingId of outgoing) {
    const outgoingProfile = profiles.get(outgoingId);
    if (!outgoingProfile) continue;
    const salePrice = playerSalePrice(
      outgoingId,
      initialSquadIds,
      sellingPrices,
      profiles,
    );
    const budget = state.bank + salePrice;
    const outgoingScore = playerRemainingScore(outgoingProfile, remainingEvents, mode);
    const candidates = poolByPosition.get(outgoingProfile.player.element_type) ?? [];

    for (const candidate of candidates) {
      if (candidate.now_cost > budget) continue;
      const existingClub = clubCount(state.squadIds, candidate.team, profiles);
      const outgoingSameClub = outgoingProfile.player.team === candidate.team ? 1 : 0;
      if (existingClub - outgoingSameClub >= 3) continue;
      const incomingProfile = profiles.get(candidate.id);
      if (!incomingProfile) continue;
      const incomingScore = playerRemainingScore(incomingProfile, remainingEvents, mode);
      const scoreEdge = incomingScore - outgoingScore;
      if (scoreEdge <= 0.15) continue;
      const expectedEdge = remainingEvents.reduce(
        (sum, eventId) =>
          sum +
          eventProjection(incomingProfile, eventId).expected -
          eventProjection(outgoingProfile, eventId).expected,
        0,
      );
      moves.push({
        outgoingId,
        incomingId: candidate.id,
        outgoingName: outgoingProfile.player.web_name,
        incomingName: candidate.web_name,
        expectedEdge,
        scoreEdge,
        salePrice,
        buyPrice: candidate.now_cost,
      });
    }
  }

  return moves.sort((a, b) => b.scoreEdge - a.scoreEdge).slice(0, 12);
}

function applyMoves(
  state: Pick<DraftState, "squadIds" | "bank">,
  moves: RawMove[],
) {
  let squadIds = [...state.squadIds];
  let bank = state.bank;
  for (const move of moves) {
    const index = squadIds.indexOf(move.outgoingId);
    if (index < 0 || squadIds.includes(move.incomingId)) return null;
    squadIds[index] = move.incomingId;
    bank += move.salePrice - move.buyPrice;
    if (bank < 0) return null;
  }
  return { squadIds, bank };
}

function validSquad(squadIds: number[], profiles: Map<number, PlayerProfile>) {
  if (squadIds.length !== 15 || new Set(squadIds).size !== 15) return false;
  for (const teamId of new Set(squadIds.map((id) => profiles.get(id)?.player.team ?? -1))) {
    if (teamId > 0 && clubCount(squadIds, teamId, profiles) > 3) return false;
  }
  const positionCounts = [1, 2, 3, 4].map(
    (position) => squadIds.filter((id) => profiles.get(id)?.player.element_type === position).length,
  );
  return (
    positionCounts[0] === 2 &&
    positionCounts[1] === 5 &&
    positionCounts[2] === 5 &&
    positionCounts[3] === 3
  );
}

function generateTransferPackages(args: Parameters<typeof generateSingleMoves>[0]) {
  const singles = generateSingleMoves(args);
  const packages: RawMove[][] = singles.slice(0, 9).map((move) => [move]);
  const pairKeys = new Set<string>();

  for (const first of singles.slice(0, 5)) {
    const afterFirst = applyMoves(args.state, [first]);
    if (!afterFirst) continue;
    const secondMoves = generateSingleMoves({
      ...args,
      state: afterFirst,
      blockedOutgoing: new Set([first.incomingId]),
      blockedIncoming: new Set([first.outgoingId, first.incomingId]),
    }).slice(0, 3);

    for (const second of secondMoves) {
      if (second.outgoingId === first.outgoingId || second.incomingId === first.incomingId) continue;
      const key = [
        `${first.outgoingId}-${first.incomingId}`,
        `${second.outgoingId}-${second.incomingId}`,
      ]
        .sort()
        .join("|");
      if (pairKeys.has(key)) continue;
      pairKeys.add(key);
      packages.push([first, second]);
    }
  }

  return packages
    .sort(
      (a, b) =>
        b.reduce((sum, move) => sum + move.scoreEdge, 0) -
        a.reduce((sum, move) => sum + move.scoreEdge, 0),
    )
    .slice(0, 14);
}

function baselinePoints(
  squadIds: number[],
  eventIds: number[],
  profiles: Map<number, PlayerProfile>,
) {
  return eventIds.reduce(
    (sum, eventId) => sum + bestLineup(squadIds, eventId, profiles).expected,
    0,
  );
}

function planConfidence(quality: number, gain: number, riskIndex: number): ModelConfidence {
  if (quality >= 72 && gain >= 4 && riskIndex < 0.5) return "High";
  if (quality >= 52 && gain >= 1.5 && riskIndex < 0.72) return "Medium";
  return "Low";
}

function riskLabel(riskIndex: number): StrategyPlan["risk"] {
  if (riskIndex < 0.42) return "Low";
  if (riskIndex < 0.62) return "Medium";
  return "High";
}

function stateKey(state: DraftState) {
  return `${[...state.squadIds].sort((a, b) => a - b).join("-")}|${state.bank}|${state.freeTransfers}`;
}

function runMode({
  mode,
  players,
  profiles,
  events,
  initialSquadIds,
  bank,
  sellingPrices,
  freeTransfers,
}: {
  mode: StrategyMode;
  players: FplPlayer[];
  profiles: Map<number, PlayerProfile>;
  events: FplEvent[];
  initialSquadIds: number[];
  bank: number;
  sellingPrices: Map<number, number>;
  freeTransfers: number;
}): StrategyPlan {
  const eventIds = events.map((event) => event.id);
  const initialIdSet = new Set(initialSquadIds);
  const baseline = baselinePoints(initialSquadIds, eventIds, profiles);
  const beamWidth = mode === "safe" ? 20 : mode === "aggressive" ? 30 : 26;
  let statesEvaluated = 0;
  let beam: DraftState[] = [
    {
      squadIds: [...initialSquadIds],
      bank,
      freeTransfers: clamp(Math.round(freeTransfers), 0, 5),
      expectedPoints: 0,
      utilityScore: 0,
      totalHits: 0,
      transferCount: 0,
      qualitySum: 0,
      riskSum: 0,
      steps: [],
    },
  ];

  events.forEach((event, step) => {
    const expanded: DraftState[] = [];
    for (const state of beam) {
      const transferPackages = generateTransferPackages({
        state,
        step,
        eventIds,
        profiles,
        players,
        mode,
        initialSquadIds: initialIdSet,
        sellingPrices,
      });
      const actions: RawMove[][] = [[], ...transferPackages];
      statesEvaluated += actions.length;

      for (const moves of actions) {
        const applied = moves.length ? applyMoves(state, moves) : { squadIds: [...state.squadIds], bank: state.bank };
        if (!applied || !validSquad(applied.squadIds, profiles)) continue;
        const hitCost = Math.max(0, moves.length - state.freeTransfers) * 4;
        const lineup = bestLineup(applied.squadIds, event.id, profiles);
        const usedTransfers = moves.length;
        const freeTransfersAfter = clamp(
          Math.max(0, state.freeTransfers - usedTransfers) + 1,
          1,
          5,
        );
        const captainName = lineup.captainId
          ? profiles.get(lineup.captainId)?.player.web_name ?? "—"
          : "—";
        const next: DraftState = {
          squadIds: applied.squadIds,
          bank: applied.bank,
          freeTransfers: freeTransfersAfter,
          expectedPoints: state.expectedPoints + lineup.expected - hitCost,
          utilityScore: state.utilityScore + weeklyUtility(lineup, hitCost, mode),
          totalHits: state.totalHits + hitCost,
          transferCount: state.transferCount + usedTransfers,
          qualitySum: state.qualitySum + lineup.averageDataQuality,
          riskSum: state.riskSum + lineup.riskIndex,
          steps: [
            ...state.steps,
            {
              eventId: event.id,
              eventName: event.name,
              action: moves.length ? "TRANSFER" : "ROLL",
              moves: moves.map(({ salePrice: _salePrice, buyPrice: _buyPrice, scoreEdge: _scoreEdge, ...move }) => move),
              hitCost,
              projectedPoints: lineup.expected - hitCost,
              captainName,
              formation: lineup.formation,
              averageDataQuality: lineup.averageDataQuality,
              riskIndex: lineup.riskIndex,
              bankAfter: applied.bank,
              freeTransfersAfter,
            },
          ],
        };
        expanded.push(next);
      }
    }

    const deduped = new Map<string, DraftState>();
    expanded
      .sort((a, b) => b.utilityScore - a.utilityScore)
      .forEach((state) => {
        const key = stateKey(state);
        if (!deduped.has(key)) deduped.set(key, state);
      });
    beam = [...deduped.values()]
      .sort((a, b) => b.utilityScore - a.utilityScore)
      .slice(0, beamWidth);
  });

  const best = [...beam].sort((a, b) => b.utilityScore - a.utilityScore)[0] ?? beam[0];
  const horizon = Math.max(events.length, 1);
  const averageDataQuality = best ? best.qualitySum / horizon : 0;
  const averageRisk = best ? best.riskSum / horizon : 1;
  const expectedPoints = best?.expectedPoints ?? baseline;
  const expectedGain = expectedPoints - baseline;

  return {
    mode,
    horizon: events.length,
    eventIds,
    expectedPoints,
    baselinePoints: baseline,
    expectedGain,
    utilityScore: best?.utilityScore ?? baseline,
    totalHits: best?.totalHits ?? 0,
    transferCount: best?.transferCount ?? 0,
    endingBank: best?.bank ?? bank,
    endingFreeTransfers: best?.freeTransfers ?? freeTransfers,
    averageDataQuality,
    riskIndex: averageRisk,
    risk: riskLabel(averageRisk),
    confidence: planConfidence(averageDataQuality, expectedGain, averageRisk),
    statesEvaluated,
    steps: best?.steps ?? [],
  };
}

export function buildStrategyPlans({
  players,
  teams,
  fixtures,
  events,
  squad,
  bank,
  sellingPrices,
  freeTransfers = 1,
  history,
  sportsbook,
  horizon = 8,
}: {
  players: FplPlayer[];
  teams: FplTeam[];
  fixtures: FplFixture[];
  events: FplEvent[];
  squad: FplPlayer[];
  bank: number;
  sellingPrices: Map<number, number>;
  freeTransfers?: number;
  history?: HistoricalProfileMap;
  sportsbook?: SportsbookPayload | null;
  horizon?: number;
}): StrategyPlannerResult | null {
  const planningEvents = futureEvents(events, fixtures, horizon);
  if (!planningEvents.length || squad.length !== 15) return null;
  const eventIds = planningEvents.map((event) => event.id);
  const profiles = buildProfiles({
    players,
    fixtures,
    teams,
    eventIds,
    history,
    sportsbook,
  });
  const initialSquadIds = squad.map((player) => player.id);
  if (!validSquad(initialSquadIds, profiles)) return null;

  const plans = {
    safe: runMode({
      mode: "safe",
      players,
      profiles,
      events: planningEvents,
      initialSquadIds,
      bank,
      sellingPrices,
      freeTransfers,
    }),
    balanced: runMode({
      mode: "balanced",
      players,
      profiles,
      events: planningEvents,
      initialSquadIds,
      bank,
      sellingPrices,
      freeTransfers,
    }),
    aggressive: runMode({
      mode: "aggressive",
      players,
      profiles,
      events: planningEvents,
      initialSquadIds,
      bank,
      sellingPrices,
      freeTransfers,
    }),
  } satisfies Record<StrategyMode, StrategyPlan>;

  return {
    plannerVersion: PLANNER_VERSION,
    generatedAt: new Date().toISOString(),
    horizon: planningEvents.length,
    events: planningEvents.map((event) => ({
      id: event.id,
      name: event.name,
      deadlineTime: event.deadline_time,
    })),
    plans,
  };
}

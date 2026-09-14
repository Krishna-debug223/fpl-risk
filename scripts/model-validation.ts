import {
  historyBlendInfo,
  projectPlayer,
  recommendReplacements,
  simulateTransfer,
  type HistoricalProfileMap,
} from "../lib/risk";
import type { FplFixture, FplPlayer, FplTeam } from "../lib/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MODEL CHECK FAILED: ${message}`);
}

function player(overrides: Partial<FplPlayer> = {}): FplPlayer {
  return {
    id: 1,
    code: 1001,
    web_name: "Test",
    first_name: "Test",
    second_name: "Player",
    team: 1,
    element_type: 3,
    now_cost: 80,
    total_points: 12,
    minutes: 180,
    starts: 2,
    form: "6.0",
    points_per_game: "6.0",
    selected_by_percent: "10.0",
    ep_next: "5.5",
    chance_of_playing_next_round: 100,
    status: "a",
    expected_goals: "0.8",
    expected_assists: "0.6",
    expected_goal_involvements: "1.4",
    expected_goals_per_90: "0.40",
    expected_assists_per_90: "0.30",
    expected_goal_involvements_per_90: "0.70",
    expected_goals_conceded_per_90: "1.1",
    clean_sheets: 1,
    clean_sheets_per_90: "0.5",
    saves: 0,
    saves_per_90: "0",
    goals_conceded_per_90: "1.1",
    bonus: 3,
    bps: 45,
    yellow_cards: 0,
    red_cards: 0,
    defensive_contribution: 14,
    defensive_contribution_per_90: "7.0",
    transfers_in_event: 50000,
    transfers_out_event: 10000,
    ...overrides,
  };
}

const teams: FplTeam[] = [
  { id: 1, name: "Strong FC", short_name: "STR", strength: 5, strength_attack_home: 1350, strength_attack_away: 1300, strength_defence_home: 1320, strength_defence_away: 1270, elo: 1780, underlying_matches: 2, underlying_attack_xg_per_match: 2.05, underlying_attack_xa_per_match: 1.55, underlying_defence_xga_per_match: 0.78 },
  { id: 2, name: "Weak FC", short_name: "WEA", strength: 2, strength_attack_home: 930, strength_attack_away: 900, strength_defence_home: 920, strength_defence_away: 890, elo: 1450, underlying_matches: 2, underlying_attack_xg_per_match: 0.72, underlying_attack_xa_per_match: 0.58, underlying_defence_xga_per_match: 2.15 },
  { id: 3, name: "Average FC", short_name: "AVG", strength: 3, strength_attack_home: 1100, strength_attack_away: 1080, strength_defence_home: 1100, strength_defence_away: 1080, elo: 1600, underlying_matches: 2, underlying_attack_xg_per_match: 1.4, underlying_attack_xa_per_match: 1.05, underlying_defence_xga_per_match: 1.42 },
  { id: 4, name: "Other FC", short_name: "OTH", strength: 3, strength_attack_home: 1080, strength_attack_away: 1060, strength_defence_home: 1080, strength_defence_away: 1060, elo: 1580, underlying_matches: 2, underlying_attack_xg_per_match: 1.3, underlying_attack_xa_per_match: 1.0, underlying_defence_xga_per_match: 1.5 },
];

const fixtures: FplFixture[] = [
  { id: 1, event: 1, team_h: 1, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 4, team_h_score: 2, team_a_score: 0, kickoff_time: "2026-08-22T14:00:00Z", finished: true, started: true },
  { id: 2, event: 1, team_h: 2, team_a: 4, team_h_difficulty: 3, team_a_difficulty: 2, team_h_score: 0, team_a_score: 2, kickoff_time: "2026-08-22T14:00:00Z", finished: true, started: true },
  { id: 3, event: 2, team_h: 3, team_a: 1, team_h_difficulty: 4, team_a_difficulty: 2, team_h_score: 1, team_a_score: 3, kickoff_time: "2026-08-29T14:00:00Z", finished: true, started: true },
  { id: 4, event: 2, team_h: 4, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, team_h_score: 2, team_a_score: 0, kickoff_time: "2026-08-29T14:00:00Z", finished: true, started: true },
  { id: 10, event: 3, team_h: 1, team_a: 2, team_h_difficulty: 1, team_a_difficulty: 5, kickoff_time: "2026-09-05T14:00:00Z", finished: false, started: false },
  { id: 11, event: 3, team_h: 3, team_a: 4, team_h_difficulty: 3, team_a_difficulty: 3, kickoff_time: "2026-09-05T14:00:00Z", finished: false, started: false },
  { id: 12, event: 4, team_h: 4, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 1, kickoff_time: "2026-09-12T14:00:00Z", finished: false, started: false },
  { id: 13, event: 4, team_h: 2, team_a: 3, team_h_difficulty: 4, team_a_difficulty: 2, kickoff_time: "2026-09-12T14:00:00Z", finished: false, started: false },
  { id: 14, event: 5, team_h: 1, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 4, kickoff_time: "2026-09-19T14:00:00Z", finished: false, started: false },
  { id: 15, event: 5, team_h: 3, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, kickoff_time: "2026-09-19T14:00:00Z", finished: false, started: false },
  { id: 16, event: 6, team_h: 2, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 1, kickoff_time: "2026-09-26T14:00:00Z", finished: false, started: false },
  { id: 17, event: 6, team_h: 4, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 3, kickoff_time: "2026-09-26T14:00:00Z", finished: false, started: false },
  { id: 18, event: 7, team_h: 1, team_a: 3, team_h_difficulty: 2, team_a_difficulty: 4, kickoff_time: "2026-10-03T14:00:00Z", finished: false, started: false },
  { id: 19, event: 7, team_h: 2, team_a: 4, team_h_difficulty: 4, team_a_difficulty: 2, kickoff_time: "2026-10-03T14:00:00Z", finished: false, started: false },
];

const history: HistoricalProfileMap = {
  "1001": [
    { season: "2025-26", minutes: 2800, starts: 32, totalPoints: 180, pointsPerGame: 5.5, xgi90: 0.63, expectedGoalsPer90: 0.35, expectedAssistsPer90: 0.28, defensiveContributionPer90: 6.2, savesPer90: 0, bonusPer90: 0.35, yellowCardsPer90: 0.12, startsPerMatch: 32 / 38, minutesPerStart: 84 },
    { season: "2024-25", minutes: 2500, starts: 29, totalPoints: 155, pointsPerGame: 5.0, xgi90: 0.55, expectedGoalsPer90: 0.31, expectedAssistsPer90: 0.24, defensiveContributionPer90: 5.8, savesPer90: 0, bonusPer90: 0.31, yellowCardsPer90: 0.1, startsPerMatch: 29 / 38, minutesPerStart: 82 },
  ],
};

const returningEarly = player({ minutes: 0, starts: 0 });
const returningLate = player({ minutes: 900, starts: 10 });
assert(historyBlendInfo(returningEarly, history).influence > 0.5, "historical prior should be strong at zero current minutes");
assert(historyBlendInfo(returningLate, history).influence === 0, "historical prior should be fully faded by 900 minutes");

const strongPlayer = player({ id: 1, code: 1001, team: 1 });
const weakPlayer = player({ id: 2, code: 2002, team: 2, web_name: "WeakCopy" });
const strongProjection = projectPlayer(strongPlayer, fixtures, teams, 1, history);
const weakProjection = projectPlayer(weakPlayer, fixtures, teams, 1, undefined);
assert(strongProjection.expected > weakProjection.expected, "strong team / easy matchup should project above weak team / hard matchup");

// A hot FPL points streak without matching underlying performance must not be extrapolated.
const lowUnderlyingHauler = player({
  id: 31, code: 3100, team: 3, element_type: 2, minutes: 180, starts: 2,
  total_points: 20, points_per_game: "10.0", form: "10.0", ep_next: "7.5",
  expected_goals: "0.05", expected_assists: "0.02", expected_goals_per_90: "0.025",
  expected_assists_per_90: "0.01", expected_goal_involvements_per_90: "0.035",
  defensive_contribution: 20, defensive_contribution_per_90: "10.0", bonus: 5,
});
const identicalUnderlyingQuiet = player({
  id: 32, code: 3200, team: 3, element_type: 2, minutes: 180, starts: 2,
  total_points: 4, points_per_game: "2.0", form: "2.0", ep_next: "2.5",
  expected_goals: "0.05", expected_assists: "0.02", expected_goals_per_90: "0.025",
  expected_assists_per_90: "0.01", expected_goal_involvements_per_90: "0.035",
  defensive_contribution: 20, defensive_contribution_per_90: "10.0", bonus: 0,
});
const haulerProjection = projectPlayer(lowUnderlyingHauler, fixtures, teams, 5);
const quietProjection = projectPlayer(identicalUnderlyingQuiet, fixtures, teams, 5);
assert(haulerProjection.expected / Math.max(quietProjection.expected, 0.1) < 1.22, "one or two FPL hauls must not create a huge forward projection when underlying data is the same");
assert(haulerProjection.expected < 34, "a defender with weak xG/xA cannot project near 10 points per Gameweek merely from early returns");

const unavailableProjection = projectPlayer(player({ id: 3, code: 3003, team: 1, chance_of_playing_next_round: 0, status: "i" }), fixtures, teams, 1);
assert(unavailableProjection.expected < strongProjection.expected * 0.45, "unavailable player should be materially discounted");
const permanentlyUnavailable = projectPlayer(player({ id: 30, code: 3030, team: 1, chance_of_playing_next_round: 0, status: "u" }), fixtures, teams, 5);
assert(permanentlyUnavailable.expected === 0, "players marked unavailable should not be assumed to recover later in the horizon");

const doubleFixtures = [...fixtures, { id: 20, event: 3, team_h: 4, team_a: 1, team_h_difficulty: 4, team_a_difficulty: 2, kickoff_time: "2026-09-08T18:00:00Z", finished: false, started: false } satisfies FplFixture];
const doubleProjection = projectPlayer(strongPlayer, doubleFixtures, teams, 1, history);
assert(doubleProjection.expected > strongProjection.expected * 1.45, "Double Gameweek should add the second fixture instead of replacing the first");

const blankPlayer = player({ id: 4, code: 4004, team: 2 });
const blankProjection = projectPlayer(blankPlayer, fixtures.filter((fixture) => !(fixture.event === 3 && (fixture.team_h === 2 || fixture.team_a === 2))), teams, 1);
assert(blankProjection.fixtureMeans[0] === 0, "blank Gameweek should project zero fixture points");

const incoming = player({ id: 5, code: 5005, team: 1, web_name: "Incoming", now_cost: 80, points_per_game: "6.5", form: "7.0", ep_next: "6.2", expected_goals_per_90: "0.50", expected_assists_per_90: "0.32", expected_goal_involvements_per_90: "0.82" });
const outgoing = player({ id: 6, code: 6006, team: 3, web_name: "Outgoing", now_cost: 75, points_per_game: "4.0", form: "4.0", ep_next: "4.0", expected_goals_per_90: "0.22", expected_assists_per_90: "0.18", expected_goal_involvements_per_90: "0.40" });
const squad = [outgoing, player({ id: 7, code: 7007, team: 3, element_type: 2 }), player({ id: 8, code: 8008, team: 4, element_type: 4 })];
const noHit = recommendReplacements({ players: [incoming, outgoing, ...squad.slice(1)], squad, fixtures, teams, outgoing, bank: 10, freeTransfers: 1, limit: 1 })[0];
const withHit = recommendReplacements({ players: [incoming, outgoing, ...squad.slice(1)], squad, fixtures, teams, outgoing, bank: 10, freeTransfers: 0, limit: 1 })[0];
assert(noHit && withHit, "test transfer should produce a recommendation");
assert(Math.abs((noHit.expectedGain - withHit.expectedGain) - 4) < 0.0001, "zero free transfers must subtract exactly four expected points");
assert(withHit.transferCost === 4, "recommendation should expose the applied hit cost");
const injuredStar = player({ id: 50, code: 5050, team: 1, web_name: "InjuredStar", now_cost: 80, status: "i", chance_of_playing_next_round: 0, points_per_game: "9.0", form: "9.0", ep_next: "9.0" });
const injuryFiltered = recommendReplacements({ players: [injuredStar, incoming, outgoing, ...squad.slice(1)], squad, fixtures, teams, outgoing, bank: 10, freeTransfers: 1, limit: 3 });
assert(!injuryFiltered.some((recommendation) => recommendation.incomingId === injuredStar.id), "low-availability incoming players should not be recommended");

const simulationA = simulateTransfer(outgoing, incoming, fixtures, teams, 5, 4000, 0);
const simulationB = simulateTransfer(outgoing, incoming, fixtures, teams, 5, 4000, 0);
assert(simulationA.expectedGain === simulationB.expectedGain, "seeded simulation should be reproducible");
assert(simulationA.successProbability === simulationB.successProbability, "seeded success probability should be reproducible");

console.log("MODEL CHECK PASSED");
console.log(JSON.stringify({
  strongFixture1GW: Number(strongProjection.expected.toFixed(2)),
  weakFixture1GW: Number(weakProjection.expected.toFixed(2)),
  lowUnderlyingHauler5GW: Number(haulerProjection.expected.toFixed(2)),
  sameUnderlyingQuiet5GW: Number(quietProjection.expected.toFixed(2)),
  doubleGw: Number(doubleProjection.expected.toFixed(2)),
  noHitEdge: Number(noHit.expectedGain.toFixed(2)),
  hitEdge: Number(withHit.expectedGain.toFixed(2)),
  deterministicSimulationEdge: Number(simulationA.expectedGain.toFixed(2)),
}, null, 2));

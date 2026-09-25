import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { MODEL_VERSION, projectPlayer } from "../lib/risk-v12";
import type { SportsbookPayload } from "../lib/sportsbook";
import type { FplFixture, FplPlayer, FplTeam } from "../lib/types";

type CsvRow = Record<string, string>;
type Observation = {
  gw: number;
  playerId: number;
  player: string;
  position: string;
  predicted: number;
  actual: number;
  appearanceProbability: number;
  appeared: number;
  p10: number;
  p90: number;
};

type MetricSet = {
  n: number;
  mae: number | null;
  rmse: number | null;
  pearson: number | null;
  spearman: number | null;
  appearanceBrier: number | null;
  interval80Coverage: number | null;
  topDecileActualAverage: number | null;
  topDecileHaulRate: number | null;
  overallHaulRate: number | null;
};

type TeamCsv = { id: number; name: string; shortName: string };

const TARGET_SEASON = process.env.BACKTEST_SEASON ?? "2025-26";
const START_GW = Math.max(2, Number.parseInt(process.env.BACKTEST_START_GW ?? "4", 10) || 4);
const END_GW = Math.min(38, Number.parseInt(process.env.BACKTEST_END_GW ?? "38", 10) || 38);
const BASE = `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/${TARGET_SEASON}`;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function fetchCsv(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "FPL-Prism-Backtest/1.0" } });
  if (!response.ok) throw new Error(`Backtest source returned ${response.status}: ${url}`);
  return parseCsv(await response.text());
}

const num = (value: string | undefined, fallback = 0) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};
const integer = (value: string | undefined, fallback = 0) => Math.trunc(num(value, fallback));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function column(row: CsvRow, ...names: string[]) {
  for (const name of names) if (row[name] != null && row[name] !== "") return row[name];
  return "";
}

function gwOf(row: CsvRow) {
  return integer(column(row, "GW", "round"));
}

function playerId(row: CsvRow) {
  return integer(column(row, "element", "id"));
}

function positionType(row: CsvRow) {
  const raw = column(row, "position").toUpperCase();
  if (raw.includes("GK")) return 1;
  if (raw.includes("DEF")) return 2;
  if (raw.includes("MID")) return 3;
  if (raw.includes("FWD") || raw.includes("FOR")) return 4;
  return 3;
}

function boolean(value: string | undefined) {
  return ["true", "1", "yes"].includes((value ?? "").toLowerCase());
}

function teamName(row: CsvRow) {
  return column(row, "team", "team_name").trim();
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamLookup(teams: TeamCsv[]) {
  const lookup = new Map<string, TeamCsv>();
  teams.forEach((team) => {
    lookup.set(normalizeName(team.name), team);
    lookup.set(normalizeName(team.shortName), team);
  });
  return lookup;
}

function rowsByFixture(rows: CsvRow[]) {
  const grouped = new Map<number, CsvRow[]>();
  rows.forEach((row) => {
    const id = integer(column(row, "fixture"));
    if (!id) return;
    const bucket = grouped.get(id) ?? [];
    bucket.push(row);
    grouped.set(id, bucket);
  });
  return grouped;
}

function buildFixtures(rows: CsvRow[], teams: TeamCsv[], targetGw: number): FplFixture[] {
  const lookup = teamLookup(teams);
  const fixtures: FplFixture[] = [];
  rowsByFixture(rows.filter((row) => gwOf(row) <= targetGw)).forEach((fixtureRows, id) => {
    const sample = fixtureRows[0];
    const homeRow = fixtureRows.find((row) => boolean(column(row, "was_home"))) ?? sample;
    const awayRow = fixtureRows.find((row) => !boolean(column(row, "was_home"))) ?? sample;
    const home = lookup.get(normalizeName(teamName(homeRow)));
    const away = lookup.get(normalizeName(teamName(awayRow)));
    if (!home || !away || home.id === away.id) return;
    const event = gwOf(sample);
    const finished = event < targetGw;
    fixtures.push({
      id,
      event,
      team_h: home.id,
      team_a: away.id,
      team_h_difficulty: 3,
      team_a_difficulty: 3,
      team_h_score: finished ? integer(column(sample, "team_h_score")) : undefined,
      team_a_score: finished ? integer(column(sample, "team_a_score")) : undefined,
      kickoff_time: column(sample, "kickoff_time") || null,
      finished,
      started: finished,
    });
  });
  return fixtures;
}

function buildTeams(priorRows: CsvRow[], teamRows: TeamCsv[]): FplTeam[] {
  const lookup = teamLookup(teamRows);
  const fixtureGroups = rowsByFixture(priorRows);
  const attack = new Map<number, number[]>();
  const concede = new Map<number, number[]>();

  fixtureGroups.forEach((rows) => {
    const teamsInFixture = [...new Set(rows.map(teamName).filter(Boolean))];
    if (teamsInFixture.length !== 2) return;
    teamsInFixture.forEach((name) => {
      const team = lookup.get(normalizeName(name));
      const opponentName = teamsInFixture.find((candidate) => candidate !== name);
      const opponent = opponentName ? lookup.get(normalizeName(opponentName)) : null;
      if (!team || !opponent) return;
      const ownRows = rows.filter((row) => normalizeName(teamName(row)) === normalizeName(name));
      const opponentRows = rows.filter((row) => normalizeName(teamName(row)) === normalizeName(opponentName ?? ""));
      const ownXg = ownRows.reduce((sum, row) => sum + num(column(row, "expected_goals")), 0);
      const opponentXg = opponentRows.reduce((sum, row) => sum + num(column(row, "expected_goals")), 0);
      attack.set(team.id, [...(attack.get(team.id) ?? []), ownXg]);
      concede.set(team.id, [...(concede.get(team.id) ?? []), opponentXg]);
    });
  });

  const leagueAttack = mean([...attack.values()].flat()) || 1.42;
  return teamRows.map((team) => {
    const attackValues = attack.get(team.id) ?? [];
    const concedeValues = concede.get(team.id) ?? [];
    const xg = attackValues.length ? mean(attackValues) : leagueAttack;
    const xga = concedeValues.length ? mean(concedeValues) : leagueAttack;
    const attackStrength = clamp(Math.round(1000 * Math.pow(xg / leagueAttack, 0.45)), 800, 1250);
    const defenceStrength = clamp(Math.round(1000 * Math.pow(leagueAttack / Math.max(xga, 0.35), 0.45)), 800, 1250);
    return {
      id: team.id,
      name: team.name,
      short_name: team.shortName,
      strength: 3,
      strength_attack_home: Math.round(attackStrength * 1.03),
      strength_attack_away: Math.round(attackStrength * 0.98),
      strength_defence_home: Math.round(defenceStrength * 1.03),
      strength_defence_away: Math.round(defenceStrength * 0.98),
      underlying_matches: attackValues.length,
      underlying_attack_xg_per_match: xg,
      underlying_attack_xa_per_match: Math.max(0.55, xg * 0.73),
      underlying_defence_xga_per_match: xga,
    };
  });
}

function aggregatePlayer(target: CsvRow, prior: CsvRow[], teamId: number): FplPlayer {
  const minutes = prior.reduce((sum, row) => sum + integer(column(row, "minutes")), 0);
  const starts = prior.reduce((sum, row) => sum + integer(column(row, "starts")), 0);
  const xg = prior.reduce((sum, row) => sum + num(column(row, "expected_goals")), 0);
  const xa = prior.reduce((sum, row) => sum + num(column(row, "expected_assists")), 0);
  const points = prior.reduce((sum, row) => sum + integer(column(row, "total_points")), 0);
  const bonus = prior.reduce((sum, row) => sum + integer(column(row, "bonus")), 0);
  const saves = prior.reduce((sum, row) => sum + integer(column(row, "saves")), 0);
  const yellows = prior.reduce((sum, row) => sum + integer(column(row, "yellow_cards")), 0);
  const defcon = prior.reduce((sum, row) => sum + num(column(row, "defensive_contribution", "defensive_contributions")), 0);
  const games = prior.filter((row) => integer(column(row, "minutes")) > 0).length;
  const per90 = (value: number) => minutes > 0 ? 90 * value / minutes : 0;
  const name = column(target, "name", "web_name") || `Player ${playerId(target)}`;
  const parts = name.split(" ");
  const position = positionType(target);
  const price = Math.max(35, integer(column(target, "value"), 50));
  const ppg = games ? points / games : 0;

  return {
    id: playerId(target),
    code: playerId(target),
    web_name: parts.at(-1) ?? name,
    first_name: parts[0] ?? name,
    second_name: parts.slice(1).join(" "),
    team: teamId,
    element_type: position,
    now_cost: price,
    total_points: points,
    minutes,
    starts,
    form: "0",
    points_per_game: ppg.toFixed(2),
    selected_by_percent: "0",
    ep_next: null,
    chance_of_playing_next_round: 100,
    status: "a",
    expected_goals: xg.toFixed(4),
    expected_assists: xa.toFixed(4),
    expected_goal_involvements: (xg + xa).toFixed(4),
    expected_goals_per_90: per90(xg).toFixed(4),
    expected_assists_per_90: per90(xa).toFixed(4),
    expected_goal_involvements_per_90: per90(xg + xa).toFixed(4),
    expected_goals_conceded_per_90: "1.4",
    clean_sheets: prior.reduce((sum, row) => sum + integer(column(row, "clean_sheets")), 0),
    saves,
    saves_per_90: per90(saves).toFixed(4),
    bonus,
    bps: prior.reduce((sum, row) => sum + integer(column(row, "bps")), 0),
    yellow_cards: yellows,
    red_cards: prior.reduce((sum, row) => sum + integer(column(row, "red_cards")), 0),
    defensive_contribution: defcon,
    defensive_contribution_per_90: per90(defcon).toFixed(4),
    transfers_in_event: 0,
    transfers_out_event: 0,
  };
}

function ranks(values: number[]) {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const output = new Array<number>(values.length);
  for (let i = 0; i < indexed.length;) {
    let j = i + 1;
    while (j < indexed.length && indexed[j].value === indexed[i].value) j += 1;
    const rank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k += 1) output[indexed[k].index] = rank;
    i = j;
  }
  return output;
}

function pearson(a: number[], b: number[]) {
  if (a.length < 2 || a.length !== b.length) return null;
  const ma = mean(a); const mb = mean(b);
  let numerator = 0; let da = 0; let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    const xa = a[i] - ma; const xb = b[i] - mb;
    numerator += xa * xb; da += xa * xa; db += xb * xb;
  }
  return da > 0 && db > 0 ? numerator / Math.sqrt(da * db) : null;
}

function metrics(rows: Observation[]): MetricSet {
  if (!rows.length) return { n: 0, mae: null, rmse: null, pearson: null, spearman: null, appearanceBrier: null, interval80Coverage: null, topDecileActualAverage: null, topDecileHaulRate: null, overallHaulRate: null };
  const errors = rows.map((row) => row.predicted - row.actual);
  const predicted = rows.map((row) => row.predicted);
  const actual = rows.map((row) => row.actual);
  const sortedByProjection = [...rows].sort((a, b) => b.predicted - a.predicted);
  const top = sortedByProjection.slice(0, Math.max(1, Math.ceil(rows.length * 0.1)));
  const round = (value: number | null) => value == null ? null : Number(value.toFixed(4));
  return {
    n: rows.length,
    mae: round(mean(errors.map(Math.abs))),
    rmse: round(Math.sqrt(mean(errors.map((error) => error * error)))),
    pearson: round(pearson(predicted, actual)),
    spearman: round(pearson(ranks(predicted), ranks(actual))),
    appearanceBrier: round(mean(rows.map((row) => Math.pow(row.appearanceProbability - row.appeared, 2)))),
    interval80Coverage: round(mean(rows.map((row) => row.actual >= row.p10 && row.actual <= row.p90 ? 1 : 0))),
    topDecileActualAverage: round(mean(top.map((row) => row.actual))),
    topDecileHaulRate: round(mean(top.map((row) => row.actual >= 10 ? 1 : 0))),
    overallHaulRate: round(mean(rows.map((row) => row.actual >= 10 ? 1 : 0)),
    ),
  };
}

function loadOptionalSportsbook(): SportsbookPayload | null {
  const path = process.env.SPORTSBOOK_BACKTEST_JSON?.trim();
  if (!path) return null;
  return JSON.parse(readFileSync(resolve(path), "utf-8")) as SportsbookPayload;
}

async function main() {
  console.log(`FPL Prism walk-forward backtest · model ${MODEL_VERSION} · season ${TARGET_SEASON}`);
  console.log(`Target GWs ${START_GW}-${END_GW}; each prediction uses only rows from earlier Gameweeks.`);

  const [allRows, rawTeams] = await Promise.all([
    fetchCsv(`${BASE}/gws/merged_gw.csv`),
    fetchCsv(`${BASE}/teams.csv`),
  ]);
  const teams: TeamCsv[] = rawTeams.map((row) => ({
    id: integer(column(row, "id")),
    name: column(row, "name"),
    shortName: column(row, "short_name", "shortName", "name").slice(0, 3).toUpperCase(),
  })).filter((team) => team.id && team.name);
  const lookup = teamLookup(teams);
  const sportsbook = loadOptionalSportsbook();
  const observations: Observation[] = [];

  for (let gw = START_GW; gw <= END_GW; gw += 1) {
    const targetRows = allRows.filter((row) => gwOf(row) === gw);
    if (!targetRows.length) continue;
    const priorRows = allRows.filter((row) => gwOf(row) > 0 && gwOf(row) < gw);
    const modelTeams = buildTeams(priorRows, teams);
    const modelFixtures = buildFixtures([...priorRows, ...targetRows], teams, gw);
    const priorByPlayer = new Map<number, CsvRow[]>();
    priorRows.forEach((row) => {
      const id = playerId(row); if (!id) return;
      const bucket = priorByPlayer.get(id) ?? []; bucket.push(row); priorByPlayer.set(id, bucket);
    });

    targetRows.forEach((target) => {
      const id = playerId(target);
      if (!id) return;
      const team = lookup.get(normalizeName(teamName(target)));
      if (!team) return;
      const prior = priorByPlayer.get(id) ?? [];
      if (!prior.length) return; // new players have no current-season evidence in this first harness.
      const modelPlayer = aggregatePlayer(target, prior, team.id);
      const projection = projectPlayer(modelPlayer, modelFixtures, modelTeams, 1, undefined, sportsbook);
      const actual = integer(column(target, "total_points"));
      const appeared = integer(column(target, "minutes")) > 0 ? 1 : 0;
      const interval = 1.2815515655446004 * projection.volatility;
      observations.push({
        gw,
        playerId: id,
        player: column(target, "name", "web_name"),
        position: ["", "GKP", "DEF", "MID", "FWD"][modelPlayer.element_type] ?? "UNK",
        predicted: projection.expected,
        actual,
        appearanceProbability: projection.appearanceProbabilities[0] ?? 0,
        appeared,
        p10: Math.max(0, projection.expected - interval),
        p90: projection.expected + interval,
      });
    });
    console.log(`GW${gw}: ${targetRows.length} source rows, ${observations.filter((row) => row.gw === gw).length} evaluated.`);
  }

  const positions = ["GKP", "DEF", "MID", "FWD"];
  const report = {
    modelVersion: MODEL_VERSION,
    targetSeason: TARGET_SEASON,
    generatedAt: new Date().toISOString(),
    methodology: {
      walkForward: true,
      noLookahead: "Player/team rates for target GW N are built only from merged_gw rows where GW < N. Target-GW rows supply identity, deadline price/fixture mapping and realized outcome only.",
      source: "vaastav/Fantasy-Premier-League historical data",
      startingGw: START_GW,
      endingGw: END_GW,
      limitations: [
        "Historical injury/suspension snapshots are not reconstructed, so availability is neutral in this harness.",
        "Official historical FDR/static team-strength snapshots are not reconstructed; lagged team xG-derived strength is used instead.",
        "Historical multi-season priors are omitted from this first walk-forward harness.",
        sportsbook ? "Sportsbook backtest signals were loaded from SPORTSBOOK_BACKTEST_JSON." : "No historical sportsbook archive supplied; sportsbook before/after calibration is intentionally not claimed.",
      ],
    },
    overall: metrics(observations),
    byPosition: Object.fromEntries(positions.map((position) => [position, metrics(observations.filter((row) => row.position === position))])),
    byGameweek: Object.fromEntries([...new Set(observations.map((row) => row.gw))].map((gw) => [String(gw), metrics(observations.filter((row) => row.gw === gw))])),
    sportsbookComparison: sportsbook ? { status: "signals-loaded", note: "This run includes the supplied historical market payload. Run again without SPORTSBOOK_BACKTEST_JSON for a diffable baseline." } : { status: "not-run", note: "Historical sportsbook odds were not supplied, so no market-improvement claim is made." },
  };

  const output = resolve(`reports/backtest-${MODEL_VERSION}-${TARGET_SEASON}.json`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(`Wrote ${output}`);
  console.log(JSON.stringify({ overall: report.overall, byPosition: report.byPosition, sportsbookComparison: report.sportsbookComparison }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

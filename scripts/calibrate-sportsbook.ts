import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  decimalOddsToProbability,
  impliedGoalMeanFromTotal,
  removeVig,
  splitExpectedGoals,
} from "../lib/sportsbook";

type CsvRow = Record<string, string>;
type Match = {
  gw: number;
  fixture: number;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
};
type Odds = {
  home: string;
  away: string;
  homePrice: number;
  drawPrice: number;
  awayPrice: number;
  over25: number;
  under25: number;
};
type Evaluation = {
  weight: number;
  nMatches: number;
  goalRmse: number;
  poissonNll: number;
  cleanSheetBrier: number;
};

const SEASON = process.env.BACKTEST_SEASON ?? "2025-26";
const VAASTAV_BASE = `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/${SEASON}`;
const ODDS_MIRROR = "https://raw.githubusercontent.com/AnishKhetani/premier-league-data/main/data/processed/results_with_odds.csv";

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
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function fetchCsv(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "FPL-Prism-Sportsbook-Calibration/1.0", Accept: "text/csv,*/*" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Calibration source returned ${response.status}: ${url}`);
    return parseCsv(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

const num = (value: string | undefined, fallback = 0) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};
const integer = (value: string | undefined, fallback = 0) => Math.trunc(num(value, fallback));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const col = (row: CsvRow, ...names: string[]) => {
  for (const name of names) if (row[name] != null && row[name] !== "") return row[name];
  return "";
};
const normal = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function alias(value: string) {
  const key = normal(value);
  const aliases: Record<string, string> = {
    manchesterunited: "manutd",
    manunited: "manutd",
    manchesterutd: "manutd",
    manchestercity: "mancity",
    nottinghamforest: "nottmforest",
    nottmforest: "nottmforest",
    tottenhamhotspur: "spurs",
    tottenham: "spurs",
    wolverhamptonwanderers: "wolves",
    wolverhampton: "wolves",
    brightonandhovealbion: "brighton",
    newcastleunited: "newcastle",
    westhamunited: "westham",
    leedsunited: "leeds",
  };
  return aliases[key] ?? key;
}

function fplMatches(rows: CsvRow[]): Match[] {
  const grouped = new Map<number, CsvRow[]>();
  rows.forEach((row) => {
    const fixture = integer(col(row, "fixture"));
    if (!fixture) return;
    const bucket = grouped.get(fixture) ?? [];
    bucket.push(row);
    grouped.set(fixture, bucket);
  });

  const output: Match[] = [];
  grouped.forEach((fixtureRows, fixture) => {
    const homeRows = fixtureRows.filter((row) => ["true", "1"].includes(col(row, "was_home").toLowerCase()));
    const awayRows = fixtureRows.filter((row) => !["true", "1"].includes(col(row, "was_home").toLowerCase()));
    if (!homeRows.length || !awayRows.length) return;
    const home = col(homeRows[0], "team", "team_name");
    const away = col(awayRows[0], "team", "team_name");
    if (!home || !away) return;
    output.push({
      gw: integer(col(fixtureRows[0], "GW", "round")),
      fixture,
      home,
      away,
      homeGoals: integer(col(fixtureRows[0], "team_h_score")),
      awayGoals: integer(col(fixtureRows[0], "team_a_score")),
      homeXg: homeRows.reduce((sum, row) => sum + num(col(row, "expected_goals")), 0),
      awayXg: awayRows.reduce((sum, row) => sum + num(col(row, "expected_goals")), 0),
    });
  });
  return output.filter((match) => match.gw > 0).sort((a, b) => a.gw - b.gw || a.fixture - b.fixture);
}

function oddsRows(rows: CsvRow[]): Odds[] {
  return rows
    .filter((row) => col(row, "season") === SEASON)
    .map((row) => ({
      home: col(row, "home_team"),
      away: col(row, "away_team"),
      homePrice: num(col(row, "market_avg_1x2_home_close", "market_avg_1x2_home", "bet365_1x2_home_close", "bet365_1x2_home", "pinnacle_1x2_home_close", "pinnacle_1x2_home")),
      drawPrice: num(col(row, "market_avg_1x2_draw_close", "market_avg_1x2_draw", "bet365_1x2_draw_close", "bet365_1x2_draw", "pinnacle_1x2_draw_close", "pinnacle_1x2_draw")),
      awayPrice: num(col(row, "market_avg_1x2_away_close", "market_avg_1x2_away", "bet365_1x2_away_close", "bet365_1x2_away", "pinnacle_1x2_away_close", "pinnacle_1x2_away")),
      over25: num(col(row, "market_avg_over25_close", "market_avg_over25", "bet365_over25_close", "bet365_over25", "pinnacle_over25_close", "pinnacle_over25")),
      under25: num(col(row, "market_avg_under25_close", "market_avg_under25", "bet365_under25_close", "bet365_under25", "pinnacle_under25_close", "pinnacle_under25")),
    }))
    .filter((row) => row.home && row.away && row.homePrice > 1 && row.drawPrice > 1 && row.awayPrice > 1 && row.over25 > 1 && row.under25 > 1);
}

function sportsbookExpectedGoals(odds: Odds) {
  const [homeWin, , awayWin] = removeVig([
    decimalOddsToProbability(odds.homePrice),
    decimalOddsToProbability(odds.drawPrice),
    decimalOddsToProbability(odds.awayPrice),
  ]);
  const [over] = removeVig([
    decimalOddsToProbability(odds.over25),
    decimalOddsToProbability(odds.under25),
  ]);
  if (!(homeWin > 0 && awayWin > 0 && over > 0)) return null;
  const total = impliedGoalMeanFromTotal(over, 2.5);
  return splitExpectedGoals(total, homeWin, awayWin);
}

function shrunkMean(values: number[], prior: number, pseudoMatches = 6) {
  return (values.reduce((sum, value) => sum + value, 0) + prior * pseudoMatches) / (values.length + pseudoMatches);
}

function baseExpectedGoals(target: Match, prior: Match[]) {
  const leagueHome = mean(prior.map((match) => match.homeXg)) || 1.55;
  const leagueAway = mean(prior.map((match) => match.awayXg)) || 1.25;
  const league = (leagueHome + leagueAway) / 2;
  const homeAttack = prior.filter((match) => alias(match.home) === alias(target.home)).map((match) => match.homeXg)
    .concat(prior.filter((match) => alias(match.away) === alias(target.home)).map((match) => match.awayXg));
  const homeConcede = prior.filter((match) => alias(match.home) === alias(target.home)).map((match) => match.awayXg)
    .concat(prior.filter((match) => alias(match.away) === alias(target.home)).map((match) => match.homeXg));
  const awayAttack = prior.filter((match) => alias(match.home) === alias(target.away)).map((match) => match.homeXg)
    .concat(prior.filter((match) => alias(match.away) === alias(target.away)).map((match) => match.awayXg));
  const awayConcede = prior.filter((match) => alias(match.home) === alias(target.away)).map((match) => match.awayXg)
    .concat(prior.filter((match) => alias(match.away) === alias(target.away)).map((match) => match.homeXg));
  const hAtt = shrunkMean(homeAttack, league);
  const hDef = shrunkMean(homeConcede, league);
  const aAtt = shrunkMean(awayAttack, league);
  const aDef = shrunkMean(awayConcede, league);
  return {
    home: clamp(leagueHome * Math.sqrt((hAtt / league) * (aDef / league)), 0.35, 3.6),
    away: clamp(leagueAway * Math.sqrt((aAtt / league) * (hDef / league)), 0.25, 3.2),
  };
}

function logFactorial(k: number) {
  let total = 0;
  for (let i = 2; i <= k; i += 1) total += Math.log(i);
  return total;
}

function poissonNll(lambda: number, observed: number) {
  const safe = Math.max(lambda, 0.05);
  return safe - observed * Math.log(safe) + logFactorial(observed);
}

function evaluate(records: Array<{ actualHome: number; actualAway: number; baseHome: number; baseAway: number; marketHome: number; marketAway: number }>, weight: number): Evaluation {
  const squaredErrors: number[] = [];
  const nll: number[] = [];
  const csBrier: number[] = [];
  records.forEach((record) => {
    const home = record.baseHome * (1 - weight) + record.marketHome * weight;
    const away = record.baseAway * (1 - weight) + record.marketAway * weight;
    squaredErrors.push((home - record.actualHome) ** 2, (away - record.actualAway) ** 2);
    nll.push(poissonNll(home, record.actualHome), poissonNll(away, record.actualAway));
    const homeCs = Math.exp(-away);
    const awayCs = Math.exp(-home);
    csBrier.push((homeCs - (record.actualAway === 0 ? 1 : 0)) ** 2, (awayCs - (record.actualHome === 0 ? 1 : 0)) ** 2);
  });
  return {
    weight,
    nMatches: records.length,
    goalRmse: Math.sqrt(mean(squaredErrors)),
    poissonNll: mean(nll),
    cleanSheetBrier: mean(csBrier),
  };
}

async function main() {
  const [fplRows, historicalOddsRows] = await Promise.all([
    fetchCsv(`${VAASTAV_BASE}/gws/merged_gw.csv`),
    fetchCsv(ODDS_MIRROR),
  ]);
  const matches = fplMatches(fplRows);
  const odds = oddsRows(historicalOddsRows);
  const oddsMap = new Map(odds.map((row) => [`${alias(row.home)}::${alias(row.away)}`, row]));
  const records: Array<{ actualHome: number; actualAway: number; baseHome: number; baseAway: number; marketHome: number; marketAway: number }> = [];

  matches.forEach((match) => {
    if (match.gw < 4) return;
    const price = oddsMap.get(`${alias(match.home)}::${alias(match.away)}`);
    if (!price) return;
    const market = sportsbookExpectedGoals(price);
    if (!market) return;
    const prior = matches.filter((candidate) => candidate.gw < match.gw);
    if (!prior.length) return;
    const base = baseExpectedGoals(match, prior);
    records.push({
      actualHome: match.homeGoals,
      actualAway: match.awayGoals,
      baseHome: base.home,
      baseAway: base.away,
      marketHome: market.home,
      marketAway: market.away,
    });
  });

  if (records.length < 100) throw new Error(`Only matched ${records.length} historical fixtures to sportsbook odds; calibration would be unreliable.`);
  const weights = Array.from({ length: 11 }, (_, index) => index * 0.025);
  const results = weights.map((weight) => evaluate(records, weight));
  const best = [...results].sort((a, b) => a.poissonNll - b.poissonNll || a.cleanSheetBrier - b.cleanSheetBrier)[0];
  const baseline = results[0];
  const nllImprovement = baseline.poissonNll > 0 ? (baseline.poissonNll - best.poissonNll) / baseline.poissonNll : 0;
  const recommendedWeight = nllImprovement >= 0.001 ? best.weight : 0;

  const report = {
    season: SEASON,
    generatedAt: new Date().toISOString(),
    matchedFixtures: records.length,
    sources: {
      fpl: "vaastav/Fantasy-Premier-League merged_gw.csv",
      sportsbook: "football-data.co.uk odds, accessed through AnishKhetani/premier-league-data processed GitHub mirror",
    },
    methodology: "Walk-forward team xG baseline; pre-match/closing 1X2 and O/U 2.5 odds are de-vigged, converted to market expected goals, then blended at candidate weights. Weight is selected by lowest Poisson NLL, with clean-sheet Brier as tie-breaker. No target-match result or target-match xG is used in the baseline forecast.",
    baseline: {
      ...baseline,
      goalRmse: Number(baseline.goalRmse.toFixed(6)),
      poissonNll: Number(baseline.poissonNll.toFixed(6)),
      cleanSheetBrier: Number(baseline.cleanSheetBrier.toFixed(6)),
    },
    results: results.map((result) => ({
      ...result,
      goalRmse: Number(result.goalRmse.toFixed(6)),
      poissonNll: Number(result.poissonNll.toFixed(6)),
      cleanSheetBrier: Number(result.cleanSheetBrier.toFixed(6)),
    })),
    bestMeasuredWeight: best.weight,
    recommendedWeight,
    relativePoissonNllImprovement: Number((nllImprovement * 100).toFixed(4)),
    note: recommendedWeight === 0
      ? "The historical sportsbook blend did not clear the minimum improvement threshold, so live market influence should remain disabled."
      : `Use ${recommendedWeight.toFixed(3)} as the evidence-based team-market prior weight before quality scaling; keep the production cap in place.`,
  };

  const path = resolve(`reports/sportsbook-calibration-${SEASON}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${path}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

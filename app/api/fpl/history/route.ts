import { NextResponse } from "next/server";
import type { HistoricalPayload, HistoricalSeasonSummary } from "@/lib/types";

export const runtime = "nodejs";

const SEASONS = ["2025-26", "2024-25", "2023-24"];
const BASE = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data";

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      fields.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  fields.push(value);
  return fields;
}

const numberValue = (value: string | undefined) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

async function seasonRows(season: string): Promise<Array<{ code: string; summary: HistoricalSeasonSummary }>> {
  const response = await fetch(`${BASE}/${season}/players_raw.csv`, {
    headers: { Accept: "text/csv", "User-Agent": "FPL-Prism/1.0 (independent public beta)" },
    next: { revalidate: 604800 },
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error(`Historical dataset returned ${response.status}`);
  const text = await response.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const index = new Map(headers.map((header, i) => [header, i]));
  const get = (row: string[], key: string) => row[index.get(key) ?? -1];

  return lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    const code = get(row, "code");
    const minutes = numberValue(get(row, "minutes"));
    const starts = numberValue(get(row, "starts"));
    const bonus = numberValue(get(row, "bonus"));
    const yellowCards = numberValue(get(row, "yellow_cards"));
    return {
      code,
      summary: {
        season,
        minutes,
        starts,
        totalPoints: numberValue(get(row, "total_points")),
        pointsPerGame: numberValue(get(row, "points_per_game")),
        xgi90: numberValue(get(row, "expected_goal_involvements_per_90")),
        expectedGoalsPer90: numberValue(get(row, "expected_goals_per_90")),
        expectedAssistsPer90: numberValue(get(row, "expected_assists_per_90")),
        expectedGoalsConcededPer90: numberValue(get(row, "expected_goals_conceded_per_90")),
        defensiveContributionPer90: numberValue(get(row, "defensive_contribution_per_90")),
        savesPer90: numberValue(get(row, "saves_per_90")),
        cleanSheetsPer90: numberValue(get(row, "clean_sheets_per_90")),
        bonusPer90: minutes > 0 ? bonus * 90 / minutes : 0,
        yellowCardsPer90: minutes > 0 ? yellowCards * 90 / minutes : 0,
        startsPerMatch: Math.min(starts / 38, 1),
        minutesPerStart: starts > 0 ? Math.min(minutes / starts, 92) : 0,
      },
    };
  }).filter((item) => item.code && item.summary.minutes > 0);
}

export async function GET() {
  const results = await Promise.allSettled(SEASONS.map(async (season) => ({ season, rows: await seasonRows(season) })));
  const successful = results
    .filter((result): result is PromiseFulfilledResult<{ season: string; rows: Awaited<ReturnType<typeof seasonRows>> }> => result.status === "fulfilled")
    .map((result) => result.value);

  if (!successful.length) {
    return NextResponse.json({ error: "Historical FPL data is temporarily unavailable." }, { status: 502 });
  }

  const loadedSeasons = successful.map((result) => result.season);
  const players: HistoricalPayload["players"] = {};
  successful.flatMap((result) => result.rows).forEach(({ code, summary }) => {
    (players[code] ??= []).push(summary);
  });
  Object.values(players).forEach((rows) => rows.sort((a, b) => SEASONS.indexOf(a.season) - SEASONS.indexOf(b.season)));

  const payload: HistoricalPayload = {
    players,
    seasons: loadedSeasons,
    fetchedAt: new Date().toISOString(),
    source: "Vaastav/Fantasy-Premier-League",
    partial: loadedSeasons.length !== SEASONS.length,
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}

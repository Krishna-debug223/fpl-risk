import { NextResponse } from "next/server";
import { fplFetch } from "@/lib/server-fpl";
import type { BootstrapPayload, FplEvent, FplFixture, FplPlayer, FplTeam } from "@/lib/types";

export const runtime = "nodejs";

const n = (value: string | number | null | undefined, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

function enrichUnderlyingTeamData(players: FplPlayer[], teams: FplTeam[], fixtures: FplFixture[]) {
  return teams.map((team) => {
    const teamPlayers = players.filter((player) => player.team === team.id);
    const completedMatches = fixtures.filter((fixture) => fixture.finished && (fixture.team_h === team.id || fixture.team_a === team.id)).length;
    if (!completedMatches) return { ...team, underlying_matches: 0 };

    // Player xG sums to a useful approximation of team chance quality. xA is kept separately
    // as a secondary creation signal rather than added to xG (which would double count attacks).
    const xg = teamPlayers.reduce((total, player) => total + n(player.expected_goals), 0);
    const xa = teamPlayers.reduce((total, player) => total + n(player.expected_assists), 0);

    // FPL exposes xGC at player level. Goalkeepers are the cleanest team-level proxy because
    // unlike defenders we do not duplicate the same team xGC across four or five players.
    const keepers = teamPlayers.filter((player) => player.element_type === 1 && player.minutes > 0);
    const defensivePool = keepers.length
      ? keepers
      : teamPlayers.filter((player) => player.element_type === 2 && player.minutes > 0);
    const xgcMinutes = defensivePool.reduce((total, player) => total + player.minutes, 0);
    const xgaPer90 = xgcMinutes > 0
      ? defensivePool.reduce((total, player) => total + n(player.expected_goals_conceded_per_90) * player.minutes, 0) / xgcMinutes
      : 0;

    return {
      ...team,
      underlying_matches: completedMatches,
      underlying_attack_xg_per_match: xg / completedMatches,
      underlying_attack_xa_per_match: xa / completedMatches,
      underlying_defence_xga_per_match: xgaPer90,
    };
  });
}

export async function GET() {
  try {
    const [data, fixtures] = await Promise.all([
      fplFetch<{ elements: FplPlayer[]; teams: FplTeam[]; events: FplEvent[] }>("/bootstrap-static/", 300),
      fplFetch<FplFixture[]>("/fixtures/", 120),
    ]);
    const payload: BootstrapPayload = {
      elements: data.elements,
      teams: enrichUnderlyingTeamData(data.elements, data.teams, fixtures),
      events: data.events,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Live FPL data is temporarily unavailable." }, { status: 502 });
  }
}

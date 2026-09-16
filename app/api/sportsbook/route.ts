import { NextResponse } from "next/server";

import { fplFetch } from "@/lib/server-fpl";
import { loadSportsbookSignals } from "@/lib/sportsbook-server";
import type { FplFixture, FplTeam } from "@/lib/types";

export const revalidate = 300;

export async function GET() {
  try {
    const [bootstrap, fixtures] = await Promise.all([
      fplFetch<{ teams: FplTeam[] }>("/bootstrap-static/", 300),
      fplFetch<FplFixture[]>("/fixtures/", 300),
    ]);
    const payload = await loadSportsbookSignals(bootstrap.teams, fixtures);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({
      available: false,
      provider: "none",
      sourceLabel: "Sportsbook market prior",
      fetchedAt: new Date().toISOString(),
      configuredWeight: 0,
      calibrationStatus: "disabled-until-calibrated",
      fixtures: [],
      note: "Sportsbook feed unavailable; the base model remains active.",
    });
  }
}

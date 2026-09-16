import { NextRequest, NextResponse } from "next/server";

import { MODEL_VERSION, positionName, projectPlayer } from "@/lib/risk-v12";
import type { SportsbookPayload } from "@/lib/sportsbook";
import type {
  BootstrapPayload,
  FplFixture,
  HistoricalPayload,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store, max-age=0",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: jsonHeaders });
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const requestedEvent = Number(request.nextUrl.searchParams.get("event") ?? "");

  try {
    const [bootstrapResponse, fixturesResponse, historyResponse, sportsbookResponse] =
      await Promise.all([
        fetch(`${origin}/api/fpl/bootstrap`, { cache: "no-store" }),
        fetch(`${origin}/api/fpl/fixtures`, { cache: "no-store" }),
        fetch(`${origin}/api/fpl/history`, { cache: "no-store" }),
        fetch(`${origin}/api/sportsbook`, { cache: "no-store" }),
      ]);

    if (!bootstrapResponse.ok || !fixturesResponse.ok) {
      return NextResponse.json(
        { error: "Live FPL source data is unavailable." },
        { status: 503, headers: jsonHeaders },
      );
    }

    const bootstrap = (await bootstrapResponse.json()) as BootstrapPayload;
    const fixturePayload = (await fixturesResponse.json()) as { fixtures: FplFixture[] };
    const history = historyResponse.ok
      ? ((await historyResponse.json()) as HistoricalPayload)
      : null;
    const sportsbook = sportsbookResponse.ok
      ? ((await sportsbookResponse.json()) as SportsbookPayload)
      : null;

    const event = Number.isInteger(requestedEvent) && requestedEvent > 0
      ? bootstrap.events.find((item) => item.id === requestedEvent)
      : bootstrap.events.find((item) => item.is_next) ??
        bootstrap.events.find((item) => item.is_current);

    if (!event) {
      return NextResponse.json(
        { error: "No matching FPL event was found." },
        { status: 404, headers: jsonHeaders },
      );
    }

    const fixtures = fixturePayload.fixtures ?? [];
    const teamMap = new Map(bootstrap.teams.map((team) => [team.id, team]));
    const eventFixtures = fixtures.filter((fixture) => fixture.event === event.id);
    const kickoffByTeam = new Map<number, string | null>();

    eventFixtures.forEach((fixture) => {
      kickoffByTeam.set(fixture.team_h, fixture.kickoff_time);
      kickoffByTeam.set(fixture.team_a, fixture.kickoff_time);
    });

    const rows = bootstrap.elements.map((player) => {
      const projection = projectPlayer(
        player,
        fixtures,
        bootstrap.teams,
        1,
        history?.players,
        sportsbook,
        [event.id],
      );
      const team = teamMap.get(player.team);

      return {
        id: player.id,
        code: player.code,
        name: player.web_name,
        firstName: player.first_name,
        secondName: player.second_name,
        teamId: player.team,
        team: team?.short_name ?? "—",
        position: positionName(player.element_type),
        price: player.now_cost,
        ownership: Number.parseFloat(player.selected_by_percent || "0"),
        status: player.status,
        fixture: projection.fixtureLabels[0] ?? "BLANK",
        kickoffTime: kickoffByTeam.get(player.team) ?? null,
        projected: projection.expected,
        volatility: projection.volatility,
        risk: projection.risk,
        confidence: projection.confidence,
        dataQuality: projection.dataQuality,
        components: projection.components,
      };
    });

    return NextResponse.json(
      {
        schemaVersion: 1,
        gameweek: event.id,
        eventName: event.name,
        deadlineTime: event.deadline_time,
        generatedAt: new Date().toISOString(),
        modelVersion: MODEL_VERSION,
        source: "FPL Risk production projection engine",
        sportsbook: {
          available: sportsbook?.available ?? false,
          configuredWeight: sportsbook?.configuredWeight ?? 0,
          calibrationStatus: sportsbook?.calibrationStatus ?? "disabled-until-calibrated",
        },
        playerCount: rows.length,
        fixtures: eventFixtures,
        rows,
      },
      { headers: jsonHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not build the Ledger projection export.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: jsonHeaders },
    );
  }
}

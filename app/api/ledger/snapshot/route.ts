import { NextRequest, NextResponse } from "next/server";

import { MODEL_VERSION, positionName, projectPlayer } from "@/lib/risk-v12";
import { buildNewsScan } from "@/lib/news-scan";
import type { SportsbookPayload } from "@/lib/sportsbook";
import type {
  BootstrapPayload,
  FplFixture,
  HistoricalPayload,
  NewsScanPayload,
} from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedOrigins = new Set([
  "https://fpl-ledger-azure.vercel.app",
  "https://fpl-risk-ui-refresh.vercel.app",
]);

function jsonHeaders(request: NextRequest) {
  const headers = new Headers({
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  });
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

type SnapshotPayload = {
  schemaVersion: number;
  gameweek: number;
  eventName: string;
  deadlineTime: string;
  generatedAt: string;
  modelVersion: string;
  source: string;
  sportsbook: {
    available: boolean;
    configuredWeight: number;
    calibrationStatus: string;
  };
  playerCount: number;
  fixtures: FplFixture[];
  newsScan?: NewsScanPayload;
  rows: Array<Record<string, unknown>>;
};

const SNAPSHOT_TTL_MS = 30_000;
const snapshotCache = new Map<string, { expiresAt: number; promise: Promise<SnapshotPayload> }>();

function cachedSnapshot(key: string, build: () => Promise<SnapshotPayload>) {
  const now = Date.now();
  const current = snapshotCache.get(key);
  if (current && current.expiresAt > now) return current.promise;

  const promise = build();
  snapshotCache.set(key, { expiresAt: now + SNAPSHOT_TTL_MS, promise });
  promise.catch(() => {
    if (snapshotCache.get(key)?.promise === promise) snapshotCache.delete(key);
  });
  return promise;
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: jsonHeaders(request) });
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "ledger-snapshot", 30);
  if (!limit.allowed) {
    const headers = jsonHeaders(request);
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("Retry-After", String(limit.retryAfter));
    return NextResponse.json({ error: "Too many projection requests. Try again shortly." }, { status: 429, headers });
  }

  const origin = request.nextUrl.origin;
  const requestedEvent = Number(request.nextUrl.searchParams.get("event") ?? "");
  const cacheKey = Number.isInteger(requestedEvent) && requestedEvent > 0 ? `event:${requestedEvent}` : "next";

  try {
    const payload = await cachedSnapshot(cacheKey, async () => {
      const [bootstrapResponse, fixturesResponse, historyResponse, sportsbookResponse] =
        await Promise.all([
          // Bootstrap is over 2 MB and exceeds Next's data-cache entry limit.
          // The route-level snapshot cache and public CDN cache provide the
          // bounded reuse instead of repeatedly attempting to cache this body.
          fetch(`${origin}/api/fpl/bootstrap`, { cache: "no-store" }),
          fetch(`${origin}/api/fpl/fixtures`, { next: { revalidate: 120 } }),
          fetch(`${origin}/api/fpl/history`, { next: { revalidate: 86400 } }),
          fetch(`${origin}/api/sportsbook`, { next: { revalidate: 300 } }),
        ]);

      if (!bootstrapResponse.ok || !fixturesResponse.ok) {
        throw new Error("Live FPL source data is unavailable");
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

      if (!event) throw new Error("NO_MATCHING_EVENT");

      const fixtures = fixturePayload.fixtures ?? [];
      const teamMap = new Map(bootstrap.teams.map((team) => [team.id, team]));
      const eventFixtures = fixtures.filter((fixture) => fixture.event === event.id);
      const newsScan = buildNewsScan(bootstrap, fixtures, event.id);
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
          true,
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
          floor: projection.distribution?.p10 ?? Math.max(0, projection.expected - projection.volatility * 1.28),
          median: projection.distribution?.median ?? projection.expected,
          ceiling: projection.distribution?.p90 ?? projection.expected + projection.volatility * 1.28,
          sharpe: projection.distribution?.sharpe ?? projection.expected / Math.max(projection.volatility, 0.35),
          probabilities: projection.distribution?.bands ?? null,
          simulations: projection.distribution?.simulations ?? null,
          components: projection.components,
          news: player.news ?? null,
          newsAdded: player.news_added ?? null,
          chanceOfPlayingThisRound: player.chance_of_playing_this_round ?? null,
        };
      });

      return {
        schemaVersion: 2,
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
        newsScan,
        rows,
      };
    });

    return NextResponse.json(payload, { headers: jsonHeaders(request) });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/ledger/snapshot",
      requestId: request.headers.get("x-vercel-id"),
      error: error instanceof Error ? error.message : "Unknown error",
    }));
    const status = error instanceof Error && error.message === "NO_MATCHING_EVENT" ? 404 : 503;
    const headers = jsonHeaders(request);
    headers.set("Cache-Control", "no-store, max-age=0");
    return NextResponse.json(
      { error: status === 404 ? "No matching FPL event was found." : "Live projection data is temporarily unavailable." },
      { status, headers },
    );
  }
}

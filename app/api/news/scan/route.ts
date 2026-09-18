import { NextRequest, NextResponse } from "next/server";

import { buildNewsScan } from "@/lib/news-scan";
import type { BootstrapPayload, FplFixture } from "@/lib/types";
import { fplFetch } from "@/lib/server-fpl";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "news-scan", 12);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "News scan is refreshing. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } },
    );
  }

  const requestedEvent = Number(request.nextUrl.searchParams.get("event") ?? "");

  try {
    const [bootstrap, fixtures] = await Promise.all([
      fplFetch<BootstrapPayload>("/bootstrap-static/", 0),
      fplFetch<FplFixture[]>("/fixtures/", 0),
    ]);
    const event = Number.isInteger(requestedEvent) && requestedEvent > 0
      ? bootstrap.events.find((item) => item.id === requestedEvent)
      : bootstrap.events.find((item) => item.is_next) ?? bootstrap.events.find((item) => item.is_current);
    if (!event) return NextResponse.json({ error: "No matching FPL event was found." }, { status: 404 });

    const scan = buildNewsScan(bootstrap, fixtures, event.id);
    return NextResponse.json(scan, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/news/scan",
      requestId: request.headers.get("x-vercel-id"),
      error: error instanceof Error ? error.message : "Unknown error",
    }));
    return NextResponse.json({ error: "Official FPL news is temporarily unavailable." }, { status: 503 });
  }
}

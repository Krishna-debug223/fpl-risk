import { NextResponse } from "next/server";
import { fplFetch } from "@/lib/server-fpl";
import { rateLimit } from "@/lib/rate-limit";
import type { LivePointsPayload } from "@/lib/types";

export const runtime = "nodejs";

type FplLiveResponse = {
  elements: Array<{ id: number; stats?: { total_points?: number; minutes?: number } }>;
};

export async function GET(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const limit = rateLimit(request, "fpl-live-points", 30);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Live points are being refreshed too often. Try again shortly." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { event } = await params;
  if (!/^\d{1,3}$/.test(event) || Number(event) < 1 || Number(event) > 100) {
    return NextResponse.json({ error: "Invalid Gameweek." }, { status: 400 });
  }

  try {
    const live = await fplFetch<FplLiveResponse>(`/event/${event}/live/`, 0);
    const payload: LivePointsPayload = {
      eventId: Number(event),
      fetchedAt: new Date().toISOString(),
      elements: live.elements.map((player) => {
        const minutes = player.stats?.minutes ?? 0;
        return {
          id: player.id,
          points: player.stats?.total_points ?? 0,
          minutes,
          played: minutes > 0,
        };
      }),
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "Live FPL points are temporarily unavailable." }, { status: 502 });
  }
}

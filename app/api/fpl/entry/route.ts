import { NextResponse } from "next/server";
import { loadPublicManager } from "@/lib/manager-server";
import { rateLimit } from "@/lib/rate-limit";
import type { ManagerPayload } from "@/lib/types";

export const runtime = "nodejs";

const MANAGER_CACHE_TTL_MS = 30_000;
const managerCache = new Map<string, { expiresAt: number; promise: Promise<ManagerPayload> }>();

function cachedManager(teamId: string) {
  const now = Date.now();
  const current = managerCache.get(teamId);
  if (current && current.expiresAt > now) return current.promise;

  const promise = loadPublicManager(teamId);
  managerCache.set(teamId, { expiresAt: now + MANAGER_CACHE_TTL_MS, promise });
  promise.catch(() => {
    if (managerCache.get(teamId)?.promise === promise) managerCache.delete(teamId);
  });
  return promise;
}

export async function POST(request: Request) {
  const limit = rateLimit(request, "fpl-entry", 20);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many team imports. Try again shortly." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfter) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 2_048) {
    return NextResponse.json({ error: "Enter a valid numeric FPL Team ID." }, { status: 413 });
  }

  let teamId = "";
  try {
    const body = await request.json() as { teamId?: unknown };
    teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Enter a valid numeric FPL Team ID." }, { status: 400 });
  }

  if (!/^\d{1,12}$/.test(teamId)) {
    return NextResponse.json({ error: "Enter a valid numeric FPL Team ID." }, { status: 400 });
  }

  try {
    const payload = await cachedManager(teamId);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error && (error.message.includes("404") || error.message === "INVALID_TEAM_ID")
      ? "That FPL Team ID could not be found."
      : "We could not import that FPL team right now.";
    return NextResponse.json({ error: message }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}

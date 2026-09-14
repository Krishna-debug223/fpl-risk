import { NextResponse } from "next/server";
import { loadPublicManager } from "@/lib/manager-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    const payload = await loadPublicManager(teamId);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error && (error.message.includes("404") || error.message === "INVALID_TEAM_ID")
      ? "That FPL Team ID could not be found."
      : "We could not import that FPL team right now.";
    return NextResponse.json({ error: message }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}

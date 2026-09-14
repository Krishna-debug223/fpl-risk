import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, app: "fpl-risk", version: "1.1.0", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

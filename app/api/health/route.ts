import { NextResponse } from "next/server";

import { MODEL_VERSION } from "@/lib/risk-v12";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, app: "fpl-prism", version: MODEL_VERSION, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

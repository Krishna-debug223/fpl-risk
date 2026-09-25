import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const MODELBOOK_ROOT = path.join(process.cwd(), "public", "modelbook");

function rewriteMarkup(html: string) {
  return html
    .replaceAll("FPL Risk", "FPL Prism")
    .replaceAll("FPL RISK", "FPL PRISM")
    .replaceAll("fpl-risk-ui-refresh.vercel.app", "fplprism.com");
}

export async function GET() {
  try {
    const html = rewriteMarkup(await readFile(path.join(MODELBOOK_ROOT, "modelbook.html"), "utf8"));
    return new NextResponse(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store, max-age=0" },
    });
  } catch {
    return new NextResponse(
      "<!doctype html><title>FPL Prism Modelbook</title><h1>Modelbook temporarily unavailable</h1><p>Try again shortly.</p>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }
}

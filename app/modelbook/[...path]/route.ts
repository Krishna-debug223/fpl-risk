import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const MODELBOOK_ROOT = path.join(process.cwd(), "public", "modelbook");

function contentType(filePath: string) {
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function rewriteText(body: string) {
  return body
    .replaceAll("FPL Risk", "FPL Prism")
    .replaceAll("FPL RISK", "FPL PRISM")
    .replaceAll("fpl-risk-ui-refresh.vercel.app", "fplprism.com");
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await params;
    const safeSegments = segments.filter((segment) => segment !== "" && segment !== "." && segment !== "..");
    let relativePath = safeSegments.join("/");
    if (relativePath === "reports/gw5") relativePath = "reports/gw5.html";
    if (relativePath === "reports/gw4") relativePath = "reports/gw4.html";
    if (relativePath === "reports/gw3") relativePath = "reports/gw3.html";
    const filePath = path.join(MODELBOOK_ROOT, relativePath);
    if (!filePath.startsWith(`${MODELBOOK_ROOT}${path.sep}`)) return new NextResponse("Not found", { status: 404 });
    const type = contentType(filePath);
    const body = type.startsWith("text/") || type.startsWith("application/json")
      ? rewriteText(await readFile(filePath, "utf8"))
      : await readFile(filePath);
    return new NextResponse(body, { headers: { "content-type": type, "cache-control": "no-store, max-age=0" } });
  } catch {
    return new NextResponse("Modelbook asset unavailable", { status: 404 });
  }
}

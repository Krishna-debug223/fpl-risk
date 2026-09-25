import { NextResponse } from "next/server";
import type { TeamIntelligencePayload } from "@/lib/types";

export const runtime = "nodejs";

const SOURCES = [
  { url: "https://raw.githubusercontent.com/olbauday/FPL-Core-Insights/main/data/2026-2027/teams.csv", label: "2026-2027" },
  { url: "https://raw.githubusercontent.com/olbauday/FPL-Core-Insights/main/data/2025-2026/teams.csv", label: "2025-2026 fallback" },
];

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      fields.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  fields.push(value);
  return fields;
}

export async function GET() {
  try {
    for (const source of SOURCES) {
      const response = await fetch(source.url, {
        headers: { Accept: "text/csv", "User-Agent": "FPL-Prism/1.0 (independent public beta)" },
        next: { revalidate: 21600 },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) continue;

      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) continue;

      const headers = parseCsvLine(lines[0]);
      const index = new Map(headers.map((header, i) => [header, i]));
      const get = (row: string[], key: string) => row[index.get(key) ?? -1];
      const teams = lines.slice(1).map((line) => {
        const row = parseCsvLine(line);
        return {
          id: Number.parseInt(get(row, "id") ?? "", 10),
          shortName: get(row, "short_name") ?? "",
          elo: Number.parseFloat(get(row, "elo") ?? ""),
        };
      }).filter((team) => Number.isFinite(team.id) && Number.isFinite(team.elo) && team.elo > 1200);

      if (teams.length >= 18) {
        const payload: TeamIntelligencePayload = {
          teams,
          fetchedAt: new Date().toISOString(),
          source: `FPL-Core-Insights / ClubElo (${source.label})`,
        };
        return NextResponse.json(payload, {
          headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
        });
      }
    }

    throw new Error("Team intelligence coverage is incomplete");
  } catch {
    return NextResponse.json({ error: "Optional club Elo data is temporarily unavailable." }, { status: 502 });
  }
}

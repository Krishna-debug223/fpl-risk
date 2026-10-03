import type { FplPlayer } from "@/lib/types";
import type { ChipAdvice } from "@/lib/risk-v12";

/** FPL prices and bank values are integer tenths of a million: 75 → £7.5m. */
export const money = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "—" : `£${(value / 10).toFixed(1)}m`;

export const pts = (value: number | null | undefined, digits = 1) =>
  value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

export const signed = (value: number | null | undefined, digits = 1) => {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return (0).toFixed(digits);
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
};

export const pct = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "—" : `${Math.round(value)}%`;

export const range = (low?: number, high?: number) =>
  low == null || high == null ? "—" : `${low.toFixed(1)}–${high.toFixed(1)}`;

export const compact = (value: number) =>
  new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const ordinal = (value: number | null | undefined) =>
  value == null ? "—" : new Intl.NumberFormat("en-GB").format(value);

/** Deadline in the visitor's own time zone, with the zone named. */
export function formatDeadline(value: string | null | undefined) {
  if (!value) return "Deadline not published";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Deadline not published";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatClock(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("en-GB", sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function timeUntil(value: string | null | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 48) return `in ${Math.floor(hours / 24)} days`;
  if (hours >= 1) return `in ${hours} h`;
  return `in ${Math.max(1, Math.floor(ms / 60_000))} min`;
}

// The FPL feed uses short names for several clubs. Searches and labels use
// names supporters recognise; internal IDs are unchanged.
const fullTeamNames: Record<string, string> = {
  ARS: "Arsenal", AVL: "Aston Villa", BOU: "Bournemouth", BRE: "Brentford",
  BHA: "Brighton & Hove Albion", CHE: "Chelsea", COV: "Coventry City",
  CRY: "Crystal Palace", EVE: "Everton", FUL: "Fulham", HUL: "Hull City",
  IPS: "Ipswich Town", LEE: "Leeds United", LIV: "Liverpool",
  MCI: "Manchester City", MUN: "Manchester United", NEW: "Newcastle United",
  NFO: "Nottingham Forest", TOT: "Tottenham Hotspur", SUN: "Sunderland",
};

export function teamDisplayName(team?: { name: string; short_name: string }) {
  if (!team) return "";
  return fullTeamNames[team.short_name] ?? team.name;
}

export const positionLong = (type: number) =>
  ["", "Goalkeeper", "Defender", "Midfielder", "Forward"][type] ?? "—";

export const positionShort = (type: number) =>
  ["", "GKP", "DEF", "MID", "FWD"][type] ?? "—";

/** Official FPL availability, as published. Never a model estimate. */
export function officialAvailability(player: FplPlayer): { label: string; short: string; tone: "good" | "warn" | "bad" | "neutral"; flagged: boolean } {
  const chance = player.chance_of_playing_next_round;
  const odds = chance == null ? "" : ` · ${chance}% chance of playing`;
  if (player.status === "u") return { label: "Unavailable (left club or on loan)", short: "Unavailable", tone: "bad", flagged: true };
  if (player.status === "n") return { label: "Not available", short: "Unavailable", tone: "bad", flagged: true };
  if (player.status === "s") return { label: "Suspended", short: "Suspended", tone: "bad", flagged: true };
  if (player.status === "i") return { label: `Injured${odds}`, short: chance == null ? "Injured" : `Injured · ${chance}%`, tone: "bad", flagged: true };
  if (player.status === "d") return { label: `Doubtful${odds}`, short: chance == null ? "Doubtful" : `Doubtful · ${chance}%`, tone: "warn", flagged: true };
  if (chance != null && chance < 100) return { label: `${chance}% chance of playing`, short: `${chance}% to play`, tone: "warn", flagged: true };
  return { label: "No flag", short: "Available", tone: "good", flagged: false };
}

export const toneBadge = (tone: "good" | "warn" | "bad" | "neutral" | "info") =>
  tone === "neutral" ? "badge" : `badge badge-${tone}`;

export const riskBadge = (risk: "Low" | "Medium" | "High") =>
  risk === "Low" ? "badge badge-good" : risk === "Medium" ? "badge badge-warn" : "badge badge-bad";

export const chipStatus: Record<ChipAdvice["status"], { label: string; tone: "good" | "warn" | "bad" | "neutral" | "info" }> = {
  PLAY: { label: "Model favours this window", tone: "good" },
  CONSIDER: { label: "Possible window", tone: "info" },
  HOLD: { label: "Hold for now", tone: "neutral" },
  USED: { label: "Already used", tone: "neutral" },
  UNAVAILABLE: { label: "Not available", tone: "neutral" },
};

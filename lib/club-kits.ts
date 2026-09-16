export type ClubKitPalette = {
  body: string;
  sleeve: string;
  trim: string;
  text: string;
};

const DEFAULT_KIT: ClubKitPalette = {
  body: "linear-gradient(135deg, #37003c 0 58%, #00ff87 58% 100%)",
  sleeve: "#37003c",
  trim: "#00ff87",
  text: "#ffffff",
};

// 2026/27 Premier League home-club identities. These are intentionally team-level
// visuals rather than player portraits, so a transfer automatically updates to the
// player's current FPL club and never leaves a stale headshot behind.
const CLUB_KITS: Record<string, ClubKitPalette> = {
  ARS: {
    body: "#d71920",
    sleeve: "#ffffff",
    trim: "#ffffff",
    text: "#ffffff",
  },
  AVL: {
    body: "#6a1638",
    sleeve: "#95c6e9",
    trim: "#95c6e9",
    text: "#ffffff",
  },
  BOU: {
    body: "repeating-linear-gradient(90deg, #d71920 0 12px, #111111 12px 24px)",
    sleeve: "#111111",
    trim: "#d71920",
    text: "#ffffff",
  },
  BRE: {
    body: "repeating-linear-gradient(90deg, #ffffff 0 11px, #e30613 11px 22px)",
    sleeve: "#e30613",
    trim: "#111111",
    text: "#111111",
  },
  BHA: {
    body: "repeating-linear-gradient(90deg, #ffffff 0 11px, #0057b8 11px 22px)",
    sleeve: "#0057b8",
    trim: "#ffffff",
    text: "#0b2b53",
  },
  CHE: {
    body: "#034694",
    sleeve: "#034694",
    trim: "#ffffff",
    text: "#ffffff",
  },
  COV: {
    body: "#6cc4ea",
    sleeve: "#6cc4ea",
    trim: "#17365d",
    text: "#17365d",
  },
  CRY: {
    body: "repeating-linear-gradient(90deg, #e31b23 0 11px, #1b458f 11px 22px)",
    sleeve: "#1b458f",
    trim: "#f4d03f",
    text: "#ffffff",
  },
  EVE: {
    body: "#003399",
    sleeve: "#003399",
    trim: "#ffffff",
    text: "#ffffff",
  },
  FUL: {
    body: "#ffffff",
    sleeve: "#ffffff",
    trim: "#111111",
    text: "#111111",
  },
  HUL: {
    body: "#f5a623",
    sleeve: "#111111",
    trim: "#111111",
    text: "#111111",
  },
  IPS: {
    body: "#0044a7",
    sleeve: "#0044a7",
    trim: "#ffffff",
    text: "#ffffff",
  },
  LEE: {
    body: "#ffffff",
    sleeve: "#ffffff",
    trim: "#1d428a",
    text: "#1d428a",
  },
  LIV: {
    body: "#c8102e",
    sleeve: "#c8102e",
    trim: "#ffffff",
    text: "#ffffff",
  },
  MCI: {
    body: "#6cabdd",
    sleeve: "#6cabdd",
    trim: "#ffffff",
    text: "#183153",
  },
  MUN: {
    body: "#da291c",
    sleeve: "#da291c",
    trim: "#ffffff",
    text: "#ffffff",
  },
  NEW: {
    body: "repeating-linear-gradient(90deg, #ffffff 0 11px, #111111 11px 22px)",
    sleeve: "#111111",
    trim: "#ffffff",
    text: "#111111",
  },
  NFO: {
    body: "#e53233",
    sleeve: "#e53233",
    trim: "#ffffff",
    text: "#ffffff",
  },
  SUN: {
    body: "repeating-linear-gradient(90deg, #ffffff 0 11px, #eb172b 11px 22px)",
    sleeve: "#eb172b",
    trim: "#111111",
    text: "#111111",
  },
  TOT: {
    body: "#ffffff",
    sleeve: "#ffffff",
    trim: "#132257",
    text: "#132257",
  },
};

export function getClubKit(shortName?: string | null): ClubKitPalette {
  if (!shortName) return DEFAULT_KIT;
  return CLUB_KITS[shortName.trim().toUpperCase()] ?? DEFAULT_KIT;
}

export function getClubKitVars(shortName?: string | null) {
  const kit = getClubKit(shortName);
  return {
    "--kit-body": kit.body,
    "--kit-sleeve": kit.sleeve,
    "--kit-trim": kit.trim,
    "--kit-text": kit.text,
  } as const;
}

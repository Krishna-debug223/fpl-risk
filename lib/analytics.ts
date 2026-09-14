"use client";

import { track } from "@vercel/analytics";

type AnalyticsValue = string | number | boolean;
type AnalyticsProperties = Record<string, AnalyticsValue>;

const DISABLE_KEY = "fpl-risk-analytics-disabled";

const ALLOWED_EVENTS = new Set([
  "overview_viewed",
  "transfer_lab_viewed",
  "player_market_viewed",
  "model_viewed",
  "free_transfers_set",
  "team_import_started",
  "team_import_success",
  "team_import_failed",
  "transfer_lab_opened",
  "model_opened",
  "ai_recommendation_selected",
  "transfer_simulation_run",
]);

const ALLOWED_PROPERTY_KEYS = new Set([
  "count",
  "gameweek",
  "source",
  "rank",
  "horizon",
  "confidence",
  "risk",
  "freeTransfers",
  "hitApplied",
  "verdict",
  "successBand",
]);

function sanitizeProperties(properties?: AnalyticsProperties) {
  if (!properties) return undefined;
  const safe: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 40);
    else if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "boolean") safe[key] = value;
  }
  return Object.keys(safe).length ? safe : undefined;
}

/**
 * Privacy-conscious product analytics.
 *
 * Product events are sent through Vercel Web Analytics so launch metrics can be
 * inspected in one place alongside page views and unique visitors. Event names
 * and properties are allow-listed here as a second guard against accidentally
 * sending identifiers.
 *
 * Never add Team IDs, manager/team names, player names, emails, IP addresses or
 * free-form user text to this helper.
 */
export function trackProductEvent(name: string, properties?: AnalyticsProperties) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(DISABLE_KEY) === "1") return;
  if (!ALLOWED_EVENTS.has(name)) return;

  try {
    track(name, sanitizeProperties(properties));
  } catch {
    // Analytics must never block or break the FPL experience.
  }
}

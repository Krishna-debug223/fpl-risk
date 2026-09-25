// Advance this only when the previous Gameweek is archived. The live Modelbook
// intentionally follows the next scheduled event until its deadline snapshot
// is frozen and published as a report.
export const CURRENT_GAMEWEEK = 6;
export const SNAPSHOT_URL = `/api/ledger/snapshot?event=${CURRENT_GAMEWEEK}`;
export const LOCKED_URL = `/modelbook/data/gw${CURRENT_GAMEWEEK}-locked.json`;
export const LIVE_POINTS_URL = `/api/fpl/live/${CURRENT_GAMEWEEK}`;
export const LIVE_REFRESH_MS = 15000;

export async function loadJson(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", ...options });
  if (!response.ok) throw new Error(`Unable to load ${path} (${response.status})`);
  return response.json();
}

export const n = (x) => Number(x).toFixed(3);
export const one = (x) => Number(x).toFixed(1);
export const pct = (x) => `${Number(x).toFixed(1)}%`;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Keep the headline and position breakdown on the same evaluation cohort.
 * Reports are immutable JSON, so fail closed if a future archive is generated
 * with a different denominator in one of these sections.
 */
export function validateActiveCohortReport(data) {
  const activeCount = Number(data?.activeCohort?.count);
  const positions = Object.values(data?.byPosition ?? {});
  const positionCount = positions.reduce((sum, values) => sum + Number(values?.count ?? 0), 0);
  if (!Number.isFinite(activeCount) || positionCount !== activeCount) {
    throw new Error(`Active cohort mismatch: headline=${activeCount}, positions=${positionCount}`);
  }

  const headlineWithin2 = Number(data?.activeCohort?.within2);
  const weightedWithin2 = positionCount > 0
    ? positions.reduce((sum, values) => sum + Number(values?.count ?? 0) * Number(values?.within2 ?? 0), 0) / positionCount
    : 0;
  // Position percentages are stored to one decimal place, so allow rounding noise.
  if (!Number.isFinite(headlineWithin2) || Math.abs(weightedWithin2 - headlineWithin2) > 0.2) {
    throw new Error(`Within ±2 mismatch: headline=${headlineWithin2}, weighted positions=${weightedWithin2.toFixed(1)}`);
  }
  return data;
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatShortTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function timeUntil(value, now = Date.now()) {
  const target = Date.parse(value);
  if (!Number.isFinite(target)) return "Deadline unavailable";
  const delta = target - now;
  if (delta <= 0) return "Deadline reached";
  const totalMinutes = Math.max(0, Math.floor(delta / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function normalizeLockedArtifact(artifact) {
  const snapshot = artifact?.snapshot ?? artifact;
  return {
    mode: "locked",
    data: snapshot,
    lockedAt: artifact?.lockedAt ?? snapshot?.lockedAt ?? null,
    contentHash: artifact?.contentHash ?? snapshot?.contentHash ?? null,
    lockMode: artifact?.lockMode ?? "official-deadline",
  };
}

export async function loadCurrentLedger() {
  try {
    const lockedResponse = await fetch(LOCKED_URL, { cache: "no-store" });
    if (lockedResponse.ok) {
      return normalizeLockedArtifact(await lockedResponse.json());
    }
  } catch {
    // The lock artifact intentionally does not exist before the deadline.
  }

  const data = await loadJson(SNAPSHOT_URL);
  const deadline = Date.parse(data.deadlineTime);
  const mode = Number.isFinite(deadline) && Date.now() >= deadline ? "lock-pending" : "prelock";
  return { mode, data, lockedAt: null, contentHash: null };
}

/**
 * Load the official FPL live feed for the current event. The feed is allowed
 * to be unavailable while a Gameweek has not started; the Modelbook keeps
 * showing the immutable forecast and fills actual points as minutes arrive.
 */
export async function loadLivePoints() {
  try {
    const payload = await loadJson(LIVE_POINTS_URL);
    const players = Object.fromEntries((payload?.elements ?? []).map((element) => {
      // The Prism proxy returns { points, minutes, played }. Accept the raw
      // FPL { stats } shape as well for local development and future proxies.
      const stats = element?.stats ?? {};
      const minutes = Number(element?.minutes ?? stats.minutes ?? 0);
      return [String(element.id), {
        minutes,
        played: Boolean(element?.played ?? (minutes > 0)),
        totalPoints: Number(element?.points ?? stats.total_points ?? 0),
      }];
    }));
    return { available: true, players, fetchedAt: new Date().toISOString() };
  } catch {
    return { available: false, players: {}, fetchedAt: null };
  }
}

export function actualPointsFor(row, livePoints) {
  const player = livePoints?.players?.[String(row?.id)];
  if (!player || (player.minutes <= 0 && !player.played)) return null;
  return Number.isFinite(player.totalPoints) ? player.totalPoints : null;
}

export function ledgerStatus(mode, lockMode = "official-deadline") {
  if (mode === "locked") {
    return {
      label: lockMode === "manual-predeadline" ? `GW${CURRENT_GAMEWEEK} MANUALLY LOCKED` : `GW${CURRENT_GAMEWEEK} LOCKED`,
      eyebrow: `GW${CURRENT_GAMEWEEK} · IMMUTABLE SNAPSHOT`,
      detail: lockMode === "manual-predeadline"
        ? "The operator has frozen this exact model export ahead of the official deadline. These are the forecasts used for scoring."
        : "The deadline snapshot is frozen. These are the exact forecasts that will be scored.",
      tone: "locked",
    };
  }
  if (mode === "lock-pending") {
    return {
      label: "LOCK PENDING",
      eyebrow: `GW${CURRENT_GAMEWEEK} · DEADLINE REACHED`,
      detail: "The deadline has passed. Modelbook is waiting for the immutable lock artifact before scoring begins.",
      tone: "pending",
    };
  }
  return {
    label: `GW${CURRENT_GAMEWEEK} PRE-LOCK`,
    eyebrow: `GW${CURRENT_GAMEWEEK} · PUBLIC FORWARD TEST`,
    detail: "Projections remain live until the FPL deadline. The exact deadline output will then be frozen and fingerprinted.",
    tone: "live",
  };
}

export function topRows(data, count = 8) {
  return [...(data?.rows ?? [])]
    .filter((row) => Number.isFinite(Number(row.projected)))
    .sort((a, b) => Number(b.projected) - Number(a.projected))
    .slice(0, count);
}

export function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

export function setStatus(mode, lockMode) {
  const status = ledgerStatus(mode, lockMode);
  const badge = document.querySelector("[data-ledger-status]");
  if (badge) {
    badge.textContent = status.label;
    badge.dataset.tone = status.tone;
  }
  document.querySelectorAll("[data-ledger-eyebrow]").forEach((node) => {
    node.textContent = status.eyebrow;
  });
  document.querySelectorAll("[data-ledger-detail]").forEach((node) => {
    node.textContent = status.detail;
  });
}

export function renderError(target, message) {
  const node = document.querySelector(target);
  if (!node) return;
  node.innerHTML = `<div class="errorBox"><strong>Live Modelbook unavailable</strong><span>${escapeHtml(message)}</span><button type="button" onclick="location.reload()">Retry</button></div>`;
}

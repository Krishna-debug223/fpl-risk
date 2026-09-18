import type { BootstrapPayload, FplFixture, NewsScanAlert, NewsScanPayload } from "./types";

const HOUR_MS = 60 * 60 * 1_000;

function severityFor(status: string, chance: number | null): NewsScanAlert["severity"] {
  if (status === "i" || status === "s" || status === "u" || chance != null && chance <= 25) return "high";
  if (status === "d" || chance != null && chance <= 75) return "medium";
  return "low";
}

function windowState(deadlineTime: string, now: number): NewsScanPayload["windowState"] {
  const deadline = Date.parse(deadlineTime);
  if (!Number.isFinite(deadline)) return "scheduled";
  if (now >= deadline) return "closed";
  return now >= deadline - HOUR_MS ? "active" : "scheduled";
}

export function buildNewsScan(
  bootstrap: BootstrapPayload,
  fixtures: FplFixture[],
  eventId: number,
  now = Date.now(),
): NewsScanPayload {
  const event = bootstrap.events.find((item) => item.id === eventId);
  if (!event) throw new Error("NO_MATCHING_EVENT");

  const teamMap = new Map(bootstrap.teams.map((team) => [team.id, team]));
  const kickoffByTeam = new Map<number, string | null>();
  fixtures
    .filter((fixture) => fixture.event === eventId)
    .forEach((fixture) => {
      kickoffByTeam.set(fixture.team_h, fixture.kickoff_time);
      kickoffByTeam.set(fixture.team_a, fixture.kickoff_time);
    });

  const alerts = bootstrap.elements
    .filter((player) => {
      const chance = player.chance_of_playing_this_round ?? player.chance_of_playing_next_round;
      return Boolean(player.news) || player.status !== "a" || chance != null && chance < 100;
    })
    .filter((player) => kickoffByTeam.has(player.team))
    .map((player) => {
      const chance = player.chance_of_playing_this_round ?? player.chance_of_playing_next_round ?? null;
      return {
        playerId: player.id,
        playerName: player.web_name,
        teamId: player.team,
        team: teamMap.get(player.team)?.short_name ?? "—",
        status: player.status,
        chanceOfPlaying: chance,
        news: player.news ?? "Availability flag from the official FPL feed.",
        newsAdded: player.news_added ?? null,
        kickoffTime: kickoffByTeam.get(player.team) ?? null,
        severity: severityFor(player.status, chance),
      } satisfies NewsScanAlert;
    })
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const severityDelta = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDelta) return severityDelta;
      return Date.parse(b.newsAdded ?? "") - Date.parse(a.newsAdded ?? "");
    })
    .slice(0, 40);

  const summary = alerts.reduce((counts, alert) => {
    counts[alert.severity] += 1;
    counts.total += 1;
    return counts;
  }, { high: 0, medium: 0, low: 0, total: 0 });

  return {
    schemaVersion: 1,
    eventId,
    eventName: event.name,
    deadlineTime: event.deadline_time,
    scanWindowStart: new Date(Date.parse(event.deadline_time) - HOUR_MS).toISOString(),
    windowState: windowState(event.deadline_time, now),
    scannedAt: new Date(now).toISOString(),
    source: "official-fpl-bootstrap",
    alerts,
    summary,
  };
}

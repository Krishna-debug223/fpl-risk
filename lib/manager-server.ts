import { fplFetch } from "@/lib/server-fpl";
import type { FplEvent, ManagerPayload, ManagerPick } from "@/lib/types";

type Entry = {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number | null;
  summary_overall_rank: number | null;
  summary_event_points: number | null;
  last_deadline_bank: number | null;
  last_deadline_value: number | null;
  current_event: number | null;
};

type Picks = { active_chip: string | null; picks: ManagerPick[]; entry_history?: { points?: number } };
type History = { current: Array<{ event: number }>; chips?: Array<{ name: string; event: number; time?: string }> };

export async function loadPublicManager(teamId: string): Promise<ManagerPayload> {
  if (!/^\d{1,12}$/.test(teamId)) throw new Error("INVALID_TEAM_ID");

  const [entry, bootstrap, history] = await Promise.all([
    fplFetch<Entry>(`/entry/${teamId}/`, 0),
    fplFetch<{ events: FplEvent[] }>("/bootstrap-static/", 300),
    fplFetch<History>(`/entry/${teamId}/history/`, 0),
  ]);

  const current = bootstrap.events.find((event) => event.is_current);
  const mostRecentHistory = history.current.at(-1)?.event;
  const eventId = current?.id ?? mostRecentHistory ?? entry.current_event ?? 1;

  let picks: Picks;
  let picksEventId = eventId;
  try {
    picks = await fplFetch<Picks>(`/entry/${teamId}/event/${eventId}/picks/`, 0);
  } catch {
    if (!mostRecentHistory || mostRecentHistory === eventId) throw new Error("NO_PUBLIC_PICKS");
    picksEventId = mostRecentHistory;
    picks = await fplFetch<Picks>(`/entry/${teamId}/event/${picksEventId}/picks/`, 0);
  }

  return {
    id: entry.id,
    teamName: entry.name,
    managerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
    overallPoints: entry.summary_overall_points,
    overallRank: entry.summary_overall_rank,
    gameweekPoints: entry.summary_event_points ?? picks.entry_history?.points ?? null,
    bank: entry.last_deadline_bank,
    teamValue: entry.last_deadline_value,
    eventId: picksEventId,
    activeChip: picks.active_chip,
    chipsUsed: history.chips ?? [],
    picks: picks.picks,
    fetchedAt: new Date().toISOString(),
  };
}

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
type History = { current: Array<{ event: number; bank?: number; value?: number }>; chips?: Array<{ name: string; event: number; time?: string }> };

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

  // After a Free Hit, FPL restores the squad (and bank) from the previous
  // deadline. Those picks are public, so show the squad that will actually
  // play next rather than the temporary one.
  let squadPicks = picks.picks;
  let bank = entry.last_deadline_bank;
  let teamValue = entry.last_deadline_value;
  let freeHitRevert: ManagerPayload["freeHitRevert"] = null;
  if (picks.active_chip === "freehit") {
    const previous = history.current
      .filter((row) => row.event < picksEventId)
      .sort((a, b) => b.event - a.event)[0];
    if (previous) {
      try {
        const restored = await fplFetch<Picks>(`/entry/${teamId}/event/${previous.event}/picks/`, 0);
        squadPicks = restored.picks;
        bank = previous.bank ?? bank;
        teamValue = previous.value ?? teamValue;
        freeHitRevert = { freeHitEvent: picksEventId, squadEvent: previous.event, freeHitPicks: picks.picks };
      } catch {
        // Fall back to the Free Hit picks; the UI explains they are temporary.
      }
    }
  }

  return {
    id: entry.id,
    teamName: entry.name,
    managerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
    overallPoints: entry.summary_overall_points,
    overallRank: entry.summary_overall_rank,
    gameweekPoints: entry.summary_event_points ?? picks.entry_history?.points ?? null,
    bank,
    teamValue,
    eventId: picksEventId,
    activeChip: picks.active_chip,
    chipsUsed: history.chips ?? [],
    picks: squadPicks,
    freeHitRevert,
    fetchedAt: new Date().toISOString(),
  };
}

"use client";

import type { CSSProperties } from "react";
import type { FplPlayer, FplTeam, ManagerPick } from "@/lib/types";
import type { MarketProjection } from "@/lib/risk-v12";
import { getClubKitVars } from "@/lib/club-kits";
import { officialAvailability } from "./dashboard/format";
import styles from "./SquadPitch.module.css";

export type SquadPitchPlayer = {
  pick: ManagerPick;
  player: FplPlayer;
  one: MarketProjection;
  three: MarketProjection;
  five: MarketProjection;
};

type Props = {
  players: SquadPitchPlayer[];
  teams: FplTeam[];
  mode?: "inspect" | "transfer";
  selectedIds?: number[];
  /** Which number each tile shows. */
  metric?: "next" | "five" | "result";
  actualPoints?: Record<number, { points: number; played: boolean }>;
  onSelect?: (item: SquadPitchPlayer) => void;
  onInspect?: (item: SquadPitchPlayer) => void;
};

function Tile({
  item, team, mode, selected, metric, actual, onSelect, onInspect,
}: {
  item: SquadPitchPlayer;
  team?: FplTeam;
  mode: "inspect" | "transfer";
  selected: boolean;
  metric: "next" | "five" | "result";
  actual?: { points: number; played: boolean };
  onSelect?: (item: SquadPitchPlayer) => void;
  onInspect?: (item: SquadPitchPlayer) => void;
}) {
  const code = team?.short_name ?? "";
  const status = officialAvailability(item.player);
  const fixture = item.one.fixtureLabels[0];
  const value = metric === "five" ? item.five.expected : item.one.expected;

  const primaryAction = mode === "transfer" ? onSelect : onInspect;
  const verb = mode === "transfer" ? (selected ? "Deselect" : "Select to sell") : "Details for";

  return (
    <div className={`${styles.tile} ${selected ? styles.selected : ""}`}>
      <button
        type="button"
        className={styles.tileButton}
        onClick={() => primaryAction?.(item)}
        aria-pressed={mode === "transfer" ? selected : undefined}
        aria-label={`${verb} ${item.player.web_name}${item.pick.is_captain ? ", captain" : item.pick.is_vice_captain ? ", vice-captain" : ""}`}
      >
        <span className={styles.shirt} style={getClubKitVars(code) as CSSProperties} aria-hidden="true" />
        {(item.pick.is_captain || item.pick.is_vice_captain) && (
          <span className={styles.armband} title={item.pick.is_captain ? "Captain" : "Vice-captain"}>
            {item.pick.is_captain ? "C" : "V"}
          </span>
        )}
        {status.flagged && (
          <span className={`${styles.flag} ${status.tone === "bad" ? styles.flagBad : styles.flagWarn}`} title={status.label}>!</span>
        )}
        <span className={styles.name}>{item.player.web_name}</span>
        <span className={styles.meta}>
          {metric === "result" ? (
            <>
              <b>{actual?.played ? `${actual.points} pts` : "Not played"}</b>
              <span>forecast {value.toFixed(1)}</span>
            </>
          ) : (
            <>
              <b>{value.toFixed(1)}</b>
              <span>{metric === "five" ? "5 GW" : fixture === "BLANK" ? "Blank" : fixture}</span>
            </>
          )}
        </span>
      </button>
      {mode === "transfer" && onInspect && (
        <button type="button" className={styles.details} onClick={() => onInspect(item)}>
          Details<span className="sr-only"> for {item.player.web_name}</span>
        </button>
      )}
    </div>
  );
}

export default function SquadPitch({
  players, teams, mode = "inspect", selectedIds = [], metric = "next", actualPoints, onSelect, onInspect,
}: Props) {
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const starters = players.filter((item) => item.pick.position <= 11);
  const bench = players.filter((item) => item.pick.position > 11).sort((a, b) => a.pick.position - b.pick.position);
  const lines = [1, 2, 3, 4].map((type) => starters.filter((item) => item.player.element_type === type));
  const tile = (item: SquadPitchPlayer) => (
    <Tile
      key={item.player.id}
      item={item}
      team={teamMap.get(item.player.team)}
      mode={mode}
      selected={selectedIds.includes(item.player.id)}
      metric={metric}
      actual={actualPoints?.[item.player.id]}
      onSelect={onSelect}
      onInspect={onInspect}
    />
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.pitch} aria-label="Starting XI">
        {lines.map((line, index) => (
          <div className={styles.line} key={index}>{line.map(tile)}</div>
        ))}
      </div>
      <div className={styles.bench} aria-label="Bench, in substitution order">
        <span className={styles.benchLabel}>Bench</span>
        <div className={styles.benchRow}>
          {bench.map((item, index) => (
            <div key={item.player.id} className={styles.benchSlot}>
              <span className={styles.benchOrder}>{index === 0 ? "GK" : index}</span>
              {tile(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

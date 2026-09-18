"use client";

import type { CSSProperties } from "react";
import type { FplPlayer, FplTeam, ManagerPick } from "@/lib/types";
import type { MarketProjection } from "@/lib/risk-v12";
import { getClubKitVars } from "@/lib/club-kits";
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
  actualPoints?: Record<number, { points: number; played: boolean }>;
  selectedIds?: number[];
  mode?: "inspect" | "transfer";
  onPlayerClick?: (item: SquadPitchPlayer) => void;
  onInspect?: (item: SquadPitchPlayer) => void;
  compact?: boolean;
};

const positionLabel = (type: number) => ["", "GK", "DEF", "MID", "FWD"][type] ?? "";

function PlayerTile({
  item,
  team,
  selected,
  mode,
  actualPoints,
  onPlayerClick,
  onInspect,
}: {
  item: SquadPitchPlayer;
  team?: FplTeam;
  selected: boolean;
  mode: "inspect" | "transfer";
  actualPoints?: Record<number, { points: number; played: boolean }>;
  onPlayerClick?: (item: SquadPitchPlayer) => void;
  onInspect?: (item: SquadPitchPlayer) => void;
}) {
  const fixture = item.one.fixtureLabels[0] ?? "BLANK";
  const teamCode = team?.short_name ?? positionLabel(item.player.element_type);
  const kitStyle = getClubKitVars(teamCode) as CSSProperties;
  const live = actualPoints?.[item.player.id];

  return (
    <div className={`${styles.tileWrap} ${selected ? styles.selectedWrap : ""}`}>
      <button
        type="button"
        className={`${styles.playerTile} ${selected ? styles.selectedTile : ""}`}
        onClick={() => onPlayerClick?.(item)}
        aria-pressed={mode === "transfer" ? selected : undefined}
        aria-label={`${mode === "transfer" ? selected ? "Deselect" : "Select" : "Open"} ${item.player.web_name}`}
      >
        <span className={styles.playerVisual} aria-hidden="true">
          <span className={styles.kitShirt} style={kitStyle}>
            <span className={styles.kitCollar} />
            <b>{teamCode}</b>
          </span>
        </span>

        <span className={styles.badges}>
          {item.pick.is_captain && <b className={styles.captain}>C</b>}
          {item.pick.is_vice_captain && <b className={styles.vice}>V</b>}
        </span>

        <span className={styles.points} title="Actual points and single-gameweek model projection">
          <strong>{live?.played ? live.points : "—"}<small>actual</small></strong>
          <em>{item.one.expected.toFixed(1)} xPts</em>
        </span>

        <span className={styles.playerPlate}>
          <strong>{item.player.web_name}</strong>
          <small>{fixture}</small>
        </span>

        {mode === "transfer" && (
          <span className={styles.selectState}>{selected ? "Selected" : "Transfer out"}</span>
        )}
      </button>

      {onInspect && (
        <button
          type="button"
          className={styles.inspectButton}
          onClick={() => onInspect(item)}
          aria-label={`Why ${item.player.web_name} projects this way`}
        >
          Why?
        </button>
      )}
    </div>
  );
}

export default function SquadPitch({
  players,
  teams,
  actualPoints,
  selectedIds = [],
  mode = "inspect",
  onPlayerClick,
  onInspect,
  compact = false,
}: Props) {
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const starters = players.filter((item) => item.pick.position <= 11);
  const bench = players.filter((item) => item.pick.position > 11).sort((a, b) => a.pick.position - b.pick.position);
  const lines = [1, 2, 3, 4].map((type) => starters.filter((item) => item.player.element_type === type));

  return (
    <section className={`${styles.pitchShell} ${compact ? styles.compact : ""}`} aria-label="FPL squad pitch">
      <div className={styles.pitch}>
        <div className={styles.halfway} />
        <div className={styles.centreCircle} />
        <div className={`${styles.box} ${styles.topBox}`} />
        <div className={`${styles.box} ${styles.bottomBox}`} />
        <div className={styles.formation}>
          {lines.map((line, lineIndex) => (
            <div className={styles.line} key={lineIndex} data-position={lineIndex + 1}>
              {line.map((item) => (
                <PlayerTile
                  key={item.player.id}
                  item={item}
                  team={teamMap.get(item.player.team)}
                  selected={selectedIds.includes(item.player.id)}
                  mode={mode}
                  actualPoints={actualPoints}
                  onPlayerClick={onPlayerClick}
                  onInspect={onInspect}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.benchSection}>
        <div className={styles.benchHeading}>
          <span>SUBSTITUTES</span>
          <small>Bench order from your imported FPL squad</small>
        </div>
        <div className={styles.benchRow}>
          {bench.map((item) => (
            <PlayerTile
              key={item.player.id}
              item={item}
              team={teamMap.get(item.player.team)}
              selected={selectedIds.includes(item.player.id)}
              mode={mode}
              actualPoints={actualPoints}
              onPlayerClick={onPlayerClick}
              onInspect={onInspect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

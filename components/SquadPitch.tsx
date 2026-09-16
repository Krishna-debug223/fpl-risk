"use client";

import type { FplPlayer, FplTeam, ManagerPick } from "@/lib/types";
import type { MarketProjection } from "@/lib/risk-v12";
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
  onPlayerClick,
  onInspect,
}: {
  item: SquadPitchPlayer;
  team?: FplTeam;
  selected: boolean;
  mode: "inspect" | "transfer";
  onPlayerClick?: (item: SquadPitchPlayer) => void;
  onInspect?: (item: SquadPitchPlayer) => void;
}) {
  const fixture = item.one.fixtureLabels[0] ?? "BLANK";
  return (
    <div className={`${styles.tileWrap} ${selected ? styles.selectedWrap : ""}`}>
      <button
        type="button"
        className={`${styles.playerTile} ${selected ? styles.selectedTile : ""}`}
        onClick={() => onPlayerClick?.(item)}
        aria-pressed={mode === "transfer" ? selected : undefined}
        aria-label={`${mode === "transfer" ? selected ? "Deselect" : "Select" : "Open"} ${item.player.web_name}`}
      >
        <span className={styles.badges}>
          {item.pick.is_captain && <b className={styles.captain}>C</b>}
          {item.pick.is_vice_captain && <b className={styles.vice}>V</b>}
        </span>
        <span className={styles.shirt}>{team?.short_name ?? positionLabel(item.player.element_type)}</span>
        <strong>{item.player.web_name}</strong>
        <small>{fixture}</small>
        <span className={styles.points}>{item.one.expected.toFixed(1)} <em>xPts</em></span>
        {mode === "transfer" && <span className={styles.selectState}>{selected ? "Selected" : "Transfer out"}</span>}
      </button>
      {onInspect && (
        <button type="button" className={styles.inspectButton} onClick={() => onInspect(item)} aria-label={`Why ${item.player.web_name} projects this way`}>
          Why?
        </button>
      )}
    </div>
  );
}

export default function SquadPitch({
  players,
  teams,
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
                  onPlayerClick={onPlayerClick}
                  onInspect={onInspect}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.benchSection}>
        <div className={styles.benchHeading}><span>BENCH</span><small>Order from your imported FPL squad</small></div>
        <div className={styles.benchRow}>
          {bench.map((item) => (
            <PlayerTile
              key={item.player.id}
              item={item}
              team={teamMap.get(item.player.team)}
              selected={selectedIds.includes(item.player.id)}
              mode={mode}
              onPlayerClick={onPlayerClick}
              onInspect={onInspect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

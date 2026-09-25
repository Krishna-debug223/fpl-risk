"use client";

import { useEffect, useRef, useState } from "react";
import type { FplPlayer } from "@/lib/types";
import type { MarketProjection } from "@/lib/risk-v12";
import BrandMark from "./BrandMark";
import styles from "./DecisionPreview.module.css";

type Row = {
  player: FplPlayer;
  one: MarketProjection;
  three: MarketProjection;
  five: MarketProjection;
  value: number;
};
type View = "forecast" | "fixtures" | "drivers";
const views: { id: View; label: string; detail: string; icon: string }[] = [
  {
    id: "forecast",
    label: "The forecast",
    detail: "See the upside",
    icon: "↗",
  },
  { id: "fixtures", label: "The fixtures", detail: "Look ahead", icon: "▦" },
  {
    id: "drivers",
    label: "The reasoning",
    detail: "Every point explained",
    icon: "◎",
  },
];

export default function DecisionPreview({
  rows,
  gameweek,
  onWhy,
  onMarket,
}: {
  rows: Row[];
  gameweek: string;
  onWhy: (row: Row) => void;
  onMarket: () => void;
}) {
  const [view, setView] = useState<View>("forecast");
  const [selected, setSelected] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [horizon, setHorizon] = useState<"one" | "three" | "five">("one");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const row = rows.find((r) => r.player.id === selected) ?? rows[0];
  const forecast = row?.[horizon];

  useEffect(() => {
    if (!expanded) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog.current?.close();
      trigger.current?.focus();
    };
  }, [expanded]);

  const close = () => setExpanded(false);
  const tabs = (prefix: string) => (
    <div className={styles.tabs} role="tablist" aria-label={`${prefix} views`}>
      {views.map((v, i) => (
        <button
          key={v.id}
          id={`${prefix}-${v.id}`}
          role="tab"
          aria-selected={view === v.id}
          aria-controls={`${prefix}-content`}
          tabIndex={view === v.id ? 0 : -1}
          onClick={() => setView(v.id)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              const next = views[(i + (e.key === "ArrowRight" ? 1 : 2)) % 3];
              setView(next.id);
              document.getElementById(`${prefix}-${next.id}`)?.focus();
            }
          }}
        >
          <span className={styles.tabIcon}>{v.icon}</span>
          <span>
            {v.label}
            <small>{v.detail}</small>
          </span>
        </button>
      ))}
    </div>
  );

  const content = (prefix: string) => (
    <div
      key={view}
      className={styles.content}
      role="tabpanel"
      id={`${prefix}-content`}
      aria-labelledby={`${prefix}-${view}`}
      aria-busy={!row}
    >
      {!row ? (
        <div className={styles.empty} aria-label="Loading forecast data">—</div>
      ) : view === "forecast" ? (
        <>
          <div className={styles.playerHeading}>
            <div>
              <small>PLAYER FORECAST · {gameweek}</small>
              <h3>{row.player.web_name}</h3>
              <span>
                {row.one.fixtureLabels[0] ?? "No fixture"} · £
                {(row.player.now_cost / 10).toFixed(1)}m
              </span>
            </div>
            <div className={styles.score}>
              {forecast?.expected.toFixed(1)}
              <small>
                xPTS /{" "}
                {horizon === "one" ? "1" : horizon === "three" ? "3" : "5"} GW
              </small>
            </div>
          </div>
          <div className={styles.horizons} aria-label="Projection horizon">
            {(["one", "three", "five"] as const).map((h, i) => (
              <button
                key={h}
                aria-pressed={horizon === h}
                onClick={() => setHorizon(h)}
              >
                {[1, 3, 5][i]} gameweek{h === "one" ? "" : "s"}
              </button>
            ))}
          </div>
          <div className={styles.playerList}>
            {rows.slice(0, 3).map((r, i) => (
              <button
                key={r.player.id}
                aria-pressed={row.player.id === r.player.id}
                onClick={() => setSelected(r.player.id)}
              >
                <span className={styles.rank}>0{i + 1}</span>
                <span>
                  <strong>{r.player.web_name}</strong>
                  <small>{r.one.fixtureLabels[0] ?? "BLANK"}</small>
                </span>
                <b>
                  {r[horizon].expected.toFixed(1)} <small>xPts</small>
                </b>
              </button>
            ))}
          </div>
        </>
      ) : view === "fixtures" ? (
        <>
          <div className={styles.subhead}>
            <span>{row.player.web_name}</span>
            <strong>The next five gameweeks</strong>
          </div>
          <div className={styles.fixtures}>
            {row.five.fixtureLabels.map((label, i) => (
              <div key={i}>
                <span>+{i + 1} GW</span>
                <strong>{label}</strong>
                <b>
                  {(row.five.fixtureMeans[i] ?? 0).toFixed(1)}
                  <small> xPts</small>
                </b>
                <div className={styles.track}>
                  <i
                    style={{
                      width: `${Math.min(100, ((row.five.fixtureMeans[i] ?? 0) / 10) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className={styles.note}>
            Fixture outlook from the existing model. Blank and double gameweeks
            stay visible.
          </p>
        </>
      ) : (
        <>
          <div className={styles.subhead}>
            <span>{row.player.web_name} · next gameweek</span>
            <strong>Where the points come from</strong>
          </div>
          <div className={styles.drivers}>
            {Object.entries(row.one.components)
              .filter(([, v]) => Math.abs(v) > 0.005)
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              .slice(0, 5)
              .map(([key, value]) => (
                <div key={key}>
                  <span>{key.replace(/([A-Z])/g, " $1")}</span>
                  <div className={styles.track}>
                    <i
                      style={{
                        width: `${Math.min(100, (Math.abs(value) / Math.max(row.one.expected, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>
                    {value >= 0 ? "+" : ""}
                    {value.toFixed(2)}
                  </strong>
                </div>
              ))}
          </div>
          <p className={styles.note}>
            Real scoring components. No generated numbers.
          </p>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className={styles.stage}>
        <div className={styles.orbit} aria-hidden="true" />
        <div className={`${styles.floatCard} ${styles.floatTop}`}>
          <span className={styles.check}>✓</span>
          <div>
            <strong>Every point, explained</strong>
            <small>Same model. Clearer decisions.</small>
          </div>
        </div>
        <div className={styles.preview}>
          <header>
            <BrandMark className={styles.mark} />
            <div>
              <strong>Your decision desk</strong>
              <small>{gameweek} · FPL Prism</small>
            </div>
            <span className={styles.live} aria-busy={!row}>
              <i /> {row ? "Live data" : "—"}
            </span>
          </header>
          {tabs("preview")}
          {content("preview")}
          <footer>
            <span>PROJECTIONS</span>
            <span>FIXTURES</span>
            <span>REASONING</span>
          </footer>
          <button
            className={styles.expand}
            ref={trigger}
            onClick={() => setExpanded(true)}
          >
            Explore the decision desk <span>↗</span>
            <small>Open the panels. Inspect every detail.</small>
          </button>
        </div>
        <button
          className={`${styles.floatCard} ${styles.floatBottom}`}
          onClick={() => {
            setView("drivers");
            setExpanded(true);
          }}
        >
          <span className={styles.signal}>◎</span>
          <div>
            <small>MODEL CONFIDENCE</small>
            <strong>{row ? `${row.one.dataQuality} / 100` : "—"}</strong>
            <small>Click to explore the inputs ↗</small>
          </div>
        </button>
      </div>

      {expanded && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          onCancel={close}
          onClick={(e) => {
            if (e.target === dialog.current) close();
          }}
          aria-labelledby="desk-title"
        >
          <button
            className={styles.close}
            onClick={close}
            aria-label="Close decision desk"
          >
            ×
          </button>
          <div className={styles.dialogMain}>
            <span className={styles.eyebrow}>THE DECISION DESK</span>
            <h2 id="desk-title">
              The detail behind <em>your next move.</em>
            </h2>
            {tabs("desk")}
            {content("desk")}
          </div>
          <aside className={styles.sidebar}>
            <span className={styles.eyebrow}>ONE PLAYER. THE FULL PICTURE.</span>
            <div className={styles.sideStats}>
              <div>
                <strong>{row?.one.expected.toFixed(1) ?? "—"}</strong>
                <span>next GW xPts</span>
              </div>
              <div>
                <strong>{row?.one.dataQuality ?? "—"}</strong>
                <span>data quality / 100</span>
              </div>
            </div>
            <ul>
              <li>Switch between forecast, fixtures and scoring inputs.</li>
              <li>Compare 1, 3 and 5 gameweek horizons.</li>
              <li>Use the same projections as Transfer Lab.</li>
            </ul>
            <button
              disabled={!row}
              onClick={() => {
                close();
                if (row) onWhy(row);
              }}
            >
              Full player breakdown ↗
            </button>
            <button
              className={styles.secondary}
              onClick={() => {
                close();
                onMarket();
              }}
            >
              Explore Player Market →
            </button>
            <p>Expected points are forecasts, not guaranteed returns.</p>
          </aside>
        </dialog>
      )}
    </>
  );
}

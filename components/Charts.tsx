"use client";

import type { FplFixture, FplPlayer, FplTeam } from "@/lib/types";
import { histogram, projectPlayer, type HistoricalProfileMap } from "@/lib/risk";

export function DistributionChart({ samples }: { samples: number[] }) {
  const data = histogram(samples, 32);
  const max = Math.max(...data.map((item) => item.count), 1);
  const width = 760;
  const height = 260;
  const pad = { l: 24, r: 18, t: 18, b: 34 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const minX = data[0]?.x ?? -10;
  const maxX = data.at(-1)?.x ?? 10;
  const xScale = (x: number) => pad.l + ((x - minX) / Math.max(maxX - minX, 1)) * innerW;
  const points = data.map((item, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = pad.t + innerH - (item.count / max) * innerH;
    return `${x},${y}`;
  }).join(" ");
  const area = `${pad.l},${pad.t + innerH} ${points} ${pad.l + innerW},${pad.t + innerH}`;
  const ticks = [minX, 0, maxX].filter((value, index, array) => index === 0 || Math.abs(value - array[index - 1]) > 2);

  if (!samples.length) return <div className="chart-empty">Run a simulation to see the outcome distribution.</div>;

  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Distribution of simulated transfer outcomes">
        <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} className="chart-axis" />
        {minX < 0 && maxX > 0 && <line x1={xScale(0)} y1={pad.t} x2={xScale(0)} y2={pad.t + innerH} className="chart-zero" />}
        <polygon points={area} className="chart-area" />
        <polyline points={points} className="chart-line" />
        {ticks.map((tick) => <text key={tick} x={xScale(tick)} y={height - 8} textAnchor="middle" className="chart-label">{tick > 0 ? "+" : ""}{tick.toFixed(0)}</text>)}
      </svg>
      <div className="chart-caption"><span>Transfer loses points</span><span>Net FPL point difference</span><span>Transfer gains points</span></div>
    </div>
  );
}

export function RiskReturnChart({ players, fixtures, teams, history }: { players: FplPlayer[]; fixtures: FplFixture[]; teams: FplTeam[]; history?: HistoricalProfileMap }) {
  const candidates = players
    .filter((p) => p.minutes > 0 && Number(p.selected_by_percent) >= 0.4)
    .map((player) => ({ player, projection: projectPlayer(player, fixtures, teams, 5, history) }))
    .sort((a, b) => b.projection.expected - a.projection.expected)
    .slice(0, 65);
  const maxX = Math.max(...candidates.map((c) => c.projection.volatility), 1);
  const maxY = Math.max(...candidates.map((c) => c.projection.expected), 1);
  const width = 760;
  const height = 360;
  const pad = { l: 48, r: 24, t: 24, b: 42 };
  const x = (v: number) => pad.l + (v / maxX) * (width - pad.l - pad.r);
  const y = (v: number) => height - pad.b - (v / maxY) * (height - pad.t - pad.b);
  const topLabels = new Set(candidates.slice(0, 10).map((c) => c.player.id));

  return (
    <div className="chart-wrap">
      <svg className="chart risk-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Projected points versus model volatility for FPL players">
        {[0.25, .5, .75, 1].map((t) => <line key={`h-${t}`} x1={pad.l} x2={width-pad.r} y1={pad.t+(height-pad.t-pad.b)*t} y2={pad.t+(height-pad.t-pad.b)*t} className="chart-grid" />)}
        {[0.25, .5, .75, 1].map((t) => <line key={`v-${t}`} y1={pad.t} y2={height-pad.b} x1={pad.l+(width-pad.l-pad.r)*t} x2={pad.l+(width-pad.l-pad.r)*t} className="chart-grid" />)}
        {candidates.map(({ player, projection }) => (
          <g key={player.id}>
            <circle cx={x(projection.volatility)} cy={y(projection.expected)} r={topLabels.has(player.id) ? 5.5 : 3.6} className={`scatter-dot pos-${player.element_type}`}>
              <title>{player.web_name}: {projection.expected.toFixed(1)} xPts / {projection.volatility.toFixed(1)} risk</title>
            </circle>
            {topLabels.has(player.id) && <text x={x(projection.volatility)+7} y={y(projection.expected)-6} className="scatter-label">{player.web_name}</text>}
          </g>
        ))}
        <text x={width/2} y={height-8} textAnchor="middle" className="axis-title">MODEL VOLATILITY →</text>
        <text x="14" y={height/2} textAnchor="middle" transform={`rotate(-90 14 ${height/2})`} className="axis-title">5GW EXPECTED POINTS →</text>
      </svg>
    </div>
  );
}

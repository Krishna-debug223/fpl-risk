import type { FplPlayer, FplTeam } from "./types";
import type { MarketProjection } from "./risk-v12";

export type PortfolioHolding = {
  player: FplPlayer;
  projection: MarketProjection;
  weight: number;
};

export type PortfolioRisk = {
  expected: number;
  independentVolatility: number;
  portfolioVolatility: number;
  correlationImpact: number;
  topTeam: string;
  topTeamShare: number;
  topFixture: string;
  topFixtureShare: number;
  risk: "Low" | "Medium" | "High";
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Treats the starting XI as a small portfolio. Same-team holdings share
 * attacking and clean-sheet outcomes; players sharing a fixture inherit a
 * smaller common shock. The result is intentionally explainable: independent
 * risk, covariance uplift and concentration are all shown separately.
 */
export function analyzePortfolioRisk(
  holdings: PortfolioHolding[],
  teams: FplTeam[] = [],
): PortfolioRisk {
  const active = holdings.filter((holding) => holding.weight > 0 && Number.isFinite(holding.projection.expected));
  if (!active.length) {
    return {
      expected: 0,
      independentVolatility: 0,
      portfolioVolatility: 0,
      correlationImpact: 0,
      topTeam: "—",
      topTeamShare: 0,
      topFixture: "—",
      topFixtureShare: 0,
      risk: "Low",
    };
  }

  const expected = active.reduce((sum, holding) => sum + holding.projection.expected * holding.weight, 0);
  const deviations = active.map((holding) =>
    (holding.projection.distribution?.standardDeviation ?? holding.projection.volatility) * holding.weight,
  );
  const independentVariance = deviations.reduce((sum, value) => sum + value ** 2, 0);
  let covariance = 0;

  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const a = active[left];
      const b = active[right];
      const sameTeam = a.player.team === b.player.team;
      const aEvents = new Set(a.projection.fixtureContexts.map((context) => context.event));
      const sameFixture = b.projection.fixtureContexts.some((context) => aEvents.has(context.event));
      const rho = sameTeam && sameFixture ? 0.32 : sameTeam ? 0.14 : sameFixture ? -0.08 : 0;
      covariance += 2 * deviations[left] * deviations[right] * rho;
    }
  }

  const portfolioVolatility = Math.sqrt(Math.max(0, independentVariance + covariance));
  const teamExposure = new Map<number, number>();
  const fixtureExposure = new Map<string, number>();
  active.forEach((holding) => {
    const exposure = holding.projection.expected * holding.weight;
    teamExposure.set(holding.player.team, (teamExposure.get(holding.player.team) ?? 0) + exposure);
    const fixture = holding.projection.fixtureLabels[0] ?? "Blank Gameweek";
    fixtureExposure.set(fixture, (fixtureExposure.get(fixture) ?? 0) + exposure);
  });
  const topTeamEntry = [...teamExposure.entries()].sort((a, b) => b[1] - a[1])[0];
  const topFixtureEntry = [...fixtureExposure.entries()].sort((a, b) => b[1] - a[1])[0];
  const topTeam = topTeamEntry
    ? teams.find((team) => team.id === topTeamEntry[0])?.short_name ?? `Team ${topTeamEntry[0]}`
    : "—";
  const topTeamShare = topTeamEntry ? clamp(topTeamEntry[1] / Math.max(expected, 0.1), 0, 1) : 0;
  const topFixtureShare = topFixtureEntry ? clamp(topFixtureEntry[1] / Math.max(expected, 0.1), 0, 1) : 0;
  const relativeVolatility = portfolioVolatility / Math.max(expected, 1);
  const risk = relativeVolatility > 0.66 || topTeamShare > 0.5
    ? "High"
    : relativeVolatility > 0.46 || topTeamShare > 0.38
      ? "Medium"
      : "Low";

  return {
    expected,
    independentVolatility: Math.sqrt(independentVariance),
    portfolioVolatility,
    correlationImpact: portfolioVolatility - Math.sqrt(independentVariance),
    topTeam,
    topTeamShare,
    topFixture: topFixtureEntry?.[0] ?? "—",
    topFixtureShare,
    risk,
  };
}

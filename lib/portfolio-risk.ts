import type { FplPlayer, FplTeam } from "./types";
import type { MarketProjection } from "./risk-v12";
import type { ProjectedFixtureIdentity } from "./risk";

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

function projectedFixtures(projection: MarketProjection) {
  const fixtures = new Map<number, ProjectedFixtureIdentity>();
  projection.fixtureContexts.forEach((context) => {
    context.fixtures.forEach((fixture) => fixtures.set(fixture.id, fixture));
  });
  return fixtures;
}

function sharedFixtureRatio(
  left: Map<number, ProjectedFixtureIdentity>,
  right: Map<number, ProjectedFixtureIdentity>,
) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((_, fixtureId) => {
    if (right.has(fixtureId)) shared += 1;
  });
  return shared / Math.max(left.size, right.size);
}

function fixtureLabel(fixture: ProjectedFixtureIdentity, teams: FplTeam[]) {
  const home = teams.find((team) => team.id === fixture.homeTeamId)?.short_name ?? `Team ${fixture.homeTeamId}`;
  const away = teams.find((team) => team.id === fixture.awayTeamId)?.short_name ?? `Team ${fixture.awayTeamId}`;
  const gameweek = fixture.event == null ? "Fixture" : `GW${fixture.event}`;
  return `${gameweek} · ${home} v ${away}`;
}

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
  const fixturesByHolding = active.map((holding) => projectedFixtures(holding.projection));
  const independentVariance = deviations.reduce((sum, value) => sum + value ** 2, 0);
  let covariance = 0;

  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const a = active[left];
      const b = active[right];
      const sameTeam = a.player.team === b.player.team;
      const overlap = sharedFixtureRatio(fixturesByHolding[left], fixturesByHolding[right]);
      // Correlation is attached to actual matches, not the Gameweek number.
      // Teammates share attacking/clean-sheet outcomes; opponents inherit a
      // smaller opposing match shock. Players in separate matches are
      // independent even when those matches belong to the same Gameweek.
      const rho = overlap * (sameTeam ? 0.32 : -0.08);
      covariance += 2 * deviations[left] * deviations[right] * rho;
    }
  }

  const portfolioVolatility = Math.sqrt(Math.max(0, independentVariance + covariance));
  const teamExposure = new Map<number, number>();
  const fixtureExposure = new Map<number, { exposure: number; fixture: ProjectedFixtureIdentity }>();
  active.forEach((holding, index) => {
    const exposure = holding.projection.expected * holding.weight;
    teamExposure.set(holding.player.team, (teamExposure.get(holding.player.team) ?? 0) + exposure);
    const fixtures = [...fixturesByHolding[index].values()];
    if (!fixtures.length) return;
    const exposurePerFixture = exposure / fixtures.length;
    fixtures.forEach((fixture) => {
      const current = fixtureExposure.get(fixture.id);
      fixtureExposure.set(fixture.id, {
        fixture,
        exposure: (current?.exposure ?? 0) + exposurePerFixture,
      });
    });
  });
  const topTeamEntry = [...teamExposure.entries()].sort((a, b) => b[1] - a[1])[0];
  const topFixtureEntry = [...fixtureExposure.values()].sort((a, b) => b.exposure - a.exposure)[0];
  const topTeam = topTeamEntry
    ? teams.find((team) => team.id === topTeamEntry[0])?.short_name ?? `Team ${topTeamEntry[0]}`
    : "—";
  const topTeamShare = topTeamEntry ? clamp(topTeamEntry[1] / Math.max(expected, 0.1), 0, 1) : 0;
  const topFixtureShare = topFixtureEntry ? clamp(topFixtureEntry.exposure / Math.max(expected, 0.1), 0, 1) : 0;
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
    topFixture: topFixtureEntry ? fixtureLabel(topFixtureEntry.fixture, teams) : "—",
    topFixtureShare,
    risk,
  };
}

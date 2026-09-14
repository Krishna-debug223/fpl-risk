# FPL Risk

**Live demo:** https://fpl-risk.vercel.app  
**Portfolio source snapshot:** v1.1.0 (the production app has continued evolving beyond this snapshot)

FPL Risk is a live Fantasy Premier League decision-analytics product built to answer a harder question than “who scored last week?”: **what move has the best expected payoff after accounting for fixtures, uncertainty, budget, squad rules and downside risk?**

The app combines public FPL data, underlying player metrics, early-season historical priors and fixture/team context to project expected points. Its transfer engine filters for legal squad moves before ranking alternatives, and a seeded 10,000-path Monte Carlo layer turns point estimates into decision distributions rather than a single number.

### Portfolio highlights

- Component-based expected-points model using minutes, xG, xA, clean-sheet, save, bonus, defensive-contribution and discipline signals.
- Fixture-aware team-strength layer using live xG/xGA, venue, opponent quality and regression toward league averages.
- Legal transfer optimizer enforcing position, budget, ownership, club-limit and availability constraints.
- 10,000 seeded simulations per comparison with expected gain, probability of beating hold, downside risk and p10/p50/p90 outcomes.
- Event-aware Double/Blank Gameweek logic plus Wildcard, Free Hit, Bench Boost and Triple Captain planning.
- Deterministic model-invariant suite via `npm run model:check`.

> **Repository note:** this is the clean launch-engine source snapshot I am publishing for portfolio review. The live product may contain newer model revisions, so the deployed site is the source of truth for the latest UI/model version.

---

FPL Risk is a live Fantasy Premier League decision-analytics product focused on **expected return, uncertainty, downside and legal squad decisions**.

Model v1.1 is the launch baseline after the underlying-data regression pass. It is designed to be explainable, reproducible and robust to missing optional data. It is **not** presented as a historically proven or perfectly calibrated forecasting system; retrospective calibration remains an ongoing measurement task.

## What changed for the v1.1 launch model

### Component-based expected points

The model no longer relies on one weighted form score. It estimates the FPL scoring components that can create points:

- expected minutes / appearance points
- goals from xG rates, using position-specific goal points
- assists from xA rates
- clean-sheet points
- goalkeeper saves
- defensive-contribution points
- bonus
- discipline / card drag
- expected goals-conceded deductions for goalkeepers and defenders

The component model now dominates the estimate. Current FPL Form and points-per-game are **not forecast inputs**. A small calibration anchor uses historical level, `ep_next` and price only as a guardrail.

### Opponent and club quality

Every upcoming match is contextualized using:

- official FPL fixture difficulty
- venue-specific own-team attack/defence strength
- opponent attack/defence strength
- home/away context
- current team xG per match derived from live player xG
- current team xGA derived from player expected-goals-conceded data
- team xA as a smaller chance-creation signal
- recency-weighted actual scorelines only as a small residual signal
- league-average shrinkage that prevents GW1/GW2 xG samples from dominating
- optional ClubElo team ratings, applied gently to avoid double-counting team quality

The attack and defensive matchup are treated differently. A forward benefits from a strong attack facing a weak defence; a defender benefits from a strong defence facing a weak attack.

### Early-season player priors

For established Premier League players, up to three completed seasons from the Vaastav FPL archive can stabilize early-season estimates. The newest season receives the most weight and tiny historical samples count less.

Historical player influence can be **up to 55% at zero current-season minutes** and falls continuously to **0% at 900 minutes**. Separately, current xG/xA/DefCon rates are sample-size regressed so 90–180 minutes cannot be blindly treated as a full-season rate.

### Recommendation engine

Before ranking a transfer, the engine removes moves that are not legal or feasible:

- same FPL position required
- incoming price must fit selling price + bank
- cannot recommend a player already owned
- maximum three players from one club
- clearly unavailable/ineligible players and very low-availability replacements are excluded

The ranking is then driven primarily by **net expected gain**. If the manager has zero free transfers, the -4 hit is fully deducted before the transfer is ranked. Added uncertainty and the option value of rolling a free transfer are small secondary adjustments.

**Ownership and transfer hype are displayed but are not used to rank recommendations.** This avoids turning popularity into a self-reinforcing prediction signal.

### Double and Blank Gameweeks

Horizons are based on actual Gameweeks, not just the next N fixtures:

- both fixtures count in a Double Gameweek
- a Blank Gameweek contributes zero fixture points

That same event-aware projection feeds the transfer and chip systems.

### Reproducible Monte Carlo risk

Transfer comparisons still use 10,000 simulated paths, but the launch simulation is seeded from the model version, players and projections. Identical inputs therefore produce identical results rather than changing every time the button is pressed.

The simulation reports:

- expected gain
- probability the transfer beats holding
- probability of losing at least five points
- 10th / 50th / 90th percentile outcomes
- outcome volatility

Availability is modeled once through appearance probabilities; it is not double-discounted.

### Data quality and confidence

Each projection carries a data-quality score based on signals such as:

- current-season minutes
- historical sample availability
- xG/xA data coverage and sample size
- team xG/xGA coverage
- fixture coverage
- team-strength coverage
- FPL expected-points signal
- optional Elo availability

Recommendation confidence combines that coverage with the size of the projected edge and modeled uncertainty. A weak-data recommendation is deliberately less likely to receive a high-confidence label.

## Data sources and fallbacks

Core operation requires the public FPL data feed. Optional research inputs are fetched separately and can fail without taking down the product:

- **Current data:** public Fantasy Premier League endpoints, proxied through Next.js routes.
- **Historical player priors:** Vaastav/Fantasy-Premier-League completed-season archive.
- **Optional team-strength enhancement:** FPL-Core-Insights / ClubElo team ratings.

If historical data is unavailable, projections run with live/current priors. If Elo is unavailable, the model falls back to FPL team-strength ratings. No FPL password or API key is required by the app.

## Chip planner

Wildcard, Free Hit, Bench Boost and Triple Captain use the same v1 projection engine. The planner scans upcoming Gameweeks and returns PLAY / CONSIDER / HOLD / USED / UNAVAILABLE states while checking chip availability and the current two-set chip structure.

The launch thresholds are intentionally conservative: for example, Triple Captain is not promoted simply because one player has a good single fixture.

## Validation included with the project

Run:

```bash
npm run model:check
```

or on Windows PowerShell:

```powershell
npm.cmd run model:check
```

The deterministic smoke/invariant suite verifies that:

- historical influence starts above 50% for a proven player with zero current minutes
- historical influence is zero at 900 current minutes
- an easier opponent/team matchup improves an otherwise identical player projection
- unavailable players are materially discounted, and players marked fully unavailable are not assumed to recover later in the five-GW horizon
- Double Gameweeks out-project equivalent single Gameweeks
- Blank Gameweeks return zero
- zero free transfers deduct exactly four points from the recommendation edge
- a two-match FPL haul cannot create a huge forecast when the underlying xG/xA is unchanged
- seeded simulations reproduce the same result for identical inputs

This is an engineering/model-consistency test, **not a claim of historical predictive accuracy**. See `MODEL_VALIDATION.md`.

## Launch analytics and privacy

The app uses Vercel Web Analytics and Speed Insights. Product events cover the activation funnel (team import, recommendation selection, simulation, etc.) but deliberately exclude Team IDs, manager/team names, player names, email addresses and free-form text.

The Privacy page includes a browser-level analytics opt-out.

## Launch environment

Set these in Vercel:

- `NEXT_PUBLIC_CONTACT_EMAIL` — a monitored support/privacy inbox
- `NEXT_PUBLIC_SITE_URL` — optional while using the Vercel production URL; set this when a custom domain is connected

No database is required for v1.1.

## Run locally

```bash
npm install
npm run model:check
npm run dev
```

On Windows PowerShell where `npm.ps1` is blocked:

```powershell
npm.cmd install
npm.cmd run model:check
npm.cmd run dev
```

## Stack

- Next.js 16
- React 19
- TypeScript
- plain CSS — no Tailwind
- native SVG charts
- Vercel Analytics + Speed Insights
- live public FPL xG/xA/xGA data
- derived team xG/xGA matchup layer
- Vaastav historical player priors
- optional FPL-Core-Insights / ClubElo team-strength enhancement

## Design constraints

- no gradients
- no Tailwind
- asymmetric / off-centre hero composition
- FPL-inspired colour language while remaining clearly independent from the Premier League

## Important disclaimer

FPL Risk is an independent project and is not affiliated with, endorsed by or sponsored by the Premier League. Recommendations are probabilistic decision aids, not guarantees. The automated use of third-party football/game data also creates a separate terms/licensing consideration that should be resolved before monetization or a larger commercial rollout.

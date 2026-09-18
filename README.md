# FPL Risk

FPL Risk is a Fantasy Premier League decision workspace for managers who want to compare expected points, uncertainty, transfer cost and squad legality before making a move.

The product is live at **[fpl-risk-ui-refresh.vercel.app](https://fpl-risk-ui-refresh.vercel.app/dashboard)**. It uses the public FPL feed and keeps the reasoning visible: every projection can be opened, inspected by scoring component and compared across a real fixture horizon.

## Product

| Surface | What it does |
| --- | --- |
| [Dashboard](https://fpl-risk-ui-refresh.vercel.app/dashboard) | Imports a public FPL Team ID, shows the current Gameweek, live projections, confidence, the decision desk, the live market rail and a model snapshot. |
| **Overview** | Forecast, fixture and reasoning views for the leading players, with one, three and five Gameweek horizons. |
| **My Team** | Displays the imported 15-player squad, starting XI, bench order, captaincy, bank, team value, projected points, team risk, squad signals and chip guidance. |
| **Transfer Lab** | Selects players from the pitch, evaluates joint transfer packages and enforces position, budget, ownership, club-limit, availability, free-transfer and hit rules. |
| **Player Market** | Ranks the current player pool by projected points and opens the same component-level explanation used elsewhere in the app. |
| **Model** | Explains the expected-points components, fixture context, data quality, confidence, horizons, legal-transfer checks and optional market prior. |
| [8-GW Path Planner](https://fpl-risk-ui-refresh.vercel.app/planner) | Searches roll, single-transfer and two-transfer paths across eight Gameweeks in Safe, Balanced and Aggressive modes. |
| [Pricing](https://fpl-risk-ui-refresh.vercel.app/pricing) | Keeps the complete product free during launch. Pro and Elite are roadmap tiers; no paid checkout or automatic renewal is active. |
| **Account / sign in** | Optional Supabase-backed settings for saving a public Team ID, free-transfer default and planner style. An FPL password is never requested. |
| [FPL Modelbook](https://fpl-ledger-azure.vercel.app/modelbook) | Companion forward-test workspace linked from the dashboard. |

The production dashboard reports the current Gameweek and model version from the live feed. The latest release verified against production for this repository update is **Gameweek 5, model `1.2.0-beta.2`**.

## Model overview

The active model is component-based and fixture-aware. It combines:

- expected minutes and availability;
- position-specific goals, assists, clean sheets, saves, bonus, defensive contribution and discipline;
- player xG, xA and defensive rates with small-sample shrinkage;
- team and opponent attack/defence strength, venue, FDR, recent results and optional ClubElo;
- historical player priors from completed seasons when current-season samples are thin;
- event-aware horizons where Double Gameweeks count twice and Blank Gameweeks contribute no fixture points;
- legal transfer filtering before ranking, including budget, position, ownership and the three-player club limit;
- seeded 10,000-path simulation for expected gain, beat-hold probability, downside and p10/p50/p90 outcomes.

The optional sportsbook integration is present behind a server-side flag and is disabled in the current release (`SPORTSBOOK_ENABLED` is not `true`, and the model weight remains `0`). When no market data is available, the core model continues unchanged.

The model version is defined in [`lib/risk-v12.ts`](lib/risk-v12.ts). A version change is required for material changes to weights, priors, thresholds, simulation logic or data sources.

## Data and privacy

- Current player, team, event and fixture data comes from the public FPL endpoints through the routes in [`app/api/fpl`](app/api/fpl).
- Historical player priors come from the [Vaastav Fantasy Premier League archive](https://github.com/vaastav/Fantasy-Premier-League).
- Optional team-strength enrichment comes from [FPL-Core-Insights](https://github.com/olbauday/FPL-Core-Insights) / ClubElo.
- Optional sign-in and saved defaults use Supabase. Guest use remains available.
- Vercel Analytics and Speed Insights measure product usage and performance without sending Team IDs, manager names, player names, email addresses or free-form text in product events.

Read the [privacy page](https://fpl-risk-ui-refresh.vercel.app/privacy) and [terms](https://fpl-risk-ui-refresh.vercel.app/terms) before using or redistributing the product.

## Run locally

```bash
npm install
npm run dev
```

Create `.env.local` from [`.env.example`](.env.example) when you need canonical URL, contact, Supabase or sportsbook settings. The public dashboard and model checks run without a database or FPL credentials.

Useful checks:

```bash
npm run typecheck
npm run build
npm run model:check
npm run model:check:v12
```

The GitHub Actions workflow runs the type check, both deterministic model suites, the walk-forward backtest and the production build on pushes and pull requests.

## Repository map

| Directory | Purpose |
| --- | --- |
| `app/` | Next.js routes, metadata, legal pages and API endpoints. |
| `components/` | Dashboard, decision desk, squad pitch, planner, account and shared UI components. |
| `lib/` | FPL types and data access, projection engines, transfer logic, strategy planner, analytics and optional integrations. |
| `scripts/` | Deterministic validation, backtesting and sportsbook calibration utilities. |
| `.github/workflows/` | Continuous validation and production-build checks. |

## Deployment

The repository is connected to Vercel. A push to `main` builds the Next.js app using the checked-in [`vercel.json`](vercel.json). Keep secrets in Vercel environment variables; never commit `.env.local` or provider keys.

## Disclaimer

FPL Risk is an independent project and is not affiliated with, endorsed by or sponsored by the Premier League. Forecasts and transfer recommendations are probabilistic decision aids, not guarantees. Third-party football data remains subject to its providers' terms and licensing requirements.

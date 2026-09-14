# FPL Risk launch analytics

FPL Risk uses Vercel Web Analytics + Speed Insights. The app does **not** create a user account/profile database for analytics.

## What you can measure at launch

In the Vercel Analytics dashboard you can monitor:

- unique visitors
- page views
- referrers / acquisition sources
- country, browser, OS and device breakdowns
- custom-event totals
- unique visitors who triggered custom events
- real-user performance via Speed Insights

## Core funnel

Track this sequence weekly:

1. `overview_viewed` — landed in the product
2. `team_import_started` — attempted to use the core workflow
3. `team_import_success` — successfully imported a public squad
4. `transfer_lab_opened` / `transfer_lab_viewed` — reached the decision workflow
5. `ai_recommendation_selected` — engaged with a recommendation
6. `transfer_simulation_run` — completed the core value action

Useful conversion rates:

- Activation = visitors with `team_import_success` / unique visitors
- Core-value conversion = visitors with `transfer_simulation_run` / unique visitors
- Import reliability = `team_import_success` / `team_import_started`
- Recommendation adoption = `ai_recommendation_selected` / visitors to Transfer Lab

## Event properties currently allowed

Only coarse product context is sent:

- `count`
- `gameweek`
- `source`
- `rank`
- `horizon`
- `confidence`
- `risk`
- `freeTransfers`
- `hitApplied`
- `verdict`
- `successBand`

Never add FPL Team IDs, manager/team names, player names, email addresses, IP addresses or free-form user text to analytics events.

## Launch verification

After production deployment:

1. Enable Web Analytics in the Vercel project.
2. Enable Speed Insights.
3. Open the production site in a normal browser session.
4. Import a public team and run one simulation.
5. Confirm the page visit and custom events appear in Vercel Analytics.
6. Visit `/privacy`, disable analytics, refresh, and confirm subsequent test events are no longer intentionally sent by the app.

## What this does not do

This setup measures unique visitors and product usage, but it does not identify individual people or provide account-level retention/cohort histories. Add authenticated accounts or a purpose-built product analytics platform only if the product later needs those capabilities and after updating the privacy review.

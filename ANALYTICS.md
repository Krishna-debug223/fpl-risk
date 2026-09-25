# Analytics and privacy

FPL Prism uses Vercel Web Analytics and Speed Insights for aggregate product usage and performance. Analytics is a convenience for operating the public beta, not an account or identity system.

## What is collected

- page views and unique visitors;
- referrers and coarse country, browser, operating-system and device information;
- real-user performance measurements through Speed Insights;
- a small allow-listed set of product events from [`lib/analytics.ts`](lib/analytics.ts), where a flow uses the event helper.

The analytics component removes query strings and URL fragments before a page event is sent. The event helper allow-lists both event names and property keys, truncates text values and ignores unsupported values. It never accepts Team IDs, manager names, player names, email addresses, IP addresses or free-form user text.

## Privacy controls

The browser-level control on [`/privacy`](https://fplprism.com/privacy) stores an opt-out flag locally. When that flag is set, page analytics, Speed Insights and product events are not intentionally sent by the app. Account data is separate: optional sign-in settings are handled by Supabase and are not used as analytics identifiers.

## Production check

After a deployment:

1. Open the production dashboard and confirm the page loads with live FPL data.
2. If the active flow uses product events, import a public Team ID and complete a representative action.
3. Confirm page and event totals in the Vercel project’s Analytics panel.
4. Open `/privacy`, opt out, refresh and confirm the app continues to work without sending analytics.

Analytics must never block the FPL workflow. If the analytics provider is unavailable, the dashboard remains usable.

import type { Metadata } from "next";
import Link from "next/link";
import AnalyticsPrivacyControls from "@/components/AnalyticsPrivacyControls";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How FPL Risk handles manager data, analytics and model inputs.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <main className="legal-shell">
      <Link href="/" className="legal-back">← Back to FPL Risk</Link>
      <article className="legal-card">
        <span className="eyebrow">PRIVACY</span>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Effective 30 August 2026</p>
        <p>FPL Risk is built to work without an account, password or user profile. We collect only what is needed to operate the product, understand aggregate usage and improve reliability.</p>

        <h2>Information you provide</h2>
        <p>When you enter a Fantasy Premier League Team ID, FPL Risk sends that ID from our server to the public Fantasy Premier League data service so the app can display the public squad and manager information associated with that ID. The Team ID is sent in a POST request body rather than placed in the page URL. We do not intentionally add Team IDs, manager names or team names to product analytics.</p>
        <p>Your selected number of free transfers is stored only in your browser as a simple preference. Imported manager data is kept in the active browser session and is not written by FPL Risk to a user-account database.</p>

        <h2>Analytics and performance data</h2>
        <p>We use Vercel Web Analytics for aggregate traffic measurement and Vercel Speed Insights for performance metrics. This can include page views, referrer, approximate location, device/browser information and real-user performance measurements.</p>
        <p>We also record a small allow-listed set of product events, such as a successful team import, selecting a model recommendation or running a simulation, through Vercel Web Analytics. Event properties are deliberately limited to coarse product context such as horizon, gameweek, recommendation rank or whether a transfer hit was applied. We do not intentionally add FPL Team IDs, manager/team names, player names, email addresses or free-form text to product analytics. Vercel, as the hosting provider and analytics processor, may process ordinary network/request metadata under its own policies.</p>
        <AnalyticsPrivacyControls />

        <h2>AI and automated recommendations</h2>
        <p>Features labelled “AI” in FPL Risk are currently produced by an explainable statistical recommendation engine, not a general-purpose chatbot. It uses football/FPL statistics, fixture data, squad rules, historical priors and probabilistic simulations. We do not currently send your FPL squad to a third-party generative-AI provider. If that changes, this policy will be updated before that feature is released.</p>

        <h2>Third-party services and data sources</h2>
        <p>FPL Risk currently relies on Vercel for hosting, anonymous analytics and performance monitoring; public Fantasy Premier League endpoints for current game data; the Vaastav Fantasy Premier League historical dataset for completed-season player priors; and, when available, FPL-Core-Insights / ClubElo team ratings as an optional team-strength input. These external sources have their own terms and privacy practices. If either optional research feed is unavailable, the product falls back to the remaining model inputs rather than sending additional personal information.</p>

        <h2>Uploads, payments and subscriptions</h2>
        <p>FPL Risk currently has no user uploads, account registration, paid subscriptions, automatic renewals or stored payment details. If any of those features are introduced, the privacy and terms pages will be updated before launch of the feature.</p>

        <h2>Data retention and deletion</h2>
        <p>FPL Risk does not currently maintain a database of imported squads. Browser preferences remain on your device until you clear site data. Anonymous analytics are retained and aggregated by Vercel according to its service configuration and policies. Disabling analytics above prevents future analytics events from this browser.</p>

        <h2>Children and sensitive data</h2>
        <p>The service is not designed to collect sensitive personal information. Do not submit passwords, payment data, health information or other sensitive information into the Team ID field or elsewhere on the site.</p>

        {contactEmail && <>
          <h2>Contact</h2>
          <p>For privacy questions or requests, email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </>}

        <h2>Changes</h2>
        <p>We may update this policy as the product changes. The effective date at the top of this page will be updated when material changes are made.</p>

        <div className="legal-notice">FPL Risk is an independent project and is not affiliated with, endorsed by or sponsored by the Premier League.</div>
      </article>
    </main>
  );
}

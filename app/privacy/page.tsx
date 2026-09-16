import type { Metadata } from "next";
import Link from "next/link";
import AnalyticsPrivacyControls from "@/components/AnalyticsPrivacyControls";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How FPL Risk handles manager data, optional accounts, analytics and model inputs.",
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
        <p className="legal-updated">Effective 16 September 2026</p>
        <p>FPL Risk is built to work without an account. An optional account can be used to save a small set of planning preferences across sessions and devices.</p>

        <h2>Information you provide</h2>
        <p>When you enter a Fantasy Premier League Team ID, FPL Risk sends that public numeric ID from our server to the public Fantasy Premier League data service so the app can display the squad and manager information associated with it. We do not ask for or store your official FPL password.</p>
        <p>Guest-mode preferences may be stored in your browser. If you choose to create an FPL Risk account, your login email is handled by our authentication provider and the account can store the preferences you choose to save, currently including your public FPL Team ID, default free-transfer count and planner strategy mode.</p>

        <h2>Account authentication</h2>
        <p>Optional account authentication is provided through Supabase. Passwords are submitted directly through the authentication flow and are not stored in FPL Risk application code or exposed to our analytics. Email confirmation and password-recovery messages may be sent by the authentication provider when those features are enabled.</p>

        <h2>Analytics and performance data</h2>
        <p>We use Vercel Web Analytics for aggregate traffic measurement and Vercel Speed Insights for performance metrics. This can include page views, referrer, approximate location, device/browser information and real-user performance measurements.</p>
        <p>We also record a small allow-listed set of product events, such as a successful team import, selecting a model recommendation or running a simulation, through Vercel Web Analytics. Event properties are deliberately limited to coarse product context such as horizon, gameweek, recommendation rank or whether a transfer hit was applied. We do not intentionally add FPL Team IDs, manager/team names, player names, email addresses or free-form text to product analytics.</p>
        <AnalyticsPrivacyControls />

        <h2>AI and automated recommendations</h2>
        <p>Features labelled “AI” in FPL Risk are currently produced by an explainable statistical recommendation engine, not a general-purpose chatbot. It uses football/FPL statistics, fixture data, squad rules, historical priors and probabilistic simulations. We do not currently send your FPL squad to a third-party generative-AI provider.</p>

        <h2>Third-party services and data sources</h2>
        <p>FPL Risk currently relies on Vercel for hosting, analytics and performance monitoring; Supabase for optional account authentication and saved account preferences when enabled; public Fantasy Premier League endpoints for current game data; the Vaastav Fantasy Premier League historical dataset for completed-season player priors; and optional team-strength research feeds. These services have their own terms and privacy practices.</p>

        <h2>Payments and subscriptions</h2>
        <p>The pricing page currently describes launch and roadmap tiers only. No paid checkout, automatic renewal or stored payment method is active. If paid subscriptions launch later, this policy and the Terms will be updated before payment details are collected.</p>

        <h2>Data retention and account control</h2>
        <p>Guest preferences remain on your device until you clear site data. Signed-in preferences remain attached to the account until they are changed or the account is removed. FPL Risk is intentionally keeping the saved account profile small during launch.</p>

        <h2>Children and sensitive data</h2>
        <p>The service is not designed to collect sensitive personal information. Do not submit payment data, health information or other sensitive information into the Team ID field, account profile or other product inputs.</p>

        {contactEmail && <>
          <h2>Contact</h2>
          <p>For privacy questions or account-data requests, email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </>}

        <h2>Changes</h2>
        <p>We may update this policy as the product changes. The effective date at the top of this page will be updated when material changes are made.</p>

        <div className="legal-notice">FPL Risk is an independent project and is not affiliated with, endorsed by or sponsored by the Premier League.</div>
      </article>
    </main>
  );
}

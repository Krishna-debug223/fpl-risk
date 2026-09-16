import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using FPL Risk.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <main className="legal-shell">
      <Link href="/" className="legal-back">← Back to FPL Risk</Link>
      <article className="legal-card">
        <span className="eyebrow">TERMS</span>
        <h1>Terms of Use</h1>
        <p className="legal-updated">Effective 16 September 2026</p>

        <h2>Independent decision-support tool</h2>
        <p>FPL Risk is an independent analytics project for Fantasy Premier League managers. It is not affiliated with, endorsed by, sponsored by or an official product of the Premier League.</p>

        <h2>No guarantee of results</h2>
        <p>Projections, recommendations, chip assessments, probabilities and simulations are estimates. Football outcomes, player availability, tactical decisions and official game rules can change. FPL Risk does not guarantee points, rank improvement, financial value or any particular result.</p>

        <h2>Your responsibility</h2>
        <p>You remain responsible for every transfer, captaincy choice, chip use and other decision you make. Check official Fantasy Premier League rules, deadlines and player status before acting on a recommendation.</p>

        <h2>Optional accounts</h2>
        <p>An FPL Risk account is optional. Guest access remains available for the current launch product. If you create an account, you are responsible for keeping your sign-in credentials secure and for providing accurate information. Do not share your FPL Risk password or use another person&apos;s account without permission.</p>
        <p>The account is intended to save lightweight planning preferences such as a public FPL Team ID and default planner settings. It is not an official FPL login and should never be used to submit your official Fantasy Premier League password.</p>

        <h2>Pricing and future paid plans</h2>
        <p>The Free plan currently includes all features shipping in the launch product. Pro and Elite pricing shown in the product are roadmap pricing only. There is no active paid checkout, recurring charge or automatic renewal today. If paid subscriptions are introduced, final features, prices, billing frequency and cancellation terms will be shown before any purchase is completed.</p>

        <h2>Third-party services and intellectual property</h2>
        <p>Fantasy Premier League, Premier League names, club names, competition marks and associated intellectual property belong to their respective owners. FPL Risk does not claim ownership of those third-party rights. Current and historical data may originate from third-party services and remain subject to the rights and terms of their respective owners.</p>

        <h2>Acceptable use</h2>
        <p>Do not attempt to abuse, overload, scrape, reverse-engineer, interfere with or gain unauthorized access to FPL Risk, another user&apos;s account or its infrastructure. Do not use the service to submit unlawful or sensitive data.</p>

        <h2>Availability and product changes</h2>
        <p>The service may be changed, suspended or unavailable without notice, including when an upstream data source is unavailable or changes its interface. We may change the model, planner, account features and roadmap as we test and calibrate the product.</p>

        <h2>Model transparency</h2>
        <p>FPL Risk currently uses an explainable statistical recommendation engine. The in-product Model page describes major inputs, assumptions and known limitations. The word “AI” does not mean the output is certain or human-reviewed.</p>

        {contactEmail && <>
          <h2>Contact</h2>
          <p>Questions about these terms can be sent to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </>}

        <h2>Changes to these terms</h2>
        <p>These terms may be updated as FPL Risk changes. Continued use after a material update means you are using the service under the revised terms.</p>
      </article>
    </main>
  );
}

import Link from "next/link";
import styles from "./PricingPage.module.css";

const included = [
  "Squad import with next-Gameweek and five-Gameweek projections",
  "Transfer comparisons with budget, hits and squad rules",
  "Player research with ranges, fixtures and score breakdowns",
  "Eight-Gameweek planner with Safe, Balanced and Aggressive plans",
  "Chip guidance and squad concentration checks",
  "The Modelbook forecast record",
  "Optional account to save your Team ID and defaults",
];

const roadmap = [
  {
    name: "Pro",
    proposed: "$5 per month",
    features: ["Saved transfer scenarios", "Deadline and player-watch alerts", "Model history comparisons", "CSV exports and saved planner paths"],
  },
  {
    name: "Elite",
    proposed: "$9 per month",
    features: ["Multiple saved FPL teams", "Scenario comparison boards", "Custom watchlists", "Priority data exports"],
  },
];

export default function PricingPage() {
  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Pricing</h1>
          <p className="lead">
            FPL Prism is free during launch. Every feature that exists today is included, no payment is taken, and you don&apos;t need an account.
          </p>
        </div>
      </div>

      <section className={`card ${styles.free}`}>
        <div className="row-between">
          <h2>Free</h2>
          <span className="badge badge-good">Available now</span>
        </div>
        <ul className={styles.list}>
          {included.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="row" style={{ marginTop: 16 }}>
          <Link href="/dashboard" className="btn btn-primary">Open the dashboard</Link>
          <span className="small muted">No sign-up, no card.</span>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Possible paid tiers</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          These are roadmap proposals, not products you can buy. None of these features exist yet, and prices may change or never launch.
          There is no checkout or automatic renewal.
        </p>
        <div className="grid-2" style={{ marginTop: 12 }}>
          {roadmap.map((tier) => (
            <article key={tier.name} className={`card ${styles.roadmap}`}>
              <div className="row-between">
                <h3>{tier.name}</h3>
                <span className="badge">Roadmap</span>
              </div>
              <p className="small muted" style={{ marginTop: 2 }}>Proposed: {tier.proposed}. Not available to buy.</p>
              <ul className={styles.list}>
                {tier.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Questions</h2>
        <dl className={styles.faq}>
          <dt>Do I need to pay?</dt>
          <dd>No. Everything currently in FPL Prism is free.</dd>
          <dt>Do I need an account?</dt>
          <dd>No. An optional account only saves your Team ID, default free transfers and planner style across devices.</dd>
          <dt>What if paid plans launch?</dt>
          <dd>Final features, prices and terms would be shown before anyone could be charged.</dd>
        </dl>
      </section>
    </main>
  );
}

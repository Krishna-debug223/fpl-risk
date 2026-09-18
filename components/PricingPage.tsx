"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./PricingPage.module.css";

type Plan = {
  name: string;
  monthly: number;
  annualMonthly: number;
  annualBill: number;
  description: string;
  features: string[];
  popular?: boolean;
  future?: boolean;
};

const plans: Plan[] = [
  {
    name: "FREE",
    monthly: 0,
    annualMonthly: 0,
    annualBill: 0,
    description: "The complete FPL Risk product during launch.",
    features: [
      "Live player projections and confidence",
      "Transfer Lab + 10,000-path simulations",
      "8-Gameweek Path Planner",
      "Chip planning and Player Market",
      "FPL Modelbook forward-test access",
      "Optional account to save your Team ID and defaults",
    ],
  },
  {
    name: "PRO",
    monthly: 5,
    annualMonthly: 4,
    annualBill: 48,
    description: "For managers who want a deeper weekly workflow.",
    features: [
      "Everything in Free",
      "Unlimited saved transfer scenarios",
      "Deadline and player-watch alerts",
      "Advanced model-history comparisons",
      "CSV exports and saved planner paths",
      "Early access to new decision tools",
    ],
    popular: true,
    future: true,
  },
  {
    name: "ELITE",
    monthly: 9,
    annualMonthly: 7,
    annualBill: 84,
    description: "For power users, creators and multi-team analysis.",
    features: [
      "Everything in Pro",
      "Multiple saved FPL teams",
      "Advanced scenario workspace",
      "Custom watchlists and comparison boards",
      "Priority model/data exports",
      "Priority product support",
    ],
    future: true,
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span>FR</span>
          <div><strong>FPL RISK</strong><small>Decision analytics</small></div>
        </Link>
        <nav>
          <Link href="/planner">8-GW Planner</Link>
          <Link href="/sign-in">Sign in</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>PRICING</p>
        <h1>Use the model.<br />Pay only when we earn it.</h1>
        <p>Every feature currently shipping in FPL Risk stays free during launch. The paid tiers below show where the product can grow once the core model and weekly workflow have earned a subscription.</p>
        <div className={styles.launchNote}><strong>Launch promise:</strong> Free currently includes the full live product. No paid checkout or automatic renewal is active.</div>
      </section>

      <section className={styles.billing} aria-label="Billing frequency">
        <button type="button" className={!annual ? styles.active : ""} onClick={() => setAnnual(false)}>Monthly</button>
        <button type="button" className={annual ? styles.active : ""} onClick={() => setAnnual(true)}>Annual <span>save 20%+</span></button>
      </section>

      <section className={styles.grid}>
        {plans.map((plan) => {
          const price = annual ? plan.annualMonthly : plan.monthly;
          return (
            <article key={plan.name} className={`${styles.card} ${plan.popular ? styles.popular : ""}`}>
              {plan.popular && <div className={styles.popularBadge}>★ MOST POPULAR</div>}
              <div className={styles.cardTop}>
                <span className={styles.planName}>{plan.name}</span>
                {plan.future && <span className={styles.future}>ROADMAP</span>}
              </div>
              <div className={styles.price}>
                <strong>${price}</strong><span>/ month</span>
              </div>
              <small className={styles.billingCopy}>
                {plan.monthly === 0 ? "free during launch" : annual ? `planned · billed $${plan.annualBill}/year` : "planned monthly price"}
              </small>
              <p className={styles.description}>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => <li key={feature}><i>✓</i><span>{feature}</span></li>)}
              </ul>
              <Link className={plan.popular ? styles.primary : styles.secondary} href="/sign-in">
                {plan.future ? "Use everything free for now" : "Start free"}
              </Link>
            </article>
          );
        })}
      </section>

      <section className={styles.faq}>
        <div><span>DO I NEED TO PAY?</span><strong>No.</strong><p>Not for the current product. The projections, Transfer Lab, Monte Carlo, Path Planner, Player Market and Modelbook remain available on Free during launch.</p></div>
        <div><span>DO I NEED AN ACCOUNT?</span><strong>No.</strong><p>You can keep using FPL Risk as a guest. Sign in only if you want your Team ID and planning defaults attached to an account.</p></div>
        <div><span>WHEN WOULD PRO START?</span><strong>Only after notice.</strong><p>If paid subscriptions launch later, the product will show the final feature split and checkout terms before anyone is charged.</p></div>
      </section>
    </main>
  );
}

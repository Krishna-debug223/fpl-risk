import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "FPL Prism — How it works",
  description: "Understand how FPL Prism turns public FPL data into expected points, ranges and risk-aware decisions.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>HOW IT WORKS</span>
        <h1>Make uncertainty useful.</h1>
        <p>FPL Prism is an independent decision-support project. It turns public FPL data into a range of plausible outcomes, then makes the trade-off behind a transfer easier to see.</p>
      </section>
      <section className={styles.grid}>
        <article><span>01 · INPUTS</span><h2>Start with the real context.</h2><p>Fixtures, player availability, minutes, underlying attacking and defensive numbers, ownership and squad rules are combined for the current Gameweek.</p></article>
        <article><span>02 · SIMULATION</span><h2>10,000 possible matches.</h2><p>Each player receives an expected score plus a floor and ceiling. The model keeps the spread visible so a high average cannot hide a fragile pick.</p></article>
        <article><span>03 · DECISION</span><h2>Choose for your situation.</h2><p>Protecting a rank, holding a mini-league lead and chasing from behind call for different levels of variance. The same projections can be read through each lens.</p></article>
        <article><span>04 · AUDIT</span><h2>Every forecast gets a receipt.</h2><p>The public Modelbook freezes deadline snapshots and compares them with official FPL points. You can inspect the average error, the misses and the original values.</p></article>
      </section>
      <section className={styles.about}>
        <div><span className={styles.eyebrow}>WHO&apos;S BEHIND IT</span><h2>An independent project for serious FPL managers.</h2><p>FPL Prism is built to make probabilistic thinking practical for Fantasy Premier League. It has no affiliation with the Premier League and does not promise points or rank gains.</p></div>
        <div className={styles.links}><Link href="/modelbook">Read the public track record →</Link><Link href="/dashboard">Try the live dashboard →</Link></div>
      </section>
      <footer className={styles.footer}>FPL Prism is an independent project and is not affiliated with, endorsed by or sponsored by the Premier League.</footer>
    </main>
  );
}

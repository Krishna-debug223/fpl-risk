import { pageMetadata } from "@/lib/metadata";
import SeoGuidePage from "@/components/SeoGuidePage";

export const metadata = pageMetadata({
  title: "FPL Captain Picks by Risk and Range | FPL Prism",
  description: "Compare FPL captain picks using expected points, floor, ceiling, haul probability and the risk level that fits your rank situation.",
  path: "/fpl-captain-picks",
});

export default function FplCaptainPicksPage() {
  return <SeoGuidePage
    path="/fpl-captain-picks"
    eyebrow="FPL CAPTAIN PICKS"
    title="Choose a captain with the whole range in view."
    intro="The best FPL captain is not always the player with the highest average. FPL Prism compares expected points with the floor, ceiling and probability bands behind each captaincy decision."
    sections={[
      { eyebrow: "MEAN", title: "Start with expected points.", body: "Expected points are the model's average across 10,000 simulated outcomes. They show the central estimate, but they do not show how widely the result can move." },
      { eyebrow: "RANGE", title: "See the safer and riskier paths.", body: "A tight range can suit a manager protecting rank. A wider range can suit a manager chasing. The dashboard shows p10, median and p90 outcomes alongside the average.", bullets: ["Floor: a lower-tail outcome", "Median: the middle simulated result", "Ceiling: an upper-tail outcome"] },
      { eyebrow: "CONTEXT", title: "Match the pick to your situation.", body: "Protect, balanced, chase and mini-league postures use the same projection set but weight uncertainty and differential upside differently. The recommendation is a decision aid, not a guarantee." },
      { eyebrow: "RECEIPTS", title: "Check the record after the deadline.", body: "The public Modelbook preserves deadline snapshots and compares them with official FPL points, including the biggest misses and the model's signed bias." },
    ]}
    faqs={[
      { question: "Does FPL Prism guarantee a captain haul?", answer: "No. FPL points are uncertain. FPL Prism reports a distribution of outcomes and explains the assumptions behind it." },
      { question: "How does FPL Prism compare captain picks?", answer: "It combines expected points, expected minutes, fixture context, player rates and a simulated outcome range, then applies the manager's chosen risk posture." },
      { question: "Where can I see this week's captain projections?", answer: "Open the live dashboard and enter a public FPL Team ID, or use the sample squad to explore the decision desk without an account." },
      { question: "Can I compare a safe captain with a differential?", answer: "Yes. Use the floor, ceiling, haul probability and Sharpe-style score in Player Market, then open the reasoning behind each player." },
    ]}
    related={[{ href: "/fpl-expected-points", label: "FPL expected points explained" }, { href: "/fpl-team-risk", label: "FPL team risk calculator" }, { href: "/modelbook", label: "Read the Modelbook" }]}
  />;
}

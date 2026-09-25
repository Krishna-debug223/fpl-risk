import { pageMetadata } from "@/lib/metadata";
import SeoGuidePage from "@/components/SeoGuidePage";

export const metadata = pageMetadata({
  title: "FPL Team Risk Calculator and Squad Concentration | FPL Prism",
  description: "See FPL squad risk from fixture concentration, club exposure, player volatility and correlated outcomes with FPL Prism's portfolio view.",
  path: "/fpl-team-risk",
});

export default function FplTeamRiskPage() {
  return <SeoGuidePage
    path="/fpl-team-risk"
    eyebrow="FPL TEAM RISK"
    title="Your squad is a portfolio, not fifteen separate picks."
    intro="A squad can look strong player by player and still carry too much exposure to one club, fixture or outcome. FPL Prism makes that concentration visible before the deadline."
    sections={[
      { eyebrow: "EXPOSURE", title: "Find the crowded fixtures.", body: "When several players depend on the same club or match, one result can move a large part of your Gameweek score. The team view groups that exposure so you can see the basket, not just each asset." },
      { eyebrow: "VOLATILITY", title: "Add player ranges together carefully.", body: "Squad variance is not simply the sum of every player's volatility. Shared fixtures and team outcomes can move together, which is why portfolio-level context matters.", bullets: ["Club concentration", "Fixture concentration", "Captain and bench dependence"] },
      { eyebrow: "DECISION", title: "Use risk tolerance as a lens.", body: "Protect rank, balanced, chase rank and mini-league postures can favor different choices from the same projection set. The model keeps the assumptions visible so you remain in control." },
      { eyebrow: "NEXT STEP", title: "Load your team in one step.", body: "Enter the public Team ID from your FPL URL. FPL Prism never asks for your FPL password and can be explored with a sample squad first." },
    ]}
    faqs={[
      { question: "What is FPL squad concentration risk?", answer: "It is the amount of your projected outcome that depends on the same club, fixture or correlated result. Higher concentration can mean a wider team-level range." },
      { question: "Does FPL Prism use my FPL password?", answer: "No. The dashboard reads public FPL data using the numeric Team ID and does not request or store an FPL password." },
      { question: "Can I use the risk view before choosing a transfer?", answer: "Yes. Load your squad in My Team, inspect the current exposure and then compare legal transfers in Transfer Lab." },
      { question: "Is a high-risk squad always bad?", answer: "No. A manager chasing rank may intentionally accept more variance. The goal is to make the trade-off explicit, not to force every manager into the same style." },
    ]}
    related={[{ href: "/dashboard", label: "Open My Team" }, { href: "/fpl-captain-picks", label: "Find captain ranges" }, { href: "/modelbook", label: "Audit the forecasts" }]}
  />;
}

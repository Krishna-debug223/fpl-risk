import { pageMetadata } from "@/lib/metadata";
import SeoGuidePage from "@/components/SeoGuidePage";

export const metadata = pageMetadata({
  title: "FPL Expected Points, Floor and Ceiling Explained | FPL Prism",
  description: "Understand FPL expected points, simulated ranges, haul probability, Sharpe-style scores and confidence without hiding uncertainty behind one number.",
  path: "/fpl-expected-points",
});

export default function FplExpectedPointsPage() {
  return <SeoGuidePage
    path="/fpl-expected-points"
    eyebrow="FPL EXPECTED POINTS"
    title="An average is useful. The range is the decision."
    intro="FPL expected points are a starting point, not a promise. FPL Prism puts the expected score beside the likely floor, median, ceiling and outcome bands so managers can see the trade-off."
    sections={[
      { eyebrow: "EXPECTED", title: "What xPts means.", body: "Expected points are the mean of the model's simulated outcomes for a player over a selected Gameweek horizon. The model uses expected minutes, player rates, team strength and fixture context." },
      { eyebrow: "DISTRIBUTION", title: "Why two players with similar xPts differ.", body: "Two players can average the same score while one has a much wider spread. The p10, median and p90 values show whether the average comes from a stable role or a boom-or-bust path.", bullets: ["Bust probability: 0–2 points", "Middle bands: 3–5 and 6–9 points", "Haul probability: 10+ points"] },
      { eyebrow: "RISK", title: "Sharpe-style scores add context.", body: "The Sharpe-style score compares expected points with simulated volatility. It can highlight a steadier pick when raw xPts alone would favor a more variable player." },
      { eyebrow: "VALIDATION", title: "Forecasts are checked against results.", body: "The Modelbook archives frozen Gameweek projections and official FPL points. It reports mean absolute error, RMSE, signed bias and the share of active players within two points." },
    ]}
    faqs={[
      { question: "Are FPL expected points the same as actual points?", answer: "No. Expected points are a forecast before the matches. Actual points are only known after the fixtures are played." },
      { question: "What are p10 and p90 in FPL projections?", answer: "They are the 10th and 90th percentile outcomes in the simulation. Roughly speaking, most simulated results fall between them, although no range is a guarantee." },
      { question: "Why can a low-xPts player still be useful?", answer: "A player with a tighter range, strong minutes confidence or a better squad fit can be preferable to a higher-xPts player with more downside or concentration risk." },
      { question: "Where does the FPL Prism data come from?", answer: "The model uses public FPL player, fixture and event feeds, with historical player priors and transparent validation in the Modelbook." },
    ]}
    related={[{ href: "/dashboard", label: "See live projections" }, { href: "/fpl-transfer-planner", label: "Compare transfers" }, { href: "/how-it-works", label: "How the model works" }]}
  />;
}

import { pageMetadata } from "@/lib/metadata";
import SeoGuidePage from "@/components/SeoGuidePage";

export const metadata = pageMetadata({
  title: "FPL Transfer Planner with Risk and Expected Points | FPL Prism",
  description: "Compare FPL transfers by expected gain, chance to beat holding, downside, legal squad rules and the range of outcomes across the next Gameweek.",
  path: "/fpl-transfer-planner",
});

export default function FplTransferPlannerPage() {
  return <SeoGuidePage
    path="/fpl-transfer-planner"
    eyebrow="FPL TRANSFER PLANNER"
    title="Compare the move before you spend the transfer."
    intro="FPL Prism compares a transfer with holding, accounts for hits and checks the whole squad rather than ranking isolated players."
    sections={[
      { eyebrow: "LEGALITY", title: "Start with a move you can actually make.", body: "Every recommendation is filtered through budget, position, free transfers, the three-player club limit, availability and squad structure before it reaches the shortlist." },
      { eyebrow: "VALUE", title: "Measure the edge over holding.", body: "A transfer is scored against your current player. You can see expected gain, the probability of beating hold and the cost of a points hit instead of relying on a single headline number.", bullets: ["Expected gain after any hit", "Chance the move beats holding", "Downside and simulated range"] },
      { eyebrow: "PORTFOLIO", title: "Look for concentration risk.", body: "A move can improve one player while making the squad more dependent on one club or fixture. FPL Prism surfaces that trade-off so the decision is made at squad level." },
      { eyebrow: "WORKFLOW", title: "Use the planner for the next decision.", body: "Load your public Team ID, select an outgoing player and compare the legal replacements. Open any recommendation to inspect the player-level reasoning and fixture context." },
    ]}
    faqs={[
      { question: "Does the FPL transfer planner include a -4 hit?", answer: "Yes. If you have no free transfer available, the transfer comparison subtracts the points hit from the expected edge and shows whether the move still has a positive case." },
      { question: "Does it check the three-player club rule?", answer: "Yes. Candidate transfers are filtered against the rest of the squad, budget, position and club limit before recommendations are shown." },
      { question: "Can I use the planner without signing in?", answer: "Yes. A public FPL Team ID is enough. You can also try the sample squad from the homepage without an account." },
      { question: "How far ahead does the planner look?", answer: "Transfer Lab focuses on the next Gameweek. The separate 8-GW Planner compares roll and transfer paths across the longer horizon." },
    ]}
    related={[{ href: "/planner", label: "Open the 8-GW Planner" }, { href: "/fpl-captain-picks", label: "Compare captain picks" }, { href: "/modelbook", label: "Read the model record" }]}
  />;
}

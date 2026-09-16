import type { Metadata } from "next";
import StrategyPlanner from "@/components/StrategyPlanner";

export const metadata: Metadata = {
  title: "8-GW Path Planner",
  description:
    "Plan FPL transfers across the next eight Gameweeks with roll decisions, banked free transfers, legal two-transfer packages and risk-aware strategy modes powered by the FPL Risk model.",
  alternates: { canonical: "/planner" },
};

export default function PlannerPage() {
  return <StrategyPlanner />;
}

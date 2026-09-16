import type { Metadata } from "next";
import DashboardHomeNav from "@/components/DashboardHomeNav";
import DashboardUiPolish from "@/components/DashboardUiPolish";
import LiveRefreshV12 from "@/components/LiveRefreshV12";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "FPL Risk projections, transfer analysis, simulations and planning tools.",
  alternates: { canonical: "/dashboard" },
};

export default function DashboardPage() {
  return (
    <>
      <DashboardUiPolish />
      <DashboardHomeNav />
      <LiveRefreshV12 />
    </>
  );
}

import type { Metadata } from "next";
import PricingPage from "@/components/PricingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description: "FPL Risk launch pricing. Every current product feature remains included in the Free plan during launch.",
  alternates: { canonical: "/pricing" },
};

export default function PricingRoute() {
  return <PricingPage />;
}

import PricingPage from "@/components/PricingPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "FPL Prism — Pricing",
  description: "FPL Prism is free during launch. Possible paid tiers are shown as roadmap proposals and cannot be bought.",
  path: "/pricing",
});

export default function PricingRoute() {
  return <PricingPage />;
}

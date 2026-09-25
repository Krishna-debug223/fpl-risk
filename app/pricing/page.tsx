import PricingPage from "@/components/PricingPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "FPL Prism — Launch access",
  description: "Every current FPL Prism feature remains included in the Free plan during launch. Future paid tiers are clearly marked as roadmap plans.",
  path: "/pricing",
});

export default function PricingRoute() {
  return <PricingPage />;
}

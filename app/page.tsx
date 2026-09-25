import LandingPage from "@/components/LandingPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "FPL Prism — Risk-aware FPL decisions",
  description: "See the expected points, range and risk behind every Fantasy Premier League transfer, captain and squad decision.",
  path: "/",
});

export default function Home() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "FPL Prism",
    url: "https://fplprism.com",
    description: "Risk-aware Fantasy Premier League decision analytics with expected points, outcome ranges and legal transfer comparisons.",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <LandingPage />
  </>;
}

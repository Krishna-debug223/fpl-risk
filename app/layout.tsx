import type { Metadata } from "next";
import SiteAnalytics from "@/components/SiteAnalytics";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "./frontdesks-ui-fixes.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FPL Risk — Fantasy Premier League Decision Analytics",
    template: "%s · FPL Risk",
  },
  description: "Analyze your FPL squad, compare legal transfers and quantify expected upside, downside and uncertainty with an explainable risk model.",
  applicationName: "FPL Risk",
  keywords: ["FPL", "Fantasy Premier League", "FPL transfers", "FPL analytics", "FPL AI", "FPL planner"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FPL Risk",
    title: "FPL Risk — Know the risk behind every move",
    description: "Import your FPL squad, get a model-driven team assessment and simulate the risk behind your next transfer.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FPL Risk — Know the risk behind every move",
    description: "Model-driven FPL transfer recommendations with explainable risk and Monte Carlo simulation.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteAnalytics from "@/components/SiteAnalytics";
import FplVisualEnhancer from "@/components/FplVisualEnhancer";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "./frontdesks-ui-fixes.css";
import "./geist-typography.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <FplVisualEnhancer />
        <SiteAnalytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import SiteAnalytics from "@/components/SiteAnalytics";
import FplVisualEnhancer from "@/components/FplVisualEnhancer";
import PlannerShortcut from "@/components/PlannerShortcut";
import SiteHeader from "@/components/SiteHeader";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "./frontdesks-ui-fixes.css";
import "./geist-typography.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FPL Prism — Fantasy Premier League Decision Analytics",
    template: "%s · FPL Prism",
  },
  description: "Analyze your FPL squad, compare legal transfers and quantify expected upside, downside and uncertainty with an explainable risk model.",
  applicationName: "FPL Prism",
  keywords: ["FPL", "Fantasy Premier League", "FPL transfers", "FPL analytics", "FPL AI", "FPL planner"],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: ["/favicon.png"],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FPL Prism",
    title: "FPL Prism — Know the risk behind every move",
    description: "Import your FPL squad, get a model-driven team assessment and simulate the risk behind your next transfer.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FPL Prism — Know the risk behind every move",
    description: "Model-driven FPL transfer recommendations with explainable risk and Monte Carlo simulation.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <PlannerShortcut />
        <FplVisualEnhancer />
        <SiteAnalytics />
      </body>
    </html>
  );
}

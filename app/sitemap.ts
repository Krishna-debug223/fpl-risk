import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/dashboard`, lastModified, changeFrequency: "daily", priority: 0.95 },
    { url: `${siteUrl}/planner`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/modelbook`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/modelbook/reports/gw5`, lastModified, changeFrequency: "monthly", priority: 0.85 },
    { url: `${siteUrl}/modelbook/reports/gw4`, lastModified, changeFrequency: "monthly", priority: 0.75 },
    { url: `${siteUrl}/modelbook/reports/gw3`, lastModified, changeFrequency: "monthly", priority: 0.75 },
    { url: `${siteUrl}/how-it-works`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/fpl-captain-picks`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/fpl-transfer-planner`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/fpl-expected-points`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/fpl-team-risk`, lastModified, changeFrequency: "monthly", priority: 0.75 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}

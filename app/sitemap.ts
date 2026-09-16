import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/planner`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}

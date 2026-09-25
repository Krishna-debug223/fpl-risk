import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

/** Shared page-level metadata keeps canonical, Open Graph and Twitter URLs on fplprism.com. */
export function pageMetadata({ title, description, path, noindex = false }: PageMetadataOptions): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = new URL(path, siteUrl).toString();
  const image = new URL(`/opengraph-image?section=${encodeURIComponent(path.replace(/^\//, "") || "home")}`, siteUrl).toString();

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "FPL Prism",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

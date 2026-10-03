import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FPL Prism",
    short_name: "FPL Prism",
    description: "Fantasy Premier League squad analysis, transfer comparisons and expected-points forecasts.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#14181d",
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}

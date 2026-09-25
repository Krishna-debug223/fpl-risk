import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FPL Prism",
    short_name: "FPL Prism",
    description: "Explainable Fantasy Premier League decision analytics and transfer risk simulation.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3f7",
    theme_color: "#37003c",
    icons: [
      { src: "/favicon.png", sizes: "64x64", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}

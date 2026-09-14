import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FPL Risk",
    short_name: "FPL Risk",
    description: "Explainable Fantasy Premier League decision analytics and transfer risk simulation.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3f7",
    theme_color: "#37003c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}

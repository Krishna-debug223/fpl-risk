import ModelbookLive from "@/components/modelbook/ModelbookLive";
import { CURRENT_GAMEWEEK } from "@/lib/modelbook";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: `FPL Prism Modelbook — GW${CURRENT_GAMEWEEK} forecasts and track record`,
  description: "Public FPL Prism forecasts for the next Gameweek, frozen at the deadline and scored against official FPL points.",
  path: "/modelbook",
});

export default function ModelbookPage() {
  return <ModelbookLive />;
}

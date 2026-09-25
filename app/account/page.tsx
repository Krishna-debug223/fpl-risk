import { redirect } from "next/navigation";
import AccountPanel from "@/components/AccountPanel";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "FPL Prism — Your account",
  description: "Manage the Team ID and planning defaults saved to your optional FPL Prism account.",
  path: "/account",
  noindex: true,
});

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const metadata = user.user_metadata ?? {};
  const strategyMode = ["safe", "balanced", "aggressive"].includes(metadata.strategy_mode)
    ? metadata.strategy_mode as "safe" | "balanced" | "aggressive"
    : "balanced";
  const freeTransfers = Number.isFinite(Number(metadata.default_free_transfers))
    ? Math.min(5, Math.max(0, Number(metadata.default_free_transfers)))
    : 1;

  return (
    <AccountPanel
      email={user.email ?? "Signed-in user"}
      initialTeamId={typeof metadata.fpl_team_id === "string" ? metadata.fpl_team_id : ""}
      initialFreeTransfers={freeTransfers}
      initialStrategyMode={strategyMode}
    />
  );
}

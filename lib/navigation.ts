export const dashboardViews = [
  { view: "overview", label: "Overview" },
  { view: "team", label: "My Team" },
  { view: "transfer", label: "Transfers" },
  { view: "market", label: "Players" },
] as const;

export type DashboardView = typeof dashboardViews[number]["view"] | "model";

export function dashboardView(search: string): DashboardView {
  const view = new URLSearchParams(search).get("view");
  return view === "team" || view === "transfer" || view === "market" || view === "model"
    ? view : "overview";
}

// Change only the view: imported team and sample context stay in the URL.
export function dashboardHref(view: DashboardView, search = ""): string {
  const params = new URLSearchParams(search);
  if (view === "overview") params.delete("view");
  else params.set("view", view);
  const query = params.toString();
  return `/dashboard${query ? `?${query}` : ""}`;
}

export const guideLinks = [
  { href: "/fpl-expected-points", label: "Expected points and ranges" },
  { href: "/fpl-captain-picks", label: "Choosing a captain" },
  { href: "/fpl-transfer-planner", label: "Transfers, hits and rolling" },
  { href: "/fpl-team-risk", label: "Squad concentration risk" },
];

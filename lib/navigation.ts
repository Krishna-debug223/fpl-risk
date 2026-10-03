export const dashboardViews = [
  { view: "overview", label: "Overview" },
  { view: "team", label: "My team" },
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

/**
 * Switch dashboard views in place. The dashboard reads its view from the URL,
 * and a native pushState updates useSearchParams without a server round trip,
 * so the new view appears immediately instead of after a reload of the page.
 */
export function showDashboardView(href: string, scrollToTop = true) {
  window.history.pushState(null, "", href);
  if (scrollToTop && window.scrollY > 0) window.scrollTo({ top: 0 });
}

/** True for an ordinary left click that should be handled in-page. */
export function isPlainClick(event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export const guideLinks = [
  { href: "/fpl-expected-points", label: "Expected points and ranges" },
  { href: "/fpl-captain-picks", label: "Choosing a captain" },
  { href: "/fpl-transfer-planner", label: "Transfers, hits and rolling" },
  { href: "/fpl-team-risk", label: "Squad concentration risk" },
];

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { dashboardHref, dashboardView, dashboardViews } from "@/lib/navigation";
import BrandMark from "./BrandMark";
import styles from "./SiteHeader.module.css";

const guideLinks = [
  { href: "/how-it-works", label: "Getting started" },
  { href: "/fpl-expected-points", label: "Expected points guide" },
  { href: "/fpl-captain-picks", label: "Captain selection guide" },
  { href: "/fpl-transfer-planner", label: "Transfer planning guide" },
  { href: "/fpl-team-risk", label: "Team risk guide" },
];

function HeaderContent({ search = "" }: { search?: string }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [rememberedTeam, setRememberedTeam] = useState("");
  const isDashboard = pathname === "/dashboard";
  const view = dashboardView(search);
  const dashboardSearch = isDashboard ? search : rememberedTeam ? `team=${rememberedTeam}` : "";
  const toolLinks = [
    ...dashboardViews.map(({ view, label }) => ({ href: dashboardHref(view, dashboardSearch), label, active: isDashboard && dashboardView(search) === view })),
    { href: "/planner", label: "8-GW Planner", active: pathname === "/planner" },
  ];
  const modelLinks = [
    { href: dashboardHref("model", dashboardSearch), label: "Model details", active: isDashboard && view === "model" },
    { href: "/modelbook", label: "Modelbook & results", active: pathname.startsWith("/modelbook") },
  ];
  const currentLabel = toolLinks.find((link) => link.active)?.label
    ?? modelLinks.find((link) => link.active)?.label
    ?? guideLinks.find((link) => link.href === pathname)?.label
    ?? (pathname === "/" ? "Home" : pathname === "/account" ? "Account" : pathname === "/sign-in" ? "Sign in" : "FPL Prism");

  const closeMenus = () => {
    headerRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => { menu.open = false; });
  };

  useEffect(() => {
    const saved = window.localStorage.getItem("fpl-risk-team-id") ?? "";
    setRememberedTeam(/^\d+$/.test(saved) ? saved : "");
  }, [pathname]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.contains(event.target)) closeMenus();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Close a nested disclosure first, keeping the mobile menu available.
      const menus = Array.from(header.querySelectorAll<HTMLDetailsElement>("details[open]"));
      const menu = menus.at(-1);
      if (menu) {
        event.preventDefault();
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    };
    const focusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) closeMenus();
    };
    const toggle = (event: Event) => {
      const opened = event.target;
      if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;
      // One dropdown at a time, without closing its containing mobile menu.
      header.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
        if (menu !== opened && !menu.contains(opened)) menu.open = false;
      });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    header.addEventListener("focusout", focusOut);
    header.addEventListener("toggle", toggle, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      header.removeEventListener("focusout", focusOut);
      header.removeEventListener("toggle", toggle, true);
    };
  }, []);

  const dropdowns = [
    { label: "Guides", links: guideLinks.map((link) => ({ ...link, active: pathname === link.href })) },
    { label: "Our model", links: modelLinks },
  ];

  return (
    <header className={styles.shell} ref={headerRef}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <div className={styles.masthead}>
        <Link href="/" className={styles.brand} aria-label="FPL Prism home" onClick={closeMenus}>
          <BrandMark className={styles.mark} />
          <span><strong>FPL PRISM</strong><small>Fantasy Premier League analytics</small></span>
        </Link>
        <nav className={styles.utilities} aria-label="Account and site information">
          <Link href="/how-it-works" onClick={closeMenus}>How it works</Link>
          <Link href="/pricing" onClick={closeMenus}>Pricing</Link>
          <Link href="/account" onClick={closeMenus}>Account</Link>
          <Link href="/sign-in" className={styles.signIn} onClick={closeMenus}>Sign in</Link>
        </nav>
        <details className={styles.mobileMenu}>
          <summary><span>Menu</span><span className={styles.chevron} aria-hidden="true" /></summary>
          <nav className={styles.mobilePanel} aria-label="Mobile site navigation">
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined} onClick={closeMenus}>Home</Link>
            {toolLinks.map((link) => (
              <Link key={link.label} href={link.href} aria-current={link.active ? "page" : undefined} onClick={closeMenus}>{link.label}</Link>
            ))}
            {dropdowns.map((group) => (
              <details className={styles.mobileGroup} key={group.label}>
                <summary>{group.label}<span className={styles.chevron} aria-hidden="true" /></summary>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} aria-current={link.active ? "page" : undefined} onClick={closeMenus}>{link.label}</Link>
                ))}
              </details>
            ))}
            <div className={styles.mobileUtilities}>
              <Link href="/pricing" onClick={closeMenus}>Pricing</Link>
              <Link href="/account" onClick={closeMenus}>Account</Link>
              <Link href="/sign-in" onClick={closeMenus}>Sign in</Link>
              <Link href="/privacy" onClick={closeMenus}>Privacy</Link>
              <Link href="/terms" onClick={closeMenus}>Terms</Link>
            </div>
          </nav>
        </details>
      </div>
      <div className={styles.navigationRow}>
        <nav className={styles.primaryNav} aria-label="Main navigation">
          {toolLinks.map((link) => (
            <Link key={link.label} href={link.href} aria-current={link.active ? "page" : undefined} onClick={closeMenus}>{link.label}</Link>
          ))}
          {dropdowns.map((group) => (
            <details className={styles.dropdown} key={group.label}>
              <summary className={group.links.some((link) => link.active) ? styles.activeGroup : undefined}>
                {group.label}<span className={styles.chevron} aria-hidden="true" />
              </summary>
              <div className={styles.dropdownPanel}>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} aria-current={link.active ? "page" : undefined} onClick={closeMenus}>{link.label}</Link>
                ))}
              </div>
            </details>
          ))}
        </nav>
        <div className={styles.mobileLocation}>You are in: <strong>{currentLabel}</strong></div>
      </div>
    </header>
  );
}

function SearchAwareHeader() {
  const searchParams = useSearchParams();
  return <HeaderContent search={searchParams.toString()} />;
}

export default function SiteHeader() {
  return <Suspense fallback={<HeaderContent />}><SearchAwareHeader /></Suspense>;
}

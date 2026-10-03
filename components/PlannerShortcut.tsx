"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PlannerShortcut.module.css";

export default function PlannerShortcut() {
  const pathname = usePathname();
  const isPlanner = pathname.startsWith("/planner");
  const isStandalone = pathname === "/" || pathname.startsWith("/dashboard") || ["/pricing", "/sign-in", "/reset-password", "/account", "/privacy", "/terms"].some((path) => pathname.startsWith(path));
  if (isStandalone) return null;

  return (
    <div className={styles.dock}>
      <div className={styles.launchLinks}>
        <Link href="/pricing">Pricing</Link>
        <Link href="/sign-in">Sign in</Link>
      </div>
      {!isPlanner && (
        <div className={styles.shortcut}>
          <Link href="/planner" className={styles.plannerLink}>
            <span>Plan 8 gameweeks</span>
            <span aria-hidden="true" className={styles.arrow}>↗</span>
          </Link>
        </div>
      )}
    </div>
  );
}

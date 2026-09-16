"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PlannerShortcut.module.css";

export default function PlannerShortcut() {
  const pathname = usePathname();
  if (pathname.startsWith("/planner")) return null;

  return (
    <Link className={styles.shortcut} href="/planner" aria-label="Open the 8-Gameweek Path Planner">
      <span>8-GW</span>
      <strong>Path Planner</strong>
      <i>→</i>
    </Link>
  );
}

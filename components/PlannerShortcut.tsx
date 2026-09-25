"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MetallicButton from "./ui/metallic-button";
import styles from "./PlannerShortcut.module.css";

export default function PlannerShortcut() {
  const pathname = usePathname();
  const router = useRouter();
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
          <MetallicButton
            label="8-GW Path Planner"
            compact
            baseColor="#37003c"
            sheenColor="#f7f1ff"
            accentColor="#00ff87"
            onClick={() => router.push("/planner")}
          />
        </div>
      )}
    </div>
  );
}

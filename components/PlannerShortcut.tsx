"use client";

import { usePathname, useRouter } from "next/navigation";
import MetallicButton from "./ui/metallic-button";
import styles from "./PlannerShortcut.module.css";

export default function PlannerShortcut() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname.startsWith("/planner")) return null;

  return (
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
  );
}

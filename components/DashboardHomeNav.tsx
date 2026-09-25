import Link from "next/link";
import BrandMark from "./BrandMark";
import styles from "./DashboardHomeNav.module.css";

export default function DashboardHomeNav() {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <Link href="/dashboard" className={styles.home} aria-label="FPL Prism home dashboard">
          <BrandMark className={styles.mark} />
          <span className={styles.homeCopy}>
            <strong>FPL PRISM</strong>
            <small>Home</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="FPL Prism site navigation">
          <Link href="/dashboard" className={styles.active}>Dashboard</Link>
          <Link href="/planner">8-GW Planner</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/modelbook">Modelbook</Link>
          <Link href="/account">Account</Link>
        </nav>

        <div className={styles.actions}>
          <Link href="/privacy" className={styles.utility}>Privacy</Link>
          <Link href="/terms" className={styles.utility}>Terms</Link>
          <Link href="/sign-in" className={styles.signIn}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

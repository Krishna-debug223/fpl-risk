import Link from "next/link";
import BrandMark from "./BrandMark";
import styles from "./DashboardHomeNav.module.css";

const LEDGER_URL = "https://fpl-ledger-azure.vercel.app/";

export default function DashboardHomeNav() {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <Link href="/dashboard" className={styles.home} aria-label="FPL Risk home dashboard">
          <BrandMark className={styles.mark} />
          <span className={styles.homeCopy}>
            <strong>FPL RISK</strong>
            <small>Home</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="FPL Risk site navigation">
          <Link href="/dashboard" className={styles.active}>Dashboard</Link>
          <Link href="/planner">8-GW Planner</Link>
          <Link href="/pricing">Pricing</Link>
          <a href={LEDGER_URL} target="_blank" rel="noreferrer">Ledger ↗</a>
          <Link href="/account">Account</Link>
        </nav>

        <div className={styles.actions}>
          <Link href="/privacy" className={styles.utility}>Privacy</Link>
          <Link href="/terms" className={styles.utility}>Terms</Link>
          <Link href="/" className={styles.signIn}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import BrandMark from "./BrandMark";
import styles from "./SiteHeader.module.css";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/planner", label: "8-GW Planner" },
  { href: "/modelbook", label: "Modelbook" },
  { href: "/how-it-works", label: "How it works" },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const currentLabel = primaryLinks.find((link) => isCurrent(pathname, link.href))?.label ?? "Home";

  return (
    <header className={styles.shell}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label="FPL Prism home">
          <BrandMark className={styles.mark} />
          <span>
            <strong>FPL PRISM</strong>
            <small>Decision analytics</small>
          </span>
        </Link>

        <nav className={styles.desktopNav} aria-label="FPL Prism site navigation">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isCurrent(pathname, link.href) ? styles.active : undefined}
              aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.desktopActions}>
          <Link href="/account" className={isCurrent(pathname, "/account") ? styles.activeUtility : styles.utility}>Account</Link>
          <Link href="/sign-in" className={styles.signIn}>Sign in</Link>
        </div>

        <details className={styles.mobileMenu}>
          <summary aria-label="Open site menu">
            <span>{currentLabel}</span>
            <i aria-hidden="true" />
          </summary>
          <nav aria-label="FPL Prism mobile navigation">
            <Link href="/">Home</Link>
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/account">Account</Link>
            <Link href="/sign-in">Sign in</Link>
            <div className={styles.mobileLegal}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}

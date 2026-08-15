"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { GUIDE_NAV } from "@/lib/quilting/data";

import styles from "./quilt-guide.module.css";

export function GuideNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.guideNav} aria-label="Quilt field guide chapters">
      <div className={styles.guideNavScroller}>
        {GUIDE_NAV.map((item, index) => {
          const isHome = item.href === "/app/quilt-guide";
          const active = isHome
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.guideNavLink} ${active ? styles.guideNavLinkActive : ""}`}
              aria-current={active ? "page" : undefined}
              title={item.description}
            >
              <span>{String(index).padStart(2, "0")}</span>
              <b className={styles.guideNavLong}>{item.label}</b>
              <b className={styles.guideNavShort}>{item.shortLabel}</b>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PrintGuideButton() {
  return (
    <button type="button" className={styles.headerAction} onClick={() => window.print()}>
      Print this page
      <span aria-hidden="true">↗</span>
    </button>
  );
}

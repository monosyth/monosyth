"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "@/app/weather/weather.module.css";
import { WeatherPendingOverlay } from "@/components/weather/pending-overlay";
import type { WeatherDashboardView } from "@/lib/weather/ambient";

type WeatherDocumentTab =
  | "dashboard"
  | "summaries"
  | "radar"
  | "cameras"
  | "graphs"
  | "about";

type SummaryTab = {
  label: string;
  view: WeatherDashboardView;
};

type DocumentTab = {
  label: string;
  tab: WeatherDocumentTab;
};

type WeatherPageTabsProps = {
  summaryTabs: readonly SummaryTab[];
  documentTabs: readonly DocumentTab[];
  activeView: WeatherDashboardView;
  activeDocumentTab: WeatherDocumentTab;
};

function buildWeatherHref(
  view: WeatherDashboardView,
  tab: WeatherDocumentTab = "dashboard",
) {
  const params = new URLSearchParams();

  if (view !== "current") {
    params.set("view", view);
  }

  if (tab !== "dashboard") {
    params.set("tab", tab);
  }

  const query = params.toString();
  return query ? `/weather?${query}` : "/weather";
}

export function WeatherPageTabs({
  summaryTabs,
  documentTabs,
  activeView,
  activeDocumentTab,
}: WeatherPageTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isManuallyPending, setIsManuallyPending] = useState(false);
  const [optimisticView, setOptimisticView] =
    useState<WeatherDashboardView>(activeView);
  const [optimisticDocumentTab, setOptimisticDocumentTab] =
    useState<WeatherDocumentTab>(activeDocumentTab);

  useEffect(() => {
    setOptimisticView(activeView);
  }, [activeView]);

  useEffect(() => {
    setOptimisticDocumentTab(activeDocumentTab);
  }, [activeDocumentTab]);

  useEffect(() => {
    setIsManuallyPending(false);
  }, [activeView, activeDocumentTab]);

  const prefetchHrefs = useMemo(() => {
    const hrefs = new Set<string>();

    for (const summaryTab of summaryTabs) {
      for (const documentTab of documentTabs) {
        hrefs.add(buildWeatherHref(summaryTab.view, documentTab.tab));
      }
    }

    return Array.from(hrefs);
  }, [documentTabs, summaryTabs]);

  useEffect(() => {
    for (const href of prefetchHrefs) {
      router.prefetch(href);
    }
  }, [prefetchHrefs, router]);

  function navigate(
    nextView: WeatherDashboardView,
    nextDocumentTab: WeatherDocumentTab,
  ) {
    const href = buildWeatherHref(nextView, nextDocumentTab);

    setOptimisticView(nextView);
    setOptimisticDocumentTab(nextDocumentTab);

    if (
      nextView === activeView &&
      nextDocumentTab === activeDocumentTab
    ) {
      return;
    }

    setIsManuallyPending(true);

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  const isLoading = isPending || isManuallyPending;
  const activeSummaryLabel =
    summaryTabs.find((tab) => tab.view === optimisticView)?.label ?? "Current";
  const activeDocumentLabel =
    documentTabs.find((tab) => tab.tab === optimisticDocumentTab)?.label ?? "Dashboard";
  const loadingMessage = `Loading ${activeSummaryLabel} ${activeDocumentLabel}`;

  return (
    <div className={styles.tabShell}>
      <div
        className={styles.tabInner}
        aria-busy={isLoading}
      >
        <div className={styles.primaryTabs}>
          {summaryTabs.map((tab) => {
            const isActive = tab.view === optimisticView;
            const isPendingTab = isLoading && isActive;

            return (
              <button
                key={tab.view}
                type="button"
                aria-pressed={isActive}
                className={`${styles.primaryTab} ${
                  isActive ? styles.primaryTabActive : styles.primaryTabInactive
                } ${isPendingTab ? styles.tabPending : ""}`}
                onPointerDown={() => {
                  setOptimisticView(tab.view);
                }}
                onClick={() => {
                  navigate(tab.view, optimisticDocumentTab);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className={styles.secondaryTabs}>
          {documentTabs.map((tab) => {
            const isActive = tab.tab === optimisticDocumentTab;
            const isPendingTab = isLoading && isActive;

            return (
              <button
                key={tab.tab}
                type="button"
                aria-pressed={isActive}
                className={`${styles.secondaryTab} ${
                  isActive
                    ? styles.secondaryTabActive
                    : styles.secondaryTabInactive
                } ${isPendingTab ? styles.tabPending : ""}`}
                onPointerDown={() => {
                  setOptimisticDocumentTab(tab.tab);
                }}
                onClick={() => {
                  navigate(optimisticView, tab.tab);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div
            className={`${styles.tabStatusRow} ${styles.tabStatusRowVisible}`}
            aria-live="polite"
          >
            <div className={styles.tabStatusBadge}>
              <span className={styles.tabStatusDot} aria-hidden="true" />
              <span>{loadingMessage}</span>
            </div>
            <div className={styles.tabStatusTrack} aria-hidden="true">
              <span className={styles.tabStatusBar} />
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <WeatherPendingOverlay
            title={loadingMessage}
            detail="Refreshing station panels, charts, and archive data."
          />
        ) : null}
      </div>
    </div>
  );
}

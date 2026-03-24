"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "@/app/weather/weather.module.css";
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

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  return (
    <div className={styles.tabShell}>
      <div
        className={styles.tabInner}
        aria-busy={isPending}
      >
        <div className={styles.primaryTabs}>
          {summaryTabs.map((tab) => {
            const isActive = tab.view === optimisticView;
            const isPendingTab = isPending && isActive;

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
            const isPendingTab = isPending && isActive;

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
      </div>
    </div>
  );
}

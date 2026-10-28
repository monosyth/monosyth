"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

import { analyticsReferrer, isPublicAnalyticsPath } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function PublicAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const initialized = useRef(false);
  const previousPage = useRef<string | null>(null);
  const eligible = isPublicAnalyticsPath(pathname) && /^G-[A-Z0-9]+$/.test(measurementId);

  // A loaded Google tag survives client navigation. Pause it before effects on
  // private routes, including automatic engagement events from an earlier page.
  useLayoutEffect(() => {
    const target = window;
    const hostAllowed = ["monosyth.com", "www.monosyth.com"].includes(window.location.hostname);
    target[`ga-disable-${measurementId}`] = !eligible || !hostAllowed;
    return () => { target[`ga-disable-${measurementId}`] = true; };
  }, [eligible, measurementId, pathname]);

  useEffect(() => {
    const target = window;
    if (!eligible || target[`ga-disable-${measurementId}`]) {
      previousPage.current = null;
      return;
    }
    const pageLocation = window.location.origin + pathname;
    if (previousPage.current === pageLocation) return;

    target.dataLayer ??= [];
    target.gtag ??= function () {
      // gtag.js distinguishes its Arguments command queue from data-layer arrays.
      // eslint-disable-next-line prefer-rest-params
      target.dataLayer!.push(arguments);
    };
    const pageReferrer = previousPage.current ?? analyticsReferrer(document.referrer);
    if (!initialized.current) {
      target.gtag("js", new Date());
      target.gtag("config", measurementId, {
        send_page_view: false,
        page_location: pageLocation,
        page_referrer: pageReferrer,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      initialized.current = true;
    }
    // Next can stream a route's title after navigation. Wait for it so the
    // page report doesn't receive an empty title from an otherwise valid view.
    let sent = false;
    const sendView = () => {
      if (sent || target[`ga-disable-${measurementId}`]) return;
      sent = true;
      // Pathname views exclude URL queries, fragments, form values and tokens.
      target.gtag!("set", { page_location: pageLocation, page_referrer: pageReferrer });
      target.gtag!("event", "page_view", {
        send_to: measurementId,
        page_location: pageLocation,
        page_referrer: pageReferrer,
        page_title: document.title.trim() || "Monosyth",
      });
      previousPage.current = pageLocation;
    };
    if (document.title.trim()) {
      sendView();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.title.trim()) {
        sendView();
        observer.disconnect();
      }
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    const timeout = window.setTimeout(sendView, 1500);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [eligible, measurementId, pathname]);

  if (!eligible) return null;
  return <Script id="monosyth-google-tag"
    src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
    strategy="afterInteractive" />;
}

"use client";

import { useState } from "react";

import type { WeatherCamera } from "@/lib/weather/cameras";
import styles from "@/components/weather/camera-grid.module.css";

export function WeatherCameraGrid({
  items,
}: {
  items: ReadonlyArray<WeatherCamera>;
}) {
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  return (
    <div className={styles.grid}>
      {items.map((item) => {
        const hasFailed = failedIds[item.id] ?? false;

        return (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className={styles.card}
          >
            {!hasFailed ? (
              <div className={styles.preview}>
                {/* Live traffic snapshots come from external camera feeds, so a plain img avoids optimizer rewrites. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={`${item.label} current traffic camera view`}
                  loading="lazy"
                  className={styles.image}
                  onError={() =>
                    setFailedIds((current) => ({
                      ...current,
                      [item.id]: true,
                    }))
                  }
                />
              </div>
            ) : (
              <div className={styles.fallback}>
                <div>
                  <p className={styles.fallbackEyebrow}>
                    Live preview unavailable
                  </p>
                  <p className={styles.fallbackText}>
                    Open the camera page for the current image.
                  </p>
                </div>
                <span className={styles.fallbackCta}>
                  Open camera
                </span>
              </div>
            )}
            <div className={styles.body}>
              <p className={styles.label}>{item.label}</p>
              <p className={styles.note}>{item.note}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

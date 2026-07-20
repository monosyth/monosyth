"use client";

import { useState } from "react";

import styles from "@/app/weather/weather.module.css";

export function StationCameraPreview({ src }: { src: string }) {
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) {
    return (
      <div className={styles.webcamFallback} role="img" aria-label="Station camera preview unavailable">
        <span>Camera preview unavailable</span>
      </div>
    );
  }

  return (
    // Keep the non-critical camera preview behind the station readings. The
    // API intentionally does not fall back to the large legacy JPEG when the
    // WebP is missing, so a broken capture cannot slow every weather page.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Shoreline weather station camera preview"
      width={800}
      height={450}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className={styles.webcamImage}
      onError={() => {
        setHasFailed(true);
      }}
    />
  );
}

"use client";

import { useEffect, useState } from "react";

import styles from "@/components/weather/station-camera-archive.module.css";
import { getWeatherDayKey, WEATHER_TIME_ZONE } from "@/lib/weather/time";

type StationCameraFrame = {
  capturedAt: string;
  fileName: string;
  fullImageUrl: string;
  imageUrl: string;
};

type StationCameraArchiveResponse = {
  date: string;
  frames: StationCameraFrame[];
  latest: {
    capturedAt: string;
    fullImageUrl: string;
    imageUrl: string;
    isStale: boolean;
  } | null;
};

const captureTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function StationCameraArchive() {
  const todayKey = getWeatherDayKey(new Date());
  const [date, setDate] = useState(todayKey);
  const [archive, setArchive] = useState<StationCameraArchiveResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/weather/station-camera/archive?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | StationCameraArchiveResponse
          | { error?: string };

        if (!response.ok || !("frames" in payload)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "The station camera archive is unavailable.",
          );
        }

        setArchive(payload);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "The station camera archive is unavailable.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [date]);

  const latest = archive?.latest ?? null;
  const frames = archive?.date === date ? archive.frames : [];

  function selectDate(nextDate: string) {
    setIsLoading(true);
    setError("");
    setDate(nextDate);
  }

  return (
    <section className={styles.section} aria-busy={isLoading}>
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Station camera</p>
          <h3 className={styles.title}>Daylight Photo Archive</h3>
          <p className={styles.intro}>
            One retained frame per daylight hour, grouped by Shoreline local date.
          </p>
        </div>

        <div className={styles.dateControls}>
          <button
            type="button"
            className={styles.dateButton}
            onClick={() => {
              selectDate(shiftDayKey(date, -1));
            }}
            aria-label="Show previous archive day"
          >
            Previous
          </button>
          <label className={styles.dateLabel}>
            <span>Date</span>
            <input
              type="date"
              value={date}
              max={todayKey}
              className={styles.dateInput}
              onChange={(event) => {
                if (event.target.value) {
                  selectDate(event.target.value);
                }
              }}
            />
          </label>
          <button
            type="button"
            className={styles.dateButton}
            disabled={date >= todayKey}
            onClick={() => {
              selectDate(shiftDayKey(date, 1));
            }}
            aria-label="Show next archive day"
          >
            Next
          </button>
        </div>
      </div>

      {latest ? (
        <div className={styles.latestGrid}>
          <a
            href={latest.fullImageUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.latestImageLink}
          >
            {failedImages.latest ? (
              <span className={styles.latestUnavailable}>Latest image unavailable</span>
            ) : (
              <>
                {/* Keep the gallery preview lightweight; the surrounding link still opens the full JPEG. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={latest.imageUrl}
                  alt="Latest view from the Shoreline weather station camera"
                  width={800}
                  height={450}
                  decoding="async"
                  className={styles.latestImage}
                  onError={() => {
                    setFailedImages((current) => ({ ...current, latest: true }));
                  }}
                />
              </>
            )}
          </a>
          <div className={styles.latestCopy}>
            <p className={styles.latestLabel}>Latest frame</p>
            <p className={styles.latestTime}>
              {latest.capturedAt
                ? formatCaptureTime(latest.capturedAt)
                : "Capture time unavailable"}
            </p>
            <p className={latest.isStale ? styles.staleNote : styles.freshNote}>
              {latest.isStale
                ? "This image is over 24 hours old. Camera capture needs attention."
                : "Camera capture is current."}
            </p>
          </div>
        </div>
      ) : null}

      <div className={styles.archiveHeader}>
        <h4 className={styles.archiveTitle}>{formatArchiveDate(date)}</h4>
        <p className={styles.archiveCount} aria-live="polite">
          {isLoading
            ? "Loading hourly frames"
            : `${frames.length} daylight ${frames.length === 1 ? "frame" : "frames"}`}
        </p>
      </div>

      {error ? <p className={styles.state}>{error}</p> : null}
      {!error && isLoading ? <ArchiveSkeleton /> : null}
      {!error && !isLoading && !frames.length ? (
        <p className={styles.state}>
          No archived daylight frames are available for this date yet.
        </p>
      ) : null}
      {!error && !isLoading && frames.length ? (
        <div className={styles.frameGrid}>
          {frames.map((frame) => {
            const useFullImage = failedImages[frame.fileName] ?? false;

            return (
              <a
                key={frame.fileName}
                href={frame.fullImageUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.frameCard}
              >
                <div className={styles.frameImageWrap}>
                  {/* Archive thumbnails are immutable and lazy-loaded below the fold. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={useFullImage ? frame.fullImageUrl : frame.imageUrl}
                    alt={`Station camera at ${formatCaptureTime(frame.capturedAt)}`}
                    width={800}
                    height={450}
                    loading="lazy"
                    decoding="async"
                    className={styles.frameImage}
                    onError={() => {
                      if (!useFullImage) {
                        setFailedImages((current) => ({
                          ...current,
                          [frame.fileName]: true,
                        }));
                      }
                    }}
                  />
                </div>
                <span className={styles.frameTime}>
                  {formatCaptureTime(frame.capturedAt)}
                </span>
              </a>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function ArchiveSkeleton() {
  return (
    <div className={styles.frameGrid} aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={styles.skeleton} />
      ))}
    </div>
  );
}

function shiftDayKey(dayKey: string, amount: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return shifted.toISOString().slice(0, 10);
}

function formatCaptureTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? captureTimeFormatter.format(new Date(timestamp))
    : "Time unavailable";
}

function formatArchiveDate(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

import styles from "@/app/weather/weather.module.css";

type WeatherPendingOverlayProps = {
  title: string;
  detail: string;
};

export function WeatherPendingOverlay({
  title,
  detail,
}: WeatherPendingOverlayProps) {
  return (
    <div className={styles.tabLoadingOverlay} role="status" aria-live="polite">
      <div className={styles.tabLoadingOverlayCard}>
        <div className={styles.tabLoadingOverlayTop}>
          <div className={styles.tabLoadingRadar} aria-hidden="true">
            <span className={styles.tabLoadingRadarRing} />
            <span
              className={`${styles.tabLoadingRadarRing} ${styles.tabLoadingRadarRingInner}`}
            />
            <span className={styles.tabLoadingRadarSweep} />
            <span className={styles.tabLoadingRadarDot} />
          </div>

          <div className={styles.tabLoadingOverlayCopyBlock}>
            <p className={styles.tabLoadingOverlayEyebrow}>Weather Station</p>
            <p className={styles.tabLoadingOverlayTitle}>{title}</p>
            <p className={styles.tabLoadingOverlayCopy}>{detail}</p>
          </div>
        </div>

        <div className={styles.tabStatusTrack} aria-hidden="true">
          <span className={styles.tabStatusBar} />
        </div>
      </div>
    </div>
  );
}

import styles from "@/app/weather/weather.module.css";

export function WeatherLoadingMark() {
  return <svg className={styles.weatherLoadingMark} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <circle cx="40" cy="34" r="14" stroke="currentColor" strokeWidth="2" />
    <path d="M40 8v6m0 40v6M14 34h6m40 0h6M22 16l4 4m28 28 4 4M22 52l4-4m28-28 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 66c12-12 20-12 32-4s20 8 32-4M8 73h64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

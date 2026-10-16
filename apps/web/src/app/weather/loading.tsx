import styles from "@/app/weather/weather.module.css";

export default function Loading() {
  return <main className={styles.page} aria-busy="true">
    <div className={styles.observatoryMasthead}><p className={styles.observatoryBrand}>MONOSYTH <span>WEATHER OBSERVATORY</span></p></div>
    <div className={styles.observatoryTitleRow}><div><p className={styles.observatoryEyebrow}>A little closer to the outside</p><h1>Shoreline<span>, Washington</span></h1></div></div>
    <div className={styles.contentShell}>
      <div className={styles.loadingSky} role="status"><span className={styles.loadingOrbit}/><p>Gathering the latest station readings</p><small>Weather, daylight, and the view outside</small></div>
      <div className={styles.loadingInstruments} aria-hidden="true">{[0,1,2,3].map(i=><div key={i}><span/><b/><span/></div>)}</div>
    </div>
  </main>;
}

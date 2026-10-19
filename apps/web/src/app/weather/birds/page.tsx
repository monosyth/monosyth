import type { Metadata } from "next";
import Link from "next/link";
import { WeatherPageTabs } from "@/components/weather/page-tabs";
import { BirdActivity } from "@/components/weather/bird-activity";
import styles from "../weather.module.css";

export const metadata: Metadata = { title: "Birds heard here | Monosyth Weather", description: "Bird activity at the Shoreline weather station: species photos, daily listening history, and bird activity from BirdNET." };

export default function BirdsPage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.observatoryMasthead}>
        <Link href="/weather" className={styles.observatoryBrand} aria-label="Main weather dashboard"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="5" ry="11"/><path d="M5 16h22M8 9h16M8 23h16"/></svg><span>MONOSYTH <b>WEATHER OBSERVATORY</b></span></Link>
        <Link className={styles.observatoryMapLink} href="/weather">Shoreline, Washington ↗</Link>
      </div>
      <div className={styles.observatoryHeaderBody}>
      <div className={styles.observatoryTitleRow}><div><p className={styles.observatoryEyebrow}>The sound of Shoreline</p><h1>Birds heard here</h1></div></div>
      <WeatherPageTabs activeView="current" activeDocumentTab="dashboard" birdsActive summaryTabs={[{label:"Current",view:"current"},{label:"Week",view:"week"},{label:"Month",view:"month"},{label:"Year",view:"year"}]} documentTabs={[{label:"Dashboard",tab:"dashboard"},{label:"Summaries",tab:"summaries"},{label:"Radar",tab:"radar"},{label:"Cameras",tab:"cameras"},{label:"Graphs",tab:"graphs"},{label:"About",tab:"about"}]} />
      </div>
    </header>
    <div className={styles.contentShell}><BirdActivity /></div>
  </main>;
}

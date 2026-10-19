"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { RainSummaryData } from "@/lib/weather/rain";
import styles from "./rain-summary.module.css";

const time = (value: number) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit",
}).format(value);
const stamp = (value: number) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
}).format(value);

export function RainSummary({ data, paused }: { data: RainSummaryData; paused: boolean }) {
  const id = useId().replace(/:/g, "");
  const [unit, setUnit] = useState<"in" | "mm">("in");
  const [selected, setSelected] = useState<number | null>(null);
  const number = (value: number | null) => value === null ? "—" : (value * (unit === "mm" ? 25.4 : 1)).toFixed(unit === "mm" ? 1 : 2);
  const scale = Math.max(1, Math.ceil(data.today ?? 0));
  const water = (data.today ?? 0) / scale * 150;
  const latestReport = data.timeline.findLastIndex(point => point.amount !== null);
  const pointIndex = Math.min(selected ?? (latestReport >= 0 ? latestReport : 23), data.timeline.length - 1);
  const point = data.timeline[pointIndex];
  const max = Math.max(.05, data.peakHour ?? 0);
  const title = data.today === null ? "Waiting for a rain reading" : data.today === 0 ? "A dry day so far" : "Every drop adds up";
  const chartDescription = data.reports === 0 ? "No hourly rainfall reports are available" :
    `${data.reports} available past-hour rainfall reports across the last 24 hours. Highest report ${number(data.peakHour)} ${unit}. Missing reports are marked with dashes.`;

  return <section className={styles.card} aria-labelledby={`${id}-title`} data-paused={paused}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Measured in your yard</p><h2 id={`${id}-title`}>The rain journal</h2></div>
      <div className={styles.units} role="group" aria-label="Rainfall units">
        {(["in", "mm"] as const).map(value => <button key={value} type="button" aria-pressed={unit === value} onClick={() => setUnit(value)}>{value}</button>)}
      </div>
    </header>
    <div className={styles.body}>
      <div className={styles.today}>
        <div className={styles.todayCopy}>
          <p className={styles.label}>Rain today</p>
          <p className={styles.total}>{number(data.today)}<span>{unit}</span></p>
          <h3>{title}</h3>
          <p className={styles.caption}>Since local midnight{data.timestamp !== null ? ` · reported ${time(data.timestamp)} PT` : ""}</p>
          <div className={styles.lastHour}><span>Past hour</span><strong>{number(data.pastHour)} <small>{unit}</small></strong></div>
        </div>
        <svg className={styles.gauge} viewBox="0 0 150 220" role="img" aria-label={`Rain gauge: ${number(data.today)} ${unit} today. Full scale ${number(scale)} ${unit}.`}>
          <defs><clipPath id={`${id}-gauge`}><rect x="25" y="28" width="68" height="164" rx="19"/></clipPath><linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#78b6b1"/><stop offset="1" stopColor="#30776f"/></linearGradient></defs>
          <path d="M24 15H94M32 15V32M86 15V32" fill="none" stroke="#70958d" strokeWidth="2" strokeLinecap="round"/>
          <rect x="25" y="28" width="68" height="164" rx="19" fill="#f5faf7" stroke="#9bb8ad" strokeWidth="1.5"/>
          <g clipPath={`url(#${id}-gauge)`}>
            {data.today !== null && data.today > 0 && <><rect x="25" y={185 - water} width="68" height={water + 8} fill={`url(#${id}-water)`}/><path className={styles.waterline} d={`M-30 ${185-water}q18 -6 36 0t36 0t36 0t36 0t36 0`} fill="none" stroke="#c1e7de" strokeWidth="3"/></>}
            {[0, .25, .5, .75, 1].map(f => <path key={f} d={`M78 ${185-f*150}H93`} stroke="#70958d" strokeWidth="1"/>)}
          </g>
          {[0, .5, 1].map(f => <text key={f} x="102" y={189-f*150}>{number(f*scale)}</text>)}
          <path d="M17 200H101" stroke="#9bb8ad" strokeWidth="1.5" strokeLinecap="round"/>
          <text x="60" y="216" textAnchor="middle">{unit === "in" ? "inches" : "millimeters"}</text>
        </svg>
      </div>
      <div className={styles.history}>
        <div className={styles.chartHeading}><div><p className={styles.label}>The last 24 hours</p><p className={styles.caption}>Rain reported in the past hour</p></div><div className={styles.readout}><strong>{number(point.amount)} <small>{unit}</small></strong><span>{point.amount === null ? "No reading" : "Reported"} · {time(point.timestamp)}</span></div></div>
        <div className={styles.chart}>
          <svg viewBox="0 0 720 160" preserveAspectRatio="none" role="img" aria-label={chartDescription} onPointerMove={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            setSelected(Math.max(0, Math.min(23, Math.floor((event.clientX - rect.left) / rect.width * 24))));
          }} onPointerLeave={() => setSelected(null)}>
            {[20, 70, 120].map(y => <path key={y} d={`M0 ${y}H720`} className={styles.gridline}/>)}
            {data.timeline.map((report, index) => {
              const height = report.amount === null ? 0 : report.amount / max * 100;
              const x = index * 30 + 5;
              return <g key={index}>
                {index === pointIndex && <rect x={index*30} y="6" width="30" height="124" rx="5" fill="#dcece4"/>}
                {report.amount === null ? <path d={`M${x+5} 120h10`} stroke="#a4b2aa" strokeDasharray="2 2"/> : <rect x={x} y={120-Math.max(height, 3)} width="20" height={Math.max(height, 3)} rx="3" fill={report.amount > 0 ? "#498d85" : "#a1c3b6"}/>}
              </g>;
            })}
          </svg>
          <div className={styles.chartTimes}><span>{time(data.timeline[0].timestamp)}</span><span>12 hours ago</span><span>Latest</span></div>
        </div>
        <label className={styles.scrubber}><span>Explore hourly reports</span><input type="range" min="0" max="23" value={pointIndex} onChange={event => setSelected(Number(event.target.value))} aria-label="Explore hourly rainfall reports" aria-valuetext={`${point.amount === null ? "No reading" : `${number(point.amount)} ${unit}`} at ${stamp(point.timestamp)}`}/></label>
        <div className={styles.totals}>
          {([["This week", data.week], ["This month", data.month], ["This year", data.year]] as const).map(([label, value]) => <div key={label}><span>{label}</span><strong>{number(value)} <small>{unit}</small></strong></div>)}
        </div>
      </div>
    </div>
    <footer className={styles.footer}><p>{data.peakHour === null ? "Hourly reports unavailable" : data.peakHour === 0 ? "No rain in the available hourly reports" : `Wettest reported hour · ${number(data.peakHour)} ${unit}`}</p><Link href="/weather?tab=graphs">Explore station graphs ↗</Link></footer>
    <details className={styles.notes}><summary>About these readings</summary><p>Totals come directly from your station’s rain counters. Each bar is a report of rain in the hour before that reading; the bars can overlap, so they are not added together. A short solid mark means measured zero rain. A dashed mark means no reading. {data.reports} of 24 hourly slots have reports.{data.timestamp !== null ? ` Last station reading: ${stamp(data.timestamp)} PT.` : ""}</p></details>
  </section>;
}

"use client";

import { useEffect, useState } from "react";
import { BIRD_TIME_ZONE, birdDate, birdListenerIsFresh, parseBirdSnapshot, type BirdSnapshot } from "@/lib/weather/birds";
import styles from "./birds-heard.module.css";

const clock = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: BIRD_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(value));
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: BIRD_TIME_ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export function BirdsHeard() {
  const [data, setData] = useState<BirdSnapshot | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [limit, setLimit] = useState(12);
  useEffect(() => {
    let stopped = false, busy = false;
    const controller = new AbortController();
    const load = async () => {
      setNow(Date.now());
      if (document.hidden || busy) return;
      busy = true;
      try {
        const response = await fetch(`/api/weather/birds${selectedDate ? `?date=${selectedDate}` : ""}`, {
          cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        });
        if (!response.ok) throw new Error(response.status === 404 ? "No bird history has been saved for this date." : "The bird listening feed is temporarily unavailable.");
        const snapshot = parseBirdSnapshot(await response.json());
        if (!stopped) { setData(snapshot); setError(null); }
      } catch (reason) {
        if (!stopped) setError(reason instanceof Error ? reason.message : "The bird listening feed is temporarily unavailable.");
      } finally { busy = false; }
    };
    void load();
    const timer = setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => { stopped = true; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [selectedDate]);

  const fresh = data && now !== null && !error && birdListenerIsFresh(data, now);
  const yardMicrophone = Boolean(fresh && data.listener.sources.yardMicrophone);
  const camera = Boolean(fresh && data.listener.sources.camera);
  const quietCamera = camera && !yardMicrophone && data !== null && data.listener.signalDb !== null && data.listener.signalDb < -60;
  const dayMatches = data && (!selectedDate || selectedDate === data.day.date);
  const records = dayMatches ? data.day.records : [];
  const species = new Set(records.map(record => record.scientificName));
  const last = records[0];
  const status = !data ? "Connecting to the listener" : !fresh ? "Listener update delayed" : yardMicrophone && camera ? "Listening · yard mic + camera" : yardMicrophone ? "Listening · yard microphone" : quietCamera ? "Listening · quiet camera microphone" : camera ? "Listening · WeatherCam" : "Listener update delayed";
  const sourceLabel = yardMicrophone && camera ? "Yard mic + camera" : yardMicrophone ? "Yard microphone" : camera ? "WeatherCam" : "Station listening";
  const quality = yardMicrophone ? `BirdNET is listening through the yard microphone${camera ? " and WeatherCam" : ""}. We are still testing the new mic’s placement. Bird identifications need review; detections are sound events, not counts of individual birds.` : camera ? "WeatherCam is listening while the yard microphone is unavailable. Its quiet audio can miss calls. Bird identifications need review; detections are sound events, not counts of individual birds." : "Bird identifications need review; detections are sound events, not counts of individual birds.";

  return <section className={styles.card} aria-labelledby="birds-heard-title">
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>The sound of Shoreline</p><h2 id="birds-heard-title">Birds heard here</h2></div>
      <span className={styles.trial}>{sourceLabel}</span>
    </div>
    <div className={styles.content}>
      <div className={styles.overview}>
        <div className={styles.listener} role="status"><i data-active={Boolean(fresh)} />{error && !data ? "Listener unavailable" : status}</div>
        <BirdIcon />
        <p className={styles.description}>A little field journal, written by the birds outside.</p>
        <div className={styles.stats}>
          <div><strong>{dayMatches ? species.size : "—"}</strong><span>Species suggested</span></div>
          <div><strong>{dayMatches ? records.length : "—"}</strong><span>Detections</span></div>
          <div><strong>{last ? clock(last.timestamp) : "—"}</strong><span>Last heard · PT</span></div>
        </div>
        <p className={styles.quality}>{quality}</p>
        {data && <p className={styles.updated}>Listener checked <time dateTime={data.updatedAt}>{dateLabel(data.updatedAt)} PT</time></p>}
      </div>
      <div className={styles.history}>
        <div className={styles.historyHeading}>
          <h3>Listening history</h3>
          <div className={styles.dateControls}>
            <label><span className={styles.visuallyHidden}>Bird history date</span><input type="date" value={selectedDate || data?.day.date || ""} min={data ? birdDate(Date.parse(data.startedAt)) : undefined} max={now ? birdDate(now) : undefined} onChange={event => { setSelectedDate(event.target.value); setLimit(12); }} /></label>
            <button type="button" onClick={() => { setSelectedDate(""); setLimit(12); }}>Today</button>
          </div>
        </div>
        {error && <p className={styles.error} role="status">{error}{dayMatches ? " Showing the last saved records below." : ""}</p>}
        {!data && !error ? <p className={styles.empty}>Loading the station’s bird history…</p> : !dayMatches ? <p className={styles.empty}>{error ? "Choose another date to explore saved records." : "Loading this day’s records…"}</p> : records.length === 0 ?
          <div className={styles.empty}><strong>No qualifying bird detections recorded</strong><p>{fresh && data.day.date === birdDate(now!) ? "The station is listening. New detections appear when calls meet the confidence and repeat-detection checks." : "There are no saved detections for this date. A quiet record does not mean there were no birds nearby."}</p></div> :
          <><div className={styles.tableWrap}><table><thead><tr><th scope="col">Bird</th><th scope="col">Heard · PT</th><th scope="col">Model confidence</th></tr></thead><tbody>{records.slice(0, limit).map(record => <tr key={record.id}><td><strong>{record.commonName}</strong><span>{record.scientificName}</span>{record.source && <small>Heard by {record.source}</small>}{record.verified && <small>Reviewed</small>}</td><td><time dateTime={record.timestamp}>{clock(record.timestamp)}</time></td><td>{Math.round(record.confidence * 100)}%</td></tr>)}</tbody></table></div>{records.length > limit && <button className={styles.more} type="button" onClick={() => setLimit(limit + 24)}>Show more detections ({records.length - limit})</button>}</>}
      </div>
    </div>
    <footer className={styles.footer}><span>BirdNET v2.4 · {Math.round((data?.listener.threshold ?? .8) * 100)}% minimum confidence · Repeated detections required</span><a href="https://www.birds.cornell.edu/ccb/birdnet/" target="_blank" rel="noreferrer">About BirdNET ↗</a></footer>
  </section>;
}

function BirdIcon() {
  return <svg className={styles.bird} viewBox="0 0 100 82" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 61h76M24 59l9-11c-1-12 6-23 19-25 5-12 22-10 24 3l10 4-11 4c-4 15-14 24-29 24H24Z"/><path d="M33 48c14 2 25-4 28-15-11-4-22 2-28 15Zm15 10-2 8m12-11 1 11M17 61l-5 7m69-7 5 6"/><circle cx="68" cy="24" r="1.4" fill="currentColor" stroke="none"/><path d="M8 29c-3 5-3 10 0 15m-5-19c-5 8-5 17 0 25" opacity=".35"/></svg>;
}

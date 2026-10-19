"use client";

import { useEffect, useState } from "react";
import { BIRD_TIME_ZONE, birdDate, birdListenerIsFresh, buildBirdActivity, parseBirdSnapshot, type BirdPicture, type BirdRecord, type BirdSnapshot } from "@/lib/weather/birds";
import styles from "./bird-activity.module.css";

/* eslint-disable @next/next/no-img-element -- External credited reference thumbnails and existing PNG report assets. */

const clock = (time: string) => new Intl.DateTimeFormat("en-US",{timeZone:BIRD_TIME_ZONE,hour:"numeric",minute:"2-digit"}).format(new Date(time));
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;

export function BirdActivity() {
  const [data,setData] = useState<BirdSnapshot|null>(null);
  const [date,setDate] = useState("");
  const [error,setError] = useState<string|null>(null);
  const [now,setNow] = useState<number|null>(null);
  const [species,setSpecies] = useState("");
  const [hour,setHour] = useState<number|null>(null);
  const [limit,setLimit] = useState(12);
  useEffect(() => {
    let stopped = false, busy = false;
    const controller = new AbortController();
    const load = async () => {
      setNow(Date.now());
      if (document.hidden || busy) return;
      busy = true;
      try {
        const response = await fetch(`/api/weather/birds${date ? `?date=${date}` : ""}`,{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15_000)])});
        if (!response.ok) throw new Error(response.status === 404 ? "No listening history has been saved for this date. Try another day." : "The bird report is temporarily unavailable.");
        const next = parseBirdSnapshot(await response.json());
        if (!stopped) {setData(next);setError(null);}
      } catch (reason) {if (!stopped) setError(reason instanceof Error ? reason.message : "Bird report unavailable");}
      finally {busy=false;}
    };
    void load();
    const timer=setInterval(load,60_000);
    document.addEventListener("visibilitychange",load);
    return () => {stopped=true;controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",load);};
  },[date]);
  const matches = Boolean(data && (!date || data.day.date === date));
  const records = matches ? data!.day.records : [];
  const activity = buildBirdActivity(records);
  const busiest = activity.hours.reduce((peak,hour)=>hour.count>peak.count ? hour : peak,activity.hours[0]);
  const filtered = species ? records.filter(record=>record.scientificName===species) : records;
  const hours = buildBirdActivity(filtered).hours;
  const peak = Math.max(1,...hours.map(item=>item.count));
  const fresh = Boolean(data && now && !error && birdListenerIsFresh(data,now));
  const selectedHour = hour === null ? null : hours[hour];
  const selectedSpecies = activity.species.find(item=>item.scientificName===species);
  const changeDate = (next:string) => {setDate(next);setSpecies("");setHour(null);setLimit(12);};
  return <div className={styles.page}>
    <section className={styles.intro}>
      <div><p className={styles.kicker}>A field journal, written in sound</p><h2>A little closer to the birds outside</h2><p>The yard microphone and WeatherCam listen for bird calls. BirdNET suggests an identity; this journal keeps a report of likely visitors, when they were heard, and how often.</p></div>
      <div className={styles.dayControls}><label htmlFor="bird-day">Explore a day</label><div><input id="bird-day" type="date" value={date || data?.day.date || ""} min={data ? birdDate(Date.parse(data.startedAt)) : undefined} max={now ? birdDate(now) : undefined} onChange={event=>changeDate(event.target.value)}/><button onClick={()=>changeDate("")}>Today</button></div><span className={styles.status} data-live={fresh}>{fresh ? "Station listening" : data ? "Listener update delayed" : "Connecting to the station"}</span>{data && <small>Report updated {clock(data.updatedAt)} PT</small>}</div>
    </section>
    {error && <p className={styles.message} role="status">{error}{matches ? " The last saved report is shown below." : ""}</p>}
    {!data && !error && <p className={styles.message} role="status">Loading the listening journal…</p>}
    {data && !matches && !error && <p className={styles.message} role="status">Loading this day’s listening journal…</p>}
    {matches && <>
      <div className={styles.stats}><div><strong>{activity.species.length}</strong><span>Species suggested</span></div><div><strong>{records.length}</strong><span>Saved detections</span></div><div><strong>{records[0] ? clock(records[0].timestamp) : "—"}</strong><span>Last heard · PT</span></div><div><strong>{busiest.count ? hourLabel(busiest.hour) : "—"}</strong><span>Busiest hour · PT</span></div></div>
      <section className={styles.panel} aria-labelledby="activity-title"><div className={styles.sectionHeading}><div><p className={styles.kicker}>When the yard came alive</p><h2 id="activity-title">Activity through the day</h2></div><span>{selectedSpecies ? selectedSpecies.name : "All species"} · Pacific time</span></div>
        <p className={styles.chartReadout} aria-live="polite">{selectedHour ? `${hourLabel(selectedHour.hour)}–${hourLabel((selectedHour.hour+1)%24)} · ${selectedHour.count} saved ${selectedHour.count===1 ? "detection" : "detections"}` : `${filtered.length} saved ${filtered.length===1 ? "detection" : "detections"} across the day`}</p>
        <div className={styles.chart} role="group" aria-label="Hourly saved bird detections. Select an hour to read its count.">{hours.map(item=><button key={item.hour} aria-label={`${hourLabel(item.hour)}: ${item.count} saved detections`} aria-pressed={hour===item.hour} onClick={()=>setHour(item.hour)} className={styles.hour}><span className={styles.barSpace}><span className={styles.bar} style={{height:`${item.count ? Math.max(5,item.count/peak*100) : 2}%`}} data-empty={!item.count}/></span><span className={styles.hourTick}>{item.hour%6===0 ? hourLabel(item.hour) : ""}</span></button>)}</div>
        <label className={styles.hourControl}>Explore by hour<input type="range" min="0" max="23" step="1" value={hour ?? 12} aria-label="Explore bird detections by hour" aria-valuetext={`${hourLabel(hour ?? 12)}: ${hours[hour ?? 12].count} saved detections`} onChange={event=>setHour(Number(event.target.value))}/></label>
        <p className={styles.note}>Counts are identified sound events, not individual birds. A quiet hour can mean silence, missed calls, or a listener interruption.</p>
      </section>
      <section aria-labelledby="species-title"><div className={styles.sectionHeading}><div><p className={styles.kicker}>Meet the visitors</p><h2 id="species-title">Who was heard</h2></div>{species && <button className={styles.reset} onClick={()=>{setSpecies("");setHour(null);setLimit(12);}}>Show all species</button>}</div>
        {!records.length ? <p className={styles.message}>No qualifying bird calls were saved for this date. New detections appear after the station’s confidence and repeat checks.</p> : <div className={styles.speciesGrid}>{activity.species.map(item=><article key={item.scientificName} className={styles.speciesCard} data-selected={species===item.scientificName}><button aria-pressed={species===item.scientificName} onClick={()=>{setSpecies(species===item.scientificName ? "" : item.scientificName);setHour(null);setLimit(12);}}><BirdPhoto picture={item.picture} name={item.name}/><span><strong>{item.name}</strong><i>{item.scientificName}</i><small>{item.count} {item.count===1 ? "detection" : "detections"} · last {clock(item.latest)}</small></span></button><PhotoCredit picture={item.picture}/></article>)}</div>}
      </section>
      <section aria-labelledby="recent-title"><div className={styles.sectionHeading}><div><p className={styles.kicker}>From the listening journal</p><h2 id="recent-title">{selectedSpecies ? selectedSpecies.name : "Recent detections"}</h2></div><span>{filtered.length} saved {filtered.length===1 ? "event" : "events"}</span></div><p className={styles.explainer}>A report of the bird calls identified here. Photos help put a face to each suggestion; recordings and sound prints stay private.</p>
        <div className={styles.detectionGrid}>{filtered.slice(0,limit).map(record=><DetectionCard key={record.id} record={record}/>)}</div>
        {filtered.length>limit && <button className={styles.more} onClick={()=>setLimit(limit+12)}>Show more detections ({filtered.length-limit})</button>}
      </section>
    </>}
    <footer className={styles.footer}><p>BirdNET v2.4 · {Math.round((data?.listener.threshold ?? .8)*100)}% minimum confidence · Repeated detections required</p><p>Suggestions need review. Confidence describes the model’s match to the sound, rather than a confirmed sighting. Species pictures are reference photos, not pictures from the yard.</p><a href="https://www.birds.cornell.edu/ccb/birdnet/" target="_blank" rel="noreferrer">About BirdNET ↗</a></footer>
  </div>;
}

function BirdPhoto({picture,name}:{picture?:BirdPicture;name:string}) {
  const [failed,setFailed]=useState(false);
  if (!picture || failed) return <span className={styles.photoFallback} role="img" aria-label={`${name} reference photo unavailable`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 19h18M5 17l3-4c-1-4 2-7 6-7 2-3 5-1 5 2l3 2-3 1c-1 5-4 7-8 7H5Z"/><path d="m11 18-1 3m5-4v4M8 13c4 1 6-1 7-3"/></svg></span>;
  return <img className={styles.photo} src={picture.url} alt={`${name} reference photo`} width={80} height={80} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}
function PhotoCredit({picture}:{picture?:BirdPicture}) {
  return picture ? <small className={styles.credit}>Photo: {picture.author} · <a href={picture.licenseUrl} target="_blank" rel="noreferrer">{picture.license}</a> · AviCommons / Wikimedia</small> : null;
}
function DetectionCard({record}:{record:BirdRecord}) {
  return <article className={styles.detection}><header><BirdPhoto picture={record.picture} name={record.commonName}/><div><h3>{record.commonName}</h3><i>{record.scientificName}</i><p><time dateTime={record.timestamp}>{clock(record.timestamp)} PT</time> · {record.source ?? "Station microphone"}</p></div><span className={styles.confidence}>{Math.round(record.confidence*100)}%<small>{record.verified ? "Reviewed" : "Model match"}</small></span></header><PhotoCredit picture={record.picture}/></article>;
}

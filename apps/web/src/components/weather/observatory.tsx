"use client";

import { useEffect, useId, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Atmosphere } from "./atmosphere";
import { StationCameraPreview } from "./station-camera-preview";
import { compassPoint, type ObservatoryData } from "@/lib/weather/observatory";
import styles from "./observatory.module.css";

const clock = (time: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" }).format(time);
const datedClock = (time: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(time);
const format = (value: number | null, digits = 0) => value === null ? "—" : value.toFixed(digits);

export function WeatherObservatory({ data }: { data: ObservatoryData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [now, setNow] = useState(data.now);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    const refresh = () => { if (!document.hidden) startTransition(() => router.refresh()); };
    const poll = setInterval(refresh, 300_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); clearInterval(poll); document.removeEventListener("visibilitychange",refresh); };
  }, [router]);
  const stale = data.timestamp === null || Math.max(now,data.now) - data.timestamp > 20*60_000;
  const motionOff = paused || reduced;
  return <div className={styles.observatory} data-paused={motionOff}>
    <div className={styles.sectionLine}>
      <p><span className={stale ? styles.staleDot : styles.liveDot} />{stale ? "Last station report" : "Live from the station"}<span className={styles.reportTime}>{data.timestamp ? (stale ? datedClock(data.timestamp) : clock(data.timestamp)) + " PT" : "Awaiting readings"}</span></p>
      <div className={styles.controls}>
        <button type="button" onClick={() => setPaused(!paused)} disabled={reduced} aria-pressed={motionOff}>{motionOff ? "▷ Motion paused" : "Ⅱ Pause motion"}</button>
        <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Updating…" : "↻ Refresh"}</button>
      </div>
    </div>
    <div className={styles.heroGrid}>
      <section className={styles.skyCard} aria-label="Current station conditions">
        <Atmosphere data={{...data, stale}} paused={motionOff} />
        <div className={styles.skyShade} />
        <div className={styles.skyCopy}>
          <p className={styles.eyebrow}>Outside, right now</p>
          <div className={styles.temperature}>{format(data.temperature,1)}<span>°F</span></div>
          <h2>{data.condition}</h2>
          <p className={styles.conditionSource}>{data.forecastCondition ? "Sky outlook · National Weather Service" : "Measured at the weather station"}</p>
          <div className={styles.skyReadings}>
            <span className={styles.range}>24h high <b>{format(data.high,1)}°</b></span>
            <span className={styles.range}>Low <b>{format(data.low,1)}°</b></span>
            <div className={styles.skySunTime}>
              <SunEventIcon />
              <span>Sunrise<time dateTime={new Date(data.sunrise).toISOString()}>{clock(data.sunrise)}</time></span>
            </div>
            <div className={styles.skySunTime}>
              <SunEventIcon setting />
              <span>Sunset<time dateTime={new Date(data.sunset).toISOString()}>{clock(data.sunset)}</time></span>
            </div>
          </div>
        </div>
        <div className={styles.skyBottom}>
          <span><i className={styles.smallSun} />{data.sunAltitude > 0 ? "Daylight in Shoreline" : "Night in Shoreline"}</span>
          <details className={styles.sceneInfo}><summary>About this sky ⓘ</summary><p>A live illustration, not a camera image. Sunlight follows the station’s location and time. Clouds use the current NWS forecast; movement follows measured wind. Rain streaks indicate rainfall reported in the last hour. Terrain is illustrative.{stale ? " Station readings are delayed; wind and rain motion are paused." : ""}{data.cloudCover === null ? " Cloud data is unavailable; the sky uses a neutral backdrop." : ""}</p></details>
        </div>
      </section>
      <div className={styles.sideStack}>
        <section className={styles.cameraCard}>
          <div className={styles.cardHeading}><h2><CameraIcon /> A window outside</h2><Link href="/weather?tab=cameras">Archive ↗</Link></div>
          <Link className={styles.cameraView} href="/weather?tab=cameras" aria-label="Open station camera and daylight archive"><StationCameraPreview src="/api/weather/station-camera?variant=thumbnail" showTimestamp /></Link>
          <div className={styles.cameraCaption}><span>Shoreline station camera</span><span>Daylight · every 5 min</span></div>
        </section>
        <section className={styles.windCard}>
          <div><p className={styles.eyebrow}>Wind at the station</p><p className={styles.windValue}>{format(data.wind,1)}<span>mph</span></p><p className={styles.windDetail}>{data.wind === null ? "Reading unavailable" : data.wind < .5 ? "Nearly calm" : `From ${compassPoint(data.windDirection)}`}<span>Gusts {format(data.gust,1)} mph</span></p></div>
          <div className={styles.compass} style={{"--wind-angle": `${data.windDirection ?? 0}deg`, "--flow-duration": `${Math.max(1, 7-(data.wind ?? 0)*.4)}s`} as CSSProperties}>
            <svg viewBox="0 0 160 160" role="img" aria-label={data.windDirection === null ? "Wind direction unavailable" : `Wind from ${compassPoint(data.windDirection)}, ${Math.round(data.windDirection)} degrees`}>
              {data.wind !== null && data.wind >= .5 && !stale && <g className={styles.windFlow} transform={`rotate(${data.windDirection ?? 0} 80 80)`}><path d="M55 38Q47 80 55 122"/><path d="M66 30Q56 80 66 130"/><path d="M96 30Q106 80 96 130"/><path d="M108 38Q116 80 108 122"/></g>}
              <circle cx="80" cy="80" r="58" className={styles.compassCircle}/><circle cx="80" cy="80" r="44" className={styles.compassInner}/>
              {Array.from({length:32},(_,i)=><path key={i} d="M80 20v5" transform={`rotate(${i*11.25} 80 80)`} className={styles.compassTick}/>)}
              <text x="80" y="12">N</text><text x="151" y="84">E</text><text x="80" y="157">S</text><text x="9" y="84">W</text>
              {data.windDirection !== null && <g className={styles.needle}><path d="M80 37L89 88L80 82L71 88Z" fill="#bbd9a5"/><path d="M80 122L71 88L80 94L89 88Z" fill="#45655d"/></g>}
              <circle cx="80" cy="80" r="4" fill="#f0f5e9"/>
            </svg>
            <span>{data.windDirection === null ? "—" : `${Math.round(data.windDirection)}°`}</span>
          </div>
        </section>
      </div>
    </div>
    <div className={styles.metricGrid}>
      <Metric label="Humidity" value={format(data.humidity)} unit="%" detail={`Dew point ${format(data.dewpoint,1)}°F`} icon="humidity" />
      <Metric label="Rain today" value={format(data.rain,2)} unit="in" detail={`${format(data.rainRate,2)} in · past hour`} icon="rain" />
      <Metric label="Pressure" value={format(data.pressure,3)} unit="inHg" detail={data.pressureChange === null ? "Trend unavailable" : `${data.pressureChange > .005 ? "↗ Rising" : data.pressureChange < -.005 ? "↘ Falling" : "→ Steady"} · ${Math.abs(data.pressureChange).toFixed(3)} inHg / ~3h`} icon="pressure" />
      <Metric label="UV index" value={format(data.uv,1)} unit="" detail={data.uv === null ? "Reading unavailable" : data.uv < 3 ? "Low exposure" : data.uv < 6 ? "Moderate exposure" : data.uv < 8 ? "High exposure" : "Very high exposure"} icon="sun" />
    </div>
    <div className={styles.exploreGrid}>
      <TemperatureTrace points={data.temperatures} now={data.now} />
      <Daylight data={data} />
    </div>
    <section className={styles.forecastCard}>
      <div className={styles.cardHeading}><h2>The hours ahead</h2><span>NWS hourly forecast</span></div>
      {data.forecast.length ? <div className={styles.forecastStrip}>{data.forecast.map((period,index) => <div key={period.startTime} className={styles.forecastHour} title={period.detailedForecast || period.shortForecast}>
        <span>{index===0 && Date.parse(period.startTime)<=data.now ? "Now" : clock(Date.parse(period.startTime))}</span>
        <WeatherGlyph condition={period.shortForecast} day={period.isDaytime}/>
        <strong>{period.temperature === null ? "—" : `${period.temperature}°${period.temperatureUnit}`}</strong>
        <p>{period.shortForecast}</p><small>{period.windSpeed} {period.windDirection}</small>
      </div>)}</div> : <p className={styles.empty}>The hourly forecast is temporarily unavailable. Station readings remain available above.</p>}
    </section>
    <div className={styles.sourceNote}><span>Measured here · Ambient Weather</span><span>Forecast · National Weather Service</span><span>Sun & moon · calculated for Shoreline</span></div>
  </div>;
}

function Metric({label,value,unit,detail,icon}: {label:string;value:string;unit:string;detail:string;icon:string}) {
  return <section className={styles.metric}><div className={styles.metricTop}><p>{label}</p><MetricIcon name={icon}/></div><p className={styles.metricValue}>{value}<span>{unit}</span></p><p className={styles.metricDetail}>{detail}</p></section>;
}

function TemperatureTrace({points,now}: {points: ObservatoryData["temperatures"];now:number}) {
  const id=useId().replace(/:/g,"");
  const [selected,setSelected]=useState<number|null>(null);
  const chartHost=useRef<HTMLDivElement>(null);
  const [chartWidth,setChartWidth]=useState(728);
  useEffect(()=>{
    if (!chartHost.current) return;
    const observer=new ResizeObserver(([entry])=>setChartWidth(Math.max(260,entry.contentRect.width)));
    observer.observe(chartHost.current);
    return ()=>observer.disconnect();
  },[points.length]);
  const plotWidth=chartWidth-70;
  const point=points[Math.min(selected ?? points.length-1,points.length-1)];
  if (!point || points.length<2) return <section className={styles.traceCard}><div className={styles.cardHeading}><h2>The last 24 hours</h2></div><p className={styles.empty}>More station readings are needed to draw a temperature trace.</p></section>;
  const min=Math.floor(Math.min(...points.map(p=>p.value))/5)*5-5;
  const max=Math.ceil(Math.max(...points.map(p=>p.value))/5)*5+5;
  const x=(t:number)=>42+(t-(now-86_400_000))/86_400_000*plotWidth;
  const y=(v:number)=>155-(v-min)/(max-min)*130;
  const segments: typeof points[]=[];
  for (const p of points) {
    if (!segments.length || p.timestamp-segments.at(-1)!.at(-1)!.timestamp>20*60_000) segments.push([]);
    segments.at(-1)!.push(p);
  }
  return <section className={styles.traceCard}>
    <div className={styles.cardHeading}><h2>The last 24 hours</h2><Link href="/weather?tab=graphs">Explore graphs ↗</Link></div>
    <div className={styles.traceReadout}><strong>{point.value.toFixed(1)}<small>°F</small></strong><span>{datedClock(point.timestamp)} PT<span>Outdoor temperature</span></span></div>
    <div ref={chartHost} className={styles.traceHost}><svg className={styles.trace} viewBox={`0 0 ${chartWidth} 190`} role="img" aria-label={`Outdoor temperature over the last 24 hours, ${Math.min(...points.map(p=>p.value)).toFixed(1)} to ${Math.max(...points.map(p=>p.value)).toFixed(1)} degrees Fahrenheit`} onPointerMove={event=>{
      const box=event.currentTarget.getBoundingClientRect();
      const target=now-86_400_000+Math.max(0,Math.min(1,((event.clientX-box.left)/box.width*chartWidth-42)/plotWidth))*86_400_000;
      let nearest=0;points.forEach((p,i)=>{if(Math.abs(p.timestamp-target)<Math.abs(points[nearest].timestamp-target))nearest=i;});setSelected(nearest);
    }} onPointerLeave={()=>setSelected(null)}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#648e76" stopOpacity=".2"/><stop offset="1" stopColor="#648e76" stopOpacity="0"/></linearGradient></defs>
      {[0,.5,1].map(f=><g key={f}><path d={`M42 ${155-f*130}H${chartWidth-28}`} className={styles.chartGrid}/><text x="2" y={159-f*130}>{Math.round(min+f*(max-min))}°</text></g>)}
      {segments.map((segment,i)=>{const line=segment.map((p,j)=>`${j?"L":"M"}${x(p.timestamp).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");return <g key={i}><path d={`${line} L${x(segment.at(-1)!.timestamp)} 155 L${x(segment[0].timestamp)} 155Z`} fill={`url(#${id})`}/><path d={line} fill="none" stroke="#437864" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></g>;})}
      <path d={`M${x(point.timestamp)} 20V155`} stroke="#9db4a4" strokeDasharray="3 4"/><circle cx={x(point.timestamp)} cy={y(point.value)} r="4.5" fill="#f8fbf6" stroke="#396c59" strokeWidth="2"/>
      {[0,.25,.5,.75,1].map(f=><text key={f} x={42+f*plotWidth} y="184" textAnchor={f===0?"start":f===1?"end":"middle"}>{f===1?"Now":clock(now-86_400_000+f*86_400_000)}</text>)}
    </svg></div>
    <label className={styles.scrubber}><span>Explore the readings</span><input type="range" min="0" max={points.length-1} value={selected ?? points.length-1} onChange={event=>setSelected(Number(event.target.value))} aria-label="Explore recorded temperature" aria-valuetext={`${point.value.toFixed(1)} degrees Fahrenheit at ${datedClock(point.timestamp)}`}/></label>
  </section>;
}

function Daylight({data}: {data:ObservatoryData}) {
  const progress=Math.max(0,Math.min(1,(data.now-data.sunrise)/(data.sunset-data.sunrise)));
  const hours=(data.sunset-data.sunrise)/3_600_000;
  const remaining=Math.max(0,data.sunset-data.now);
  const daylight=data.now>=data.sunrise && data.now<data.sunset;
  const d=Array.from({length:41},(_,i)=>`${i?"L":"M"}${20+i*8} ${130-Math.sin(i/40*Math.PI)*90}`).join(" ");
  return <section className={styles.daylightCard}>
    <div className={styles.cardHeading}><h2>Chasing daylight</h2><MetricIcon name="sun"/></div>
    <div className={styles.daylightTitle}><strong>{Math.floor(hours)}<small>h</small> {Math.round(hours%1*60)}<small>m</small></strong><p>{daylight ? `${Math.floor(remaining/3_600_000)}h ${Math.floor(remaining/60_000)%60}m until sunset` : data.now<data.sunrise ? "Waiting for sunrise" : "The sun has set"}</p></div>
    <svg viewBox="0 0 360 150" className={styles.sunArc} role="img" aria-label={`Sunrise ${clock(data.sunrise)}, sunset ${clock(data.sunset)}`}>
      <path d="M20 130H340" stroke="#cfdbd1"/><path d={d} fill="none" stroke="#c7cfbc" strokeWidth="1.5" strokeDasharray="4 5"/>
      <path d={d} fill="none" stroke="#aa873a" strokeWidth="2" pathLength="100" strokeDasharray={`${progress*100} 100`}/>
      {daylight && <g transform={`translate(${20+progress*320},${130-Math.sin(progress*Math.PI)*90})`}><circle r="17" fill="#d8b46a" opacity=".17"/><circle r="7" fill="#b28e42"/></g>}
      <circle cx="20" cy="130" r="3" fill="#b28e42"/><circle cx="340" cy="130" r="3" fill="#b28e42"/>
    </svg>
    <div className={styles.sunTimes}><span>Sunrise<strong>{clock(data.sunrise)}</strong></span><span>Sunset<strong>{clock(data.sunset)}</strong></span></div>
    <p className={styles.moonNote}>◐ Moon illumination <strong>{Math.round(data.moonIllumination*100)}%</strong></p>
  </section>;
}

function SunEventIcon({ setting = false }: { setting?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 19h20M6 16a6 6 0 0 1 12 0M2 15h1m18 0h1M4.2 8.2l1.4 1.4m12.8 0 1.4-1.4" />
    <path d={setting ? "M12 2v6m-3-3 3 3 3-3" : "M12 8V2m-3 3 3-3 3 3"} />
  </svg>;
}

function CameraIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="6" width="14" height="12" rx="2"/><path d="m17 10 4-3v10l-4-3"/></svg>;}
function MetricIcon({name}:{name:string}) {return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==="humidity"?<><path d="M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M9 16a3 3 0 0 0 3 3"/></>:name==="rain"?<><path d="M5 14a4 4 0 0 1 0-8 6 6 0 0 1 11 0 4 4 0 0 1 3 8"/><path d="m7 17-1 3m6-3-1 3m6-3-1 3"/></>:name==="pressure"?<><path d="M5 19a9 9 0 1 1 14 0"/><path d="m12 12 5-5M6 12H4m8-6V4m6 8h2"/><circle cx="12" cy="12" r="2"/></>:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>}</svg>;}
function WeatherGlyph({condition,day}:{condition:string;day:boolean}) {
  const rainy=/rain|shower|drizzle|storm/i.test(condition);const cloudy=/cloud|fog|mist/i.test(condition);
  return <span className={styles.forecastGlyph}>{rainy?<MetricIcon name="rain"/>:cloudy?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M6 18a5 5 0 0 1-1-10 6 6 0 0 1 11 0 5 5 0 1 1 2 10Z"/></svg>:day?<MetricIcon name="sun"/>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/></svg>}</span>;
}

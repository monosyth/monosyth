"use client";

import { useEffect, useState } from "react";
import styles from "@/app/weather/weather.module.css";

type Frame = { url: string; capturedAt: string | null };
export function StationCameraPreview({ src, showTimestamp = false }: { src: string; showTimestamp?: boolean }) {
  const [frame,setFrame] = useState<Frame | null>(null);
  const [failed,setFailed] = useState(false);
  const [now,setNow] = useState<number | null>(null);
  useEffect(() => {
    let stopped = false;
    let objectUrl: string | null = null;
    let busy = false;
    const controller = new AbortController();
    const load = async () => {
      if (document.hidden || busy) return;
      busy=true;
      try {
        const response=await fetch(src, {cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15_000)])});
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Camera unavailable");
        const blob=await response.blob();
        if (stopped) return;
        const nextUrl=URL.createObjectURL(blob);
        const oldUrl=objectUrl;
        objectUrl=nextUrl;
        setFrame({url:nextUrl,capturedAt:response.headers.get("x-station-camera-captured-at")});
        setFailed(false);setNow(Date.now());
        if (oldUrl) URL.revokeObjectURL(oldUrl);
      } catch {
        if (!stopped) {setFailed(true);setNow(Date.now());}
      } finally { busy=false; }
    };
    void load();
    const poll=setInterval(load,60_000);
    document.addEventListener("visibilitychange",load);
    return ()=>{stopped=true;controller.abort();clearInterval(poll);document.removeEventListener("visibilitychange",load);if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[src]);
  const capturedAt=frame?.capturedAt ? Date.parse(frame.capturedAt) : NaN;
  const stale=!Number.isFinite(capturedAt) || now===null || now-capturedAt>20*60_000;
  const label=Number.isFinite(capturedAt) ? new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(capturedAt) : "Capture time unavailable";
  return <div className={styles.cameraPreview}>
    {frame ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frame.url} alt="Latest captured view from the Shoreline weather station" width={800} height={450} decoding="async" className={styles.webcamImage} onError={()=>{setFrame(null);setFailed(true);}}/>
      {showTimestamp && <span className={styles.cameraTimestamp}>{failed ? "Connection interrupted" : stale ? "Last saved frame" : "Latest frame"} · {label} PT</span>}
    </> : <div className={styles.cameraDisconnected} role="status"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="7" y="14" width="26" height="21" rx="4"/><path d="m33 21 8-5v18l-8-5M9 8l31 33"/><circle cx="20" cy="24" r="5"/></svg><strong>{failed ? "Waiting for the camera" : "Connecting to the camera"}</strong><span>{failed ? "The station is still reporting weather" : "Loading the latest daylight image"}</span><small>Updates automatically when available</small></div>}
  </div>;
}

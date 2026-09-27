"use client";

/* These photographs have pre-generated, responsive copies in our own storage. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import photos from "@/lib/wedding/photos.json";
import styles from "./wedding.module.css";

type Photo = (typeof photos)[number];
const chapters = [
  { id: "all", label: "The whole night" },
  { id: "chapel", label: "The chapel" },
  { id: "party-bus", label: "The party bus" },
  { id: "downtown", label: "Downtown lights" },
  { id: "after-party", label: "The after-party" },
];
const highlights = [258, 118, 54, 41, 253, 163, 64, 83, 143, 175, 248, 214];
const orderedPhotos = [...highlights.map(id => photos.find(p => p.id === id)!), ...photos.filter(p => !highlights.includes(p.id))];
const chapterName = (id: string) => chapters.find(c => c.id === id)?.label ?? "Our wedding";
const imageAlt = (photo: Photo) => `Dallas and Scott’s Las Vegas wedding — ${chapterName(photo.chapter).toLowerCase()}, photograph ${photo.id}`;

function Icon({ name }: { name: "arrow" | "close" | "download" | "share" }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "arrow" && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {name === "close" && <path d="m6 6 12 12M6 18 18 6" />}
    {name === "download" && <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>}
    {name === "share" && <><path d="M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8" /></>}
  </svg>;
}

export default function WeddingGallery() {
  const [chapter, setChapter] = useState("all");
  const [limit, setLimit] = useState(48);
  const [active, setActive] = useState<number | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const filtered = chapter === "all" ? orderedPhotos : photos.filter(p => p.chapter === chapter);
  const current = active === null ? null : filtered[active];
  const hero = photos.find(p => p.id === 258)!;
  const cake = photos.find(p => p.id === 159)!;
  const isOpen = active !== null;

  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      opener.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  function move(delta: number) {
    setImageFailed(false);
    setActive(index => index === null ? null : (index + delta + filtered.length) % filtered.length);
  }
  function close() { setActive(null); }
  async function shareGallery() {
    const url = `${window.location.origin}/dallas-and-scott`;
    try {
      if (navigator.share) await navigator.share({ title: "Dallas & Scott · Our wedding in Vegas", url });
      else { await navigator.clipboard.writeText(url); setShareMessage("Gallery link copied"); }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setShareMessage(`Share this link: ${url}`);
    }
  }

  return <main className={styles.page} id="top">
    <a className={styles.skip} href="#photographs">Skip to photographs</a>
    <header className={styles.header}>
      <a href="#top" className={styles.monogram} aria-label="Dallas and Scott, back to top">D<span>&</span>S <span className={styles.smallStar}>✦</span></a>
      <span className={styles.headerLocation}>Las Vegas, Nevada</span>
      <a href="#photographs" className={styles.headerLink}>The photographs <span aria-hidden="true">↗</span></a>
    </header>

    <section className={styles.hero} aria-labelledby="wedding-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span aria-hidden="true">✦</span> With love, from Las Vegas</p>
        <h1 id="wedding-title">Dallas <span className={styles.amp}>&</span><br />Scott</h1>
        <p className={styles.tagline}>A little Vegas<br /><em>A whole lot of love</em></p>
        <p className={styles.intro}>The vows, the lights, the late-night magic.<br />And all of you who made it unforgettable.</p>
        <a href="#photographs" className={styles.cta}>Relive the night <Icon name="arrow" /></a>
        <div className={styles.heroFoot}><span>{photos.length} photographs</span><span aria-hidden="true">✧</span><span>One unforgettable night</span></div>
      </div>
      <div className={styles.heroPhotos}>
        <div className={styles.heroMain}><img src={hero.view} srcSet={`${hero.thumb} 720w, ${hero.view} 2200w`} sizes="(max-width: 700px) 70vw, 40vw" width={hero.width} height={hero.height} alt="Dallas and Scott beneath the glowing red California Hotel neon sign" fetchPriority="high" /></div>
        <div className={styles.heroSide}><img src={cake.view} srcSet={`${cake.thumb} 720w, ${cake.view} 2200w`} sizes="(max-width: 700px) 40vw, 22vw" width={cake.width} height={cake.height} alt="White wedding cake with red icing, surrounded by playing cards and poker chips" /><span>Lucky in love</span></div>
        <span className={styles.photoNote}>Just married · Las Vegas</span>
      </div>
    </section>

    <div className={styles.ribbon} aria-hidden="true"><span>Something old</span>✦<span>Something new</span>✦<span>Something borrowed</span>✦<span>Something Vegas</span></div>

    <section id="photographs" className={styles.collection} aria-labelledby="collection-title">
      <div className={styles.collectionHeading}>
        <div><p className={styles.eyebrow}>Our wedding, through the lens</p><h2 id="collection-title">What a <em>night</em></h2></div>
        <p>Every little moment, all in one place.<br />Tap a photo to take a closer look.</p>
      </div>
      <div className={styles.filterBar}>
        <div className={styles.filters} aria-label="Filter photographs">{chapters.map(c => <button key={c.id} type="button" aria-pressed={chapter === c.id} onClick={() => { setChapter(c.id); setLimit(48); }} className={chapter === c.id ? styles.selected : ""}>{c.label}<span>{c.id === "all" ? photos.length : photos.filter(p => p.chapter === c.id).length}</span></button>)}</div>
        <span className={styles.count} role="status">{filtered.length} photos</span>
      </div>
      <div className={styles.grid}>
        {filtered.slice(0,limit).map((photo,index) => <button key={photo.id} type="button" className={`${styles.photo} ${photo.width > photo.height ? styles.landscape : ""}`} aria-label={`Open ${imageAlt(photo)}`} onClick={event => { opener.current = event.currentTarget; setImageFailed(false); setActive(index); }}>
          <img src={photo.thumb} width={photo.width} height={photo.height} alt={imageAlt(photo)} loading="lazy" decoding="async" />
          <span className={styles.photoOverlay}><span>{chapterName(photo.chapter)}</span><span aria-hidden="true">↗</span></span>
        </button>)}
      </div>
      <div className={styles.more}>
        <p>Showing {Math.min(limit,filtered.length)} of {filtered.length} photographs</p>
        {limit < filtered.length ? <button className={styles.moreButton} onClick={() => setLimit(n => n + 48)}>More of the magic <span aria-hidden="true">+</span></button> : <span className={styles.endMark} aria-label="End of collection">✦</span>}
      </div>
    </section>

    <footer className={styles.footer}>
      <span className={styles.footerStar} aria-hidden="true">✦</span>
      <p className={styles.eyebrow}>Our favorite people, our favorite memories</p>
      <h2>So lucky to have <em>you</em></h2>
      <p>Thank you for being part of our story.<br />Find yourself, save your favorites, and keep a little of the night.</p>
      <button onClick={shareGallery} className={styles.share}><Icon name="share" /> Share the gallery</button>
      <p className={styles.shareStatus} role="status">{shareMessage}</p>
      <div className={styles.footerBottom}><span>Dallas & Scott</span><span>Made of love & a little Vegas magic</span><a href="#top">Back to top ↑</a></div>
    </footer>

    <dialog ref={dialog} className={styles.lightbox} aria-label="Wedding photo viewer" onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => {
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    }}>
      {current && <div className={styles.viewer}>
        <div className={styles.viewerHeader}><span className={styles.monogram}>D<span>&</span>S</span><p aria-live="polite">{active! + 1} <span>/ {filtered.length}</span></p><button aria-label="Close photo viewer" onClick={close} autoFocus><Icon name="close" /></button></div>
        <div className={styles.viewerStage} onTouchStart={e => { if (e.touches.length === 1) touch.current = {x:e.touches[0].clientX,y:e.touches[0].clientY}; else touch.current=null; }} onTouchEnd={e => { if (touch.current) { const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y; if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) move(dx<0?1:-1); } touch.current=null; }}>
          <button className={styles.previous} aria-label="Previous photo" onClick={() => move(-1)}><Icon name="arrow" /></button>
          {imageFailed ? <div className={styles.imageError}>This photo couldn’t load.<a href={current.view} target="_blank" rel="noreferrer">Open the photo directly ↗</a></div> : <img key={current.id} src={current.view} alt={imageAlt(current)} width={current.width} height={current.height} onError={() => setImageFailed(true)} />}
          <button className={styles.next} aria-label="Next photo" onClick={() => move(1)}><Icon name="arrow" /></button>
        </div>
        <div className={styles.viewerFooter}><div><span>{chapterName(current.chapter)}</span><small>Photo {String(current.id).padStart(3,"0")} · <span className={styles.swipeHint}>Swipe or use the arrows</span></small></div><a href={current.original} className={styles.download} download={`Dallas-and-Scott-${current.id}.jpg`}><Icon name="download" /><span>Download photo</span></a></div>
      </div>}
    </dialog>
  </main>;
}

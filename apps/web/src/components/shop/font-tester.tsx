"use client";

import { useState } from "react";
import styles from "@/app/shop/type/type.module.css";

export function FontTester() {
  const [text, setText] = useState("Make something wonderful");
  const [size, setSize] = useState(88);
  const [palette, setPalette] = useState("paper");
  const [kerning, setKerning] = useState(true);
  const [tabular, setTabular] = useState(false);
  const unsupported = [...new Set(Array.from(text).filter(char => !/[\x20-\x7E\n\r]/.test(char)))];
  return <section className={styles.tester} aria-labelledby="try-title">
    <div className={styles.sectionHeading}><h2 id="try-title">Put a few words to work</h2><span>One style / Bold</span></div>
    <div className={styles.controls}><label className={styles.words}>Your text<input maxLength={180} value={text} onChange={event => setText(event.target.value)} autoComplete="off" spellCheck={false} /></label><label>Size <output>{size} px</output><input aria-label="Font size" type="range" min={32} max={144} value={size} onChange={event => setSize(Number(event.target.value))} /></label><label>Palette<select value={palette} onChange={event => setPalette(event.target.value)}><option value="paper">Paper</option><option value="ink">Ink</option><option value="clay">Clay</option></select></label></div>
    <div className={styles.options}><label><input type="checkbox" checked={kerning} onChange={event => setKerning(event.target.checked)} /> Font kerning</label><label><input type="checkbox" checked={tabular} onChange={event => setTabular(event.target.checked)} /> Tabular digits</label><button onClick={() => { setText("Make something wonderful"); setSize(88); setPalette("paper"); setKerning(true); setTabular(false); }}>Reset</button></div>
    <div className={styles.sample} data-palette={palette} style={{ fontSize: `${size}px`, fontKerning: kerning ? "normal" : "none", fontFeatureSettings: `"tnum" ${tabular ? 1 : 0}` }}>{text || "Your words here"}</div>
    <p className={styles.small} role="status">{unsupported.length ? `The web demo uses basic Latin letters, numbers and punctuation. Some of your characters use a fallback font here. See the specimen for the full character set.` : "This web demo uses a limited preview font. The purchased font has 425 visible characters, including accents and symbols. See the specimen for exact coverage."}</p>
  </section>;
}

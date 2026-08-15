"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { formatInches, plainPatchGridFinished, precutMixPlan } from "@/lib/quilting/math";

import styles from "./quilt-guide.module.css";

const MIXES = [
  { key: "10-5", parent: 10, child: 5, label: "10″ square + 5″ charms" },
  { key: "10-2.5", parent: 10, child: 2.5, label: "10″ square + 2½″ minis" },
  { key: "5-2.5", parent: 5, child: 2.5, label: "5″ charm + 2½″ minis" },
] as const;

const SQUARE_TYPES = [
  { value: 10, label: "10″ squares", familiar: "Layer Cake-style" },
  { value: 5, label: "5″ squares", familiar: "Charm-style" },
  { value: 2.5, label: "2½″ squares", familiar: "Mini charm-style" },
] as const;

export function PrecutMixer() {
  const [mixKey, setMixKey] = useState<(typeof MIXES)[number]["key"]>("10-5");
  const mix = MIXES.find((item) => item.key === mixKey) ?? MIXES[0];
  const plan = useMemo(() => precutMixPlan(mix.parent, mix.child), [mix]);

  return (
    <section className={styles.calculatorCard} aria-labelledby="precut-mixer-title">
      <div className={styles.calculatorHead}>
        <div>
          <p className={styles.eyebrow}>Seam-loss matcher</p>
          <h2 id="precut-mixer-title">Mix big and small precuts</h2>
        </div>
        <span className={styles.calculatorBadge}>Live math</span>
      </div>

      <div className={styles.segmentedControl} aria-label="Choose a precut mix">
        {MIXES.map((item) => (
          <button
            type="button"
            key={item.key}
            className={mixKey === item.key ? styles.segmentedActive : ""}
            aria-pressed={mixKey === item.key}
            onClick={() => setMixKey(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.mixerVisual}>
        <div className={styles.mixerParent} style={{ "--patch-ratio": mix.parent } as CSSProperties}>
          <span>{formatInches(mix.parent)} cut</span>
          <strong>{formatInches(plan.parentFinished)}</strong>
          <small>finishes as one patch</small>
        </div>
        <span className={styles.mixerVs}>vs.</span>
        <div
          className={styles.mixerGrid}
          style={{ gridTemplateColumns: `repeat(${plan.countAcross}, 1fr)` }}
          aria-label={`${plan.countAcross} by ${plan.countAcross} smaller-patch grid`}
        >
          {Array.from({ length: plan.piecesPerParent }, (_, index) => (
            <i key={index} className={index % 2 ? styles.patchAlt : ""}>{formatInches(mix.child)}</i>
          ))}
        </div>
      </div>

      <div className={styles.resultStrip} aria-live="polite">
        <div><span>Smaller grid finishes</span><strong>{formatInches(plan.childGridFinished)}</strong></div>
        <div><span>Size lost to extra seams</span><strong>{formatInches(plan.difference)}</strong></div>
        <div><span>Smaller pieces needed</span><strong>{plan.piecesPerParent}</strong></div>
      </div>

      <div className={styles.solutionGrid}>
        <article>
          <span className={styles.cutLabel}>OPTION A · CUT</span>
          <h3>Trim the large patch to {formatInches(plan.trimParentCut)}</h3>
          <p>After its outer seams, it finishes at {formatInches(plan.childGridFinished)}—the same as the unsashed smaller grid.</p>
        </article>
        <article>
          <span className={styles.cutLabel}>OPTION B · CUT</span>
          <h3>Add {formatInches(plan.sashingCut)} internal sashing</h3>
          <p>That sashing finishes at {formatInches(plan.sashingFinished)} in every internal row and column, restoring the full {formatInches(plan.parentFinished)} footprint.</p>
        </article>
      </div>
    </section>
  );
}

export function PrecutGridCalculator() {
  const [cutSize, setCutSize] = useState(10);
  const [pieces, setPieces] = useState(42);
  const [columns, setColumns] = useState(6);
  const rows = Math.ceil(Math.max(1, pieces) / Math.max(1, columns));
  const finishedPatch = Math.max(0, cutSize - 0.5);
  const finishedWidth = plainPatchGridFinished(cutSize, columns);
  const finishedHeight = plainPatchGridFinished(cutSize, rows);
  const empty = rows * columns - pieces;

  function selectCut(next: number) {
    setCutSize(next);
    if (next === 10) setColumns(6);
    if (next === 5) setColumns(7);
    if (next === 2.5) setColumns(7);
  }

  return (
    <section className={styles.calculatorCard} aria-labelledby="pack-grid-title">
      <div className={styles.calculatorHead}>
        <div><p className={styles.eyebrow}>Whole-pack grid</p><h2 id="pack-grid-title">What does my stack make?</h2></div>
        <span className={styles.calculatorBadge}>¼″ seams</span>
      </div>
      <div className={styles.inputGridThree}>
        <label className={styles.fieldLabel}>
          <span>Square type</span>
          <select value={cutSize} onChange={(event) => selectCut(Number(event.target.value))}>
            {SQUARE_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label} · {item.familiar}</option>)}
          </select>
        </label>
        <label className={styles.fieldLabel}>
          <span>Actual pieces in pack</span>
          <input type="number" min="1" max="500" step="1" value={pieces} onChange={(event) => setPieces(clampInteger(event.target.valueAsNumber, 1, 500, 1))} />
        </label>
        <label className={styles.fieldLabel}>
          <span>Columns across</span>
          <input type="number" min="1" max="30" step="1" value={columns} onChange={(event) => setColumns(clampInteger(event.target.valueAsNumber, 1, 30, 1))} />
        </label>
      </div>
      <div className={styles.packPreview}>
        <div className={styles.packMiniGrid} style={{ gridTemplateColumns: `repeat(${Math.min(columns, 12)}, 1fr)` }}>
          {Array.from({ length: Math.min(rows * columns, 144) }, (_, index) => <i key={index} className={index >= pieces ? styles.patchEmpty : ""} />)}
        </div>
        <div className={styles.packSummary} aria-live="polite">
          <span>FINISHES AT</span>
          <strong>{formatInches(finishedWidth)} × {formatInches(finishedHeight)}</strong>
          <p>{columns} columns × {rows} rows · {formatInches(finishedPatch)} finished per patch</p>
          {empty ? <small>{empty} empty grid {empty === 1 ? "spot" : "spots"}; add fabric or use a partial last row.</small> : <small>Every grid spot is filled.</small>}
        </div>
      </div>
      <p className={styles.calculatorFootnote}>Pack counts are editable because collection and manufacturer counts vary. Pinked edges can also make the nominal size slightly different—measure first.</p>
    </section>
  );
}

function clampInteger(value: number, min: number, max: number, fallback: number) {
  const finite = Number.isFinite(value) ? Math.ceil(value) : fallback;
  return Math.min(max, Math.max(min, finite));
}

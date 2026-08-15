"use client";

import { useMemo, useState } from "react";

import { flyingGeesePlan, formatInches, hstPlan, qstPlan, type HstMethod } from "@/lib/quilting/math";

import { HstMethodDiagram } from "./diagrams";
import styles from "./quilt-guide.module.css";

type UnitTab = "hst" | "qst" | "geese";

export function TriangleCalculator() {
  const [tab, setTab] = useState<UnitTab>("hst");
  const [method, setMethod] = useState<HstMethod>("two");
  const [finished, setFinished] = useState(4);
  const [quantity, setQuantity] = useState(8);
  const hst = useMemo(() => hstPlan(finished, quantity, method), [finished, quantity, method]);
  const qst = useMemo(() => qstPlan(finished, quantity), [finished, quantity]);
  const geese = useMemo(() => flyingGeesePlan(finished, quantity), [finished, quantity]);

  return (
    <section className={styles.calculatorCard} aria-labelledby="triangle-calc-title">
      <div className={styles.calculatorHead}>
        <div><p className={styles.eyebrow}>Start with the result</p><h2 id="triangle-calc-title">Triangle unit calculator</h2></div>
        <span className={styles.calculatorBadge}>Cut upward · trim down</span>
      </div>
      <div className={styles.segmentedControl}>
        <button type="button" aria-pressed={tab === "hst"} onClick={() => setTab("hst")} className={tab === "hst" ? styles.segmentedActive : ""}>HST</button>
        <button type="button" aria-pressed={tab === "qst"} onClick={() => setTab("qst")} className={tab === "qst" ? styles.segmentedActive : ""}>QST / hourglass</button>
        <button type="button" aria-pressed={tab === "geese"} onClick={() => setTab("geese")} className={tab === "geese" ? styles.segmentedActive : ""}>Flying Geese</button>
      </div>
      <div className={styles.inputGridTwo}>
        <label className={styles.fieldLabel}>
          <span>{tab === "geese" ? "Finished goose height" : "Finished unit size"}</span>
          <div className={styles.inputWithUnit}><input type="number" min="0.5" max="24" step="0.125" value={finished} onChange={(event) => setFinished(clampNumber(event.target.valueAsNumber, 0.5, 24, 0.5))} /><b>in</b></div>
        </label>
        <label className={styles.fieldLabel}>
          <span>Units needed</span>
          <input type="number" min="1" max="1000" step="1" value={quantity} onChange={(event) => setQuantity(clampInteger(event.target.valueAsNumber, 1, 1000, 1))} />
        </label>
      </div>

      {tab === "hst" ? (
        <>
          <div className={styles.methodTabs}>
            {(["two", "four", "eight"] as const).map((item) => <button key={item} type="button" aria-pressed={method === item} onClick={() => setMethod(item)} className={method === item ? styles.methodTabActive : ""}><strong>{item === "two" ? "2 at a time" : item === "four" ? "4 at a time" : "8 at a time"}</strong><span>{item === "two" ? "steady + familiar" : item === "four" ? "bias outer edges" : "best for batches"}</span></button>)}
          </div>
          <div className={styles.triangleResultLayout}>
            <HstMethodDiagram method={method} />
            <div className={styles.cutReadout} aria-live="polite">
              <p><span className={styles.cutLabel}>CUT</span> {hst.batches} square {hst.batches === 1 ? "pair" : "pairs"} at</p>
              <strong>{formatInches(hst.trimFriendlyStart)}</strong>
              <small>
                trim-friendly start · {method === "four" ? "geometric minimum rounded up" : "exact benchmark"} {formatInches(hst.exactStart)}
              </small>
              <p><span className={styles.trimLabel}>TRIM TO</span> <b>{formatInches(hst.trimTo)} square</b></p>
              <p><span className={styles.finishLabel}>FINISHES AT</span> <b>{formatInches(finished)} square</b></p>
              <p className={styles.yieldLine}>Yields {hst.totalYield}; {hst.totalYield - quantity} spare.</p>
            </div>
          </div>
          {hst.biasEdges ? <div className={styles.warningBand}><strong>Bias-edge method.</strong> All four outside edges stretch easily. Starch first, lift rather than drag, and trim before handling further.</div> : null}
        </>
      ) : null}

      {tab === "qst" ? (
        <div className={styles.triangleResultLayout}>
          <div className={styles.qstIllustration} aria-hidden="true"><i /><i /><i /><i /></div>
          <div className={styles.cutReadout} aria-live="polite">
            <p><span className={styles.cutLabel}>CUT</span> {qst.batches} contrasting square {qst.batches === 1 ? "pair" : "pairs"} at</p>
            <strong>{formatInches(qst.trimFriendlyStart)}</strong>
            <small>trim-friendly · exact start {formatInches(qst.exactStart)}</small>
            <p><span className={styles.trimLabel}>TRIM TO</span> <b>{formatInches(qst.trimTo)} square</b></p>
            <p><span className={styles.finishLabel}>FINISHES AT</span> <b>{formatInches(finished)} square</b></p>
            <p className={styles.yieldLine}>Yields {qst.totalYield}; pair the first HSTs on the opposite diagonal.</p>
          </div>
        </div>
      ) : null}

      {tab === "geese" ? (
        <div className={styles.triangleResultLayout}>
          <div className={styles.gooseIllustration} aria-hidden="true"><span /></div>
          <div className={styles.cutReadout} aria-live="polite">
            <p><span className={styles.cutLabel}>CUT · GOOSE</span> {geese.batches} large {geese.batches === 1 ? "square" : "squares"} at</p>
            <strong>{formatInches(geese.largeSquare)}</strong>
            <p><span className={styles.cutLabel}>CUT · SKY</span> <b>{geese.batches * 4} squares at {formatInches(geese.smallSquares)}</b></p>
            <p><span className={styles.trimLabel}>TRIM TO</span> <b>{formatInches(geese.trimToWidth)} × {formatInches(geese.trimToHeight)}</b></p>
            <p><span className={styles.finishLabel}>FINISHES AT</span> <b>{formatInches(geese.finishedWidth)} × {formatInches(geese.finishedHeight)}</b></p>
            <p className={styles.yieldLine}>Four-at-a-time no-waste method yields {geese.totalYield}.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  const finite = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, finite));
}

function clampInteger(value: number, min: number, max: number, fallback: number) {
  return Math.ceil(clampNumber(value, min, max, fallback));
}

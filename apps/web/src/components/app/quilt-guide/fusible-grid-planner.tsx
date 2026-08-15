"use client";

import { useMemo, useState } from "react";

import { formatInches, fusibleGridPlan } from "@/lib/quilting/math";

import styles from "./quilt-guide.module.css";

const SQUARE_PRESETS = [
  { value: 1.5, label: "1½″ square", finished: "1″ visible" },
  { value: 2, label: "2″ square", finished: "1½″ visible" },
  { value: 2.5, label: "2½″ mini", finished: "2″ visible" },
  { value: 5, label: "5″ charm", finished: "4½″ visible" },
] as const;

export function FusibleGridPlanner() {
  const [tableLength, setTableLength] = useState(60);
  const [runnerWidth, setRunnerWidth] = useState(14);
  const [endDrop, setEndDrop] = useState(6);
  const [cutSquare, setCutSquare] = useState(2.5);
  const [borderFinished, setBorderFinished] = useState(1);
  const [packCount, setPackCount] = useState(42);

  const plan = useMemo(
    () => fusibleGridPlan({ tableLength, runnerWidth, endDrop, cutSquare, borderFinished, packCount }),
    [tableLength, runnerWidth, endDrop, cutSquare, borderFinished, packCount],
  );

  return (
    <section className={styles.plannerCard} aria-labelledby="fusible-grid-planner-title">
      <div className={styles.calculatorHead}>
        <div>
          <p className={styles.eyebrow}>Table-runner calculator</p>
          <h2 id="fusible-grid-planner-title">Plan a fusible-grid runner</h2>
        </div>
        <span className={styles.calculatorBadge}>Cut squares → finished runner</span>
      </div>

      <div className={styles.fusiblePlannerLayout}>
        <div className={styles.plannerControls}>
          <fieldset className={styles.controlGroup}>
            <legend>1 · Measure the table</legend>
            <div className={styles.inputGridThree}>
              <NumberInput label="Table length" value={tableLength} onChange={setTableLength} min={12} max={180} />
              <NumberInput label="Runner width" value={runnerWidth} onChange={setRunnerWidth} min={4} max={60} />
              <NumberInput label="Drop at each end" value={endDrop} onChange={setEndDrop} min={0} max={30} />
            </div>
            <p className={styles.controlHelp}>The target length is the tabletop plus the drop at both ends. Set drop to 0 for a runner that stays on the tabletop.</p>
          </fieldset>

          <fieldset className={styles.controlGroup}>
            <legend>2 · Choose the grid</legend>
            <div className={styles.squarePresetRow}>
              {SQUARE_PRESETS.map((preset) => (
                <button key={preset.value} type="button" aria-pressed={cutSquare === preset.value} className={cutSquare === preset.value ? styles.presetActive : ""} onClick={() => setCutSquare(preset.value)}>
                  <strong>{preset.label}</strong><span>{preset.finished}</span>
                </button>
              ))}
            </div>
            <div className={styles.inputGridThree}>
              <NumberInput label="Actual cut square" value={cutSquare} onChange={setCutSquare} min={1} max={12} step={0.25} />
              <NumberInput label="Finished border" value={borderFinished} onChange={setBorderFinished} min={0} max={12} step={0.25} />
              <CountInput label="Squares in your pack" value={packCount} onChange={setPackCount} />
            </div>
          </fieldset>
        </div>

        <div className={styles.fusiblePlannerResults} aria-live="polite">
          <div className={styles.finishedTopBanner}>
            <span>PLANNED FINISHED RUNNER</span>
            <strong>{formatInches(plan.runnerFinishedWidth)} × {formatInches(plan.runnerFinishedLength)}</strong>
            <small>target was {formatInches(runnerWidth)} × {formatInches(plan.targetRunnerLength)}</small>
          </div>
          <div className={styles.resultTiles}>
            <div><span>GRID</span><strong>{plan.columns} × {plan.rows}</strong><small>across × along</small></div>
            <div><span>CUT SQUARES</span><strong>{plan.squares}</strong><small>{plan.packs} pack{plan.packs === 1 ? "" : "s"} · {plan.spareSquares} spare</small></div>
            <div><span>FUSED LAYOUT</span><strong>{formatInches(plan.layoutWidth)} × {formatInches(plan.layoutLength)}</strong><small>before any seams</small></div>
            <div><span>RAW CENTER</span><strong>{formatInches(plan.centerRawWidth)} × {formatInches(plan.centerRawLength)}</strong><small>after grid seams</small></div>
          </div>
          <div className={styles.methodCutTicket}>
            <p><span>Cut</span><strong>{plan.squares} squares at {formatInches(plan.cutSquare)}</strong></p>
            <p><span>Grid yield</span><strong>Each square shows {formatInches(plan.finishedCell)} after seams</strong></p>
            <p><span>Sew first</span><strong>{plan.firstDirectionSeams} long seams, then clip intersections</strong></p>
            <p><span>Sew second</span><strong>{plan.secondDirectionSeams} cross seams with intersections nested</strong></p>
            <p><span>Border cut width</span><strong>{borderFinished > 0 ? formatInches(borderFinished + 0.5) : "No border"}</strong></p>
          </div>
          {plan.rows > 10 ? <p className={styles.largeLayoutWarning}><strong>Large-grid handling:</strong> this plan is {plan.rows} rows long. Quiltsmart recommends fusing no more than 10 rows at a time for a large project. Check the sectioning and joining instructions for the exact grid product before fusing the full {formatInches(plan.layoutLength)} layout.</p> : null}
          <p className={styles.calculatorFootnote}><strong>Important:</strong> use the spacing and fusing instructions printed for the exact interfacing you own. The “fused layout” is a planning footprint, not permission to redraw or resize a manufacturer’s printed grid.</p>
        </div>
      </div>
    </section>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 0.5 }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number }) {
  return <label className={styles.fieldLabel}><span>{label}</span><div className={styles.inputWithUnit}><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(clamp(event.target.valueAsNumber, min, max, min))} /><b>in</b></div></label>;
}

function CountInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className={styles.fieldLabel}><span>{label}</span><input type="number" value={value} min="1" max="1000" step="1" onChange={(event) => onChange(Math.ceil(clamp(event.target.valueAsNumber, 1, 1000, 1)))} /></label>;
}

function clamp(value: number, min: number, max: number, fallback: number) {
  const safe = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, safe));
}

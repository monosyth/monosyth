"use client";

import { useMemo, useState } from "react";

import { formatInches, quiltGridPlan } from "@/lib/quilting/math";

import { QuiltGridDiagram } from "./diagrams";
import styles from "./quilt-guide.module.css";

const SIZE_PRESETS = [
  { id: "baby", label: "Baby", width: 36, height: 45 },
  { id: "lap", label: "Lap", width: 48, height: 60 },
  { id: "throw", label: "Throw", width: 54, height: 72 },
  { id: "twin", label: "Twin", width: 70, height: 90 },
  { id: "full", label: "Full", width: 84, height: 90 },
  { id: "queen", label: "Queen", width: 90, height: 108 },
  { id: "king", label: "King", width: 108, height: 108 },
] as const;

const PACKS = [
  { id: "layer", label: "10″ squares", count: 42 },
  { id: "charm", label: "5″ charms", count: 42 },
  { id: "mini", label: "2½″ minis", count: 42 },
  { id: "strip", label: "2½″ strips", count: 40 },
  { id: "custom", label: "Custom bundle", count: 24 },
] as const;

export function QuiltPlanner() {
  const [targetWidth, setTargetWidth] = useState(54);
  const [targetHeight, setTargetHeight] = useState(72);
  const [blockFinished, setBlockFinished] = useState(9.5);
  const [sashingFinished, setSashingFinished] = useState(0);
  const [borderFinished, setBorderFinished] = useState(0);
  const [fit, setFit] = useState<"under" | "over">("over");
  const [packId, setPackId] = useState("layer");
  const [packCount, setPackCount] = useState(42);
  const [piecesPerBlock, setPiecesPerBlock] = useState(1);

  const plan = useMemo(() => quiltGridPlan({ targetWidth, targetHeight, blockFinished, sashingFinished, borderFinished, fit }), [targetWidth, targetHeight, blockFinished, sashingFinished, borderFinished, fit]);
  const piecesNeeded = plan.blocks * piecesPerBlock;
  const packsNeeded = Math.ceil(piecesNeeded / packCount);
  const piecesLeft = packsNeeded * packCount - piecesNeeded;

  function choosePreset(width: number, height: number) {
    setTargetWidth(width);
    setTargetHeight(height);
  }

  function choosePack(nextId: string) {
    setPackId(nextId);
    const pack = PACKS.find((item) => item.id === nextId);
    if (pack) setPackCount(pack.count);
  }

  return (
    <section className={styles.plannerCard} aria-labelledby="quilt-planner-title">
      <div className={styles.calculatorHead}>
        <div><p className={styles.eyebrow}>No-math grid builder</p><h2 id="quilt-planner-title">Plan from the size you want</h2></div>
        <span className={styles.calculatorBadge}>Blocks → finished top</span>
      </div>

      <div className={styles.presetRow}>
        {SIZE_PRESETS.map((preset) => <button type="button" key={preset.id} aria-pressed={targetWidth === preset.width && targetHeight === preset.height} onClick={() => choosePreset(preset.width, preset.height)} className={targetWidth === preset.width && targetHeight === preset.height ? styles.presetActive : ""}><strong>{preset.label}</strong><span>{preset.width} × {preset.height}</span></button>)}
      </div>
      <p className={styles.presetCaveat}>These are planning targets, not universal standards. Measure the person, bed, or space when fit matters.</p>

      <div className={styles.plannerWorkspace}>
        <div className={styles.plannerControls}>
          <fieldset className={styles.controlGroup}>
            <legend>1 · Target top</legend>
            <div className={styles.inputGridTwo}>
              <NumberInput label="Target width" value={targetWidth} onChange={setTargetWidth} />
              <NumberInput label="Target height" value={targetHeight} onChange={setTargetHeight} />
            </div>
          </fieldset>
          <fieldset className={styles.controlGroup}>
            <legend>2 · Construction</legend>
            <div className={styles.inputGridThree}>
              <NumberInput label="Finished block" value={blockFinished} onChange={setBlockFinished} step={0.5} min={0.5} />
              <NumberInput label="Finished sashing" value={sashingFinished} onChange={setSashingFinished} step={0.25} />
              <NumberInput label="Finished border" value={borderFinished} onChange={setBorderFinished} step={0.25} />
            </div>
            <div className={styles.fitToggle}>
              <button type="button" aria-pressed={fit === "over"} onClick={() => setFit("over")} className={fit === "over" ? styles.fitActive : ""}>Meet or exceed target</button>
              <button type="button" aria-pressed={fit === "under"} onClick={() => setFit("under")} className={fit === "under" ? styles.fitActive : ""}>Stay under target</button>
            </div>
          </fieldset>
          <fieldset className={styles.controlGroup}>
            <legend>3 · Pack math</legend>
            <div className={styles.inputGridThree}>
              <label className={styles.fieldLabel}><span>Precut type</span><select value={packId} onChange={(event) => choosePack(event.target.value)}>{PACKS.map((pack) => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</select></label>
              <label className={styles.fieldLabel}><span>Actual count / pack</span><input type="number" min="1" max="1000" step="1" value={packCount} onChange={(event) => setPackCount(clampInteger(event.target.valueAsNumber, 1, 1000, 1))} /></label>
              <label className={styles.fieldLabel}><span>Pieces / block</span><input type="number" min="1" max="1000" step="1" value={piecesPerBlock} onChange={(event) => setPiecesPerBlock(clampInteger(event.target.valueAsNumber, 1, 1000, 1))} /></label>
            </div>
          </fieldset>
        </div>

        <div className={styles.plannerResults}>
          <QuiltGridDiagram columns={plan.columns} rows={plan.rows} />
          <div className={styles.finishedTopBanner} aria-live="polite">
            <span>PLANNED FINISHED TOP</span>
            <strong>{formatInches(plan.actualWidth)} × {formatInches(plan.actualHeight)}</strong>
            <small>{plan.actualWidth === targetWidth && plan.actualHeight === targetHeight ? "Exact target" : `${formatDelta(plan.overWidth, "width")} · ${formatDelta(plan.overHeight, "height")}`}</small>
          </div>
          <div className={styles.resultTiles}>
            <div><span>GRID</span><strong>{plan.columns} × {plan.rows}</strong><small>columns × rows</small></div>
            <div><span>BLOCKS</span><strong>{plan.blocks}</strong><small>finished at {formatInches(blockFinished)}</small></div>
            <div><span>PRECUTS</span><strong>{piecesNeeded}</strong><small>{piecesPerBlock} per block</small></div>
            <div><span>PACKS</span><strong>{packsNeeded}</strong><small>{piecesLeft} pieces left</small></div>
          </div>
          <div className={styles.cutSummary}>
            <p><span className={styles.cutLabel}>CUT SASHING</span><strong>{sashingFinished > 0 ? `${formatInches(sashingFinished + 0.5)} wide` : "None"}</strong></p>
            <p><span className={styles.cutLabel}>CUT BORDER</span><strong>{borderFinished > 0 ? `${formatInches(borderFinished + 0.5)} wide` : "None"}</strong></p>
            <small>Cut widths include the two ¼″ seam allowances. Measure the real quilt center before cutting final border lengths.</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function NumberInput({ label, value, onChange, step = 1, min = 0, max = 300 }: { label: string; value: number; onChange: (value: number) => void; step?: number; min?: number; max?: number }) {
  return <label className={styles.fieldLabel}><span>{label}</span><div className={styles.inputWithUnit}><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clampNumber(event.target.valueAsNumber, min, max, min))} /><b>in</b></div></label>;
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  const finite = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, finite));
}

function clampInteger(value: number, min: number, max: number, fallback: number) {
  return Math.ceil(clampNumber(value, min, max, fallback));
}

function formatDelta(value: number, dimension: string) {
  if (Math.abs(value) < 0.001) return `exact ${dimension}`;
  return `${formatInches(Math.abs(value))} ${value > 0 ? "over" : "under"} ${dimension}`;
}

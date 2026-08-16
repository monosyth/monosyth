"use client";

import { useMemo, useState, type CSSProperties } from "react";

import {
  fabricOutcomePlan,
  formatInches,
  squareSubcutPlan,
  stripSetOutcomePlan,
  unitProjectPlan,
  type FabricOutcomeMethod,
} from "@/lib/quilting/math";

import styles from "./quilt-guide.module.css";

const SQUARE_PRESETS = [
  { size: 10, label: "10″ layer square" },
  { size: 5, label: "5″ charm" },
  { size: 2.5, label: "2½″ mini" },
] as const;

const METHODS: readonly { value: FabricOutcomeMethod; label: string; note: string }[] = [
  { value: "plain", label: "Leave whole", note: "1 patch per square" },
  { value: "hst-two", label: "2 HSTs", note: "2 squares → 2" },
  { value: "hst-four", label: "4 HSTs", note: "bias outside edges" },
  { value: "hst-eight", label: "8 HSTs", note: "2 squares → 8" },
  { value: "qst", label: "2 QSTs", note: "hourglass units" },
] as const;

const UNIT_LAYOUTS = [
  { label: "4-unit square", rows: 2, columns: 2, plain: 0 },
  { label: "8 HST + center", rows: 3, columns: 3, plain: 1 },
  { label: "8-unit rectangle", rows: 2, columns: 4, plain: 0 },
  { label: "16-unit square", rows: 4, columns: 4, plain: 0 },
] as const;

const PROJECT_LAYOUTS = [
  { label: "9 blocks · square", rows: 3, columns: 3 },
  { label: "9 blocks · one row", rows: 1, columns: 9 },
  { label: "10 blocks · runner", rows: 2, columns: 5 },
  { label: "12 blocks · runner", rows: 2, columns: 6 },
] as const;

const METHOD_NOUN: Record<FabricOutcomeMethod, string> = {
  plain: "patches",
  "hst-two": "HSTs",
  "hst-four": "HSTs",
  "hst-eight": "HSTs",
  qst: "QSTs",
};

export function FabricOutcomeCalculator() {
  const [startSize, setStartSize] = useState(5);
  const [startCount, setStartCount] = useState(18);
  const [method, setMethod] = useState<FabricOutcomeMethod>("hst-eight");
  const [easyIncrement, setEasyIncrement] = useState<0.25 | 0.5>(0.5);
  const [unitRows, setUnitRows] = useState(3);
  const [unitColumns, setUnitColumns] = useState(3);
  const [plainCells, setPlainCells] = useState(1);
  const [blockRows, setBlockRows] = useState(3);
  const [blockColumns, setBlockColumns] = useState(3);

  const outcome = useMemo(() => fabricOutcomePlan({ startSize, startCount, method, easyIncrement }), [startSize, startCount, method, easyIncrement]);
  const project = useMemo(() => unitProjectPlan({
    unitFinished: outcome.practicalFinished,
    availableUnits: outcome.totalUnits,
    yieldPerBatch: outcome.yieldPerBatch,
    piecesPerBatch: outcome.piecesPerBatch,
    unitRowsPerBlock: unitRows,
    unitColumnsPerBlock: unitColumns,
    plainCellsPerBlock: method === "plain" ? 0 : plainCells,
    blockRows,
    blockColumns,
  }), [outcome, unitRows, unitColumns, plainCells, method, blockRows, blockColumns]);

  function chooseMethod(next: FabricOutcomeMethod) {
    setMethod(next);
    if (next === "plain") {
      setUnitRows(3);
      setUnitColumns(3);
      setPlainCells(0);
    } else if (next === "hst-eight") {
      setUnitRows(3);
      setUnitColumns(3);
      setPlainCells(1);
    } else {
      setUnitRows(2);
      setUnitColumns(2);
      setPlainCells(0);
    }
  }

  const noun = METHOD_NOUN[method];
  const unitCellCount = Math.min(36, project.cellsPerBlock);
  const blockPreviewCount = Math.min(36, project.requestedBlocks);

  return (
    <section className={styles.fabricOutcomeCard} aria-labelledby="fabric-outcome-title">
      <div className={styles.calculatorHead}>
        <div>
          <p className={styles.eyebrow}>Start with the fabric</p>
          <h2 id="fabric-outcome-title">What will these squares make?</h2>
        </div>
        <span className={styles.calculatorBadge}>Easy ruler sizes first</span>
      </div>

      <div className={styles.segmentedControl} aria-label="Common starting square sizes">
        {SQUARE_PRESETS.map((preset) => (
          <button key={preset.size} type="button" aria-pressed={startSize === preset.size} className={startSize === preset.size ? styles.segmentedActive : ""} onClick={() => setStartSize(preset.size)}>{preset.label}</button>
        ))}
        <button type="button" aria-pressed={!SQUARE_PRESETS.some((preset) => preset.size === startSize)} className={!SQUARE_PRESETS.some((preset) => preset.size === startSize) ? styles.segmentedActive : ""} onClick={() => setStartSize(6)}>Custom</button>
      </div>

      <div className={styles.inputGridThree}>
        <label className={styles.fieldLabel}><span>Square cut size</span><div className={styles.inputWithUnit}><input type="number" min="1" max="30" step="0.125" value={startSize} onChange={(event) => setStartSize(clampNumber(event.target.valueAsNumber, 1, 30, 5))} /><b>in</b></div></label>
        <label className={styles.fieldLabel}><span>Squares you have</span><input type="number" min="1" max="1000" step="1" value={startCount} onChange={(event) => setStartCount(clampInteger(event.target.valueAsNumber, 1, 1000, 18))} /></label>
        <label className={styles.fieldLabel}><span>Round finished units to</span><select value={easyIncrement} onChange={(event) => setEasyIncrement(Number(event.target.value) as 0.25 | 0.5)}><option value="0.5">Nearest ½″ down · easiest</option><option value="0.25">Nearest ¼″ down · use more fabric</option></select></label>
      </div>

      <fieldset className={styles.outcomeFieldset}>
        <legend>How will you use each square pair?</legend>
        <div className={styles.methodTabs}>
          {METHODS.map((item) => <button key={item.value} type="button" aria-pressed={method === item.value} className={method === item.value ? styles.methodTabActive : ""} onClick={() => chooseMethod(item.value)}><strong>{item.label}</strong><span>{item.note}</span></button>)}
        </div>
      </fieldset>

      {outcome.practicalFinished > 0 ? (
        <>
          <div className={styles.fabricOutcomeSummary} aria-live="polite">
            <div><span>START</span><strong>{outcome.startCount} × {formatInches(outcome.startSize)}</strong><small>{outcome.batches} complete {outcome.batches === 1 ? "batch" : "batches"}{outcome.leftoverStartPieces ? ` · ${outcome.leftoverStartPieces} square left` : ""}</small></div>
            <div><span>YOU GET</span><strong>{outcome.totalUnits} {noun}</strong><small>{outcome.yieldPerBatch} from each batch</small></div>
            <div><span>{method === "plain" ? "RAW SIZE" : "TRIM EACH TO"}</span><strong>{formatInches(outcome.trimTo)}</strong><small>square before the next seams</small></div>
            <div><span>FINISHED UNIT</span><strong>{formatInches(outcome.practicalFinished)}</strong><small>visible after assembly</small></div>
          </div>

          <div className={styles.exactVsEasy}>
            <strong>Recommended: {formatInches(outcome.practicalFinished)} finished.</strong>
            <span>The geometric ceiling is about {formatInches(outcome.exactMaximumFinished)}. The smaller recommendation gives you room to trim and lands on a clear ruler line.</span>
          </div>
          {outcome.biasEdges ? <div className={styles.warningBand}><strong>Four-at-a-time HST warning.</strong> Every outside edge is bias. Starch before sewing, press without dragging, and trim before moving the units around.</div> : null}

          <div className={styles.fabricLayoutSection}>
            <div className={styles.fabricLayoutHead}>
              <div><p className={styles.eyebrow}>Build one block</p><h3>Choose the unit layout inside each block</h3></div>
              <p>The cells can all be {noun}, or you can reserve plain cells—for example, eight HSTs plus one center square.</p>
            </div>
            <div className={styles.segmentedControl} aria-label="Unit layouts inside one block">
              {UNIT_LAYOUTS.map((layout) => {
                const active = unitRows === layout.rows && unitColumns === layout.columns && plainCells === layout.plain;
                return <button key={layout.label} type="button" aria-pressed={active} className={active ? styles.segmentedActive : ""} onClick={() => { setUnitRows(layout.rows); setUnitColumns(layout.columns); setPlainCells(layout.plain); }}>{layout.label}</button>;
              })}
            </div>
            <div className={styles.inputGridThree}>
              <label className={styles.fieldLabel}><span>Unit rows per block</span><input type="number" min="1" max="12" step="1" value={unitRows} onChange={(event) => setUnitRows(clampInteger(event.target.valueAsNumber, 1, 12, 3))} /></label>
              <label className={styles.fieldLabel}><span>Unit columns per block</span><input type="number" min="1" max="12" step="1" value={unitColumns} onChange={(event) => setUnitColumns(clampInteger(event.target.valueAsNumber, 1, 12, 3))} /></label>
              <label className={styles.fieldLabel}><span>Plain cells per block</span><input type="number" min="0" max={Math.max(0, unitRows * unitColumns - 1)} step="1" disabled={method === "plain"} value={method === "plain" ? 0 : Math.min(plainCells, unitRows * unitColumns - 1)} onChange={(event) => setPlainCells(clampInteger(event.target.valueAsNumber, 0, Math.max(0, unitRows * unitColumns - 1), 0))} /></label>
            </div>
            <div className={styles.fabricBlockResult}>
              <div className={styles.fabricUnitPreview} style={{ "--unit-columns": Math.min(12, project.unitColumnsPerBlock) } as CSSProperties} aria-hidden="true">
                {Array.from({ length: unitCellCount }, (_, index) => <i key={index} className={index >= project.piecedUnitsPerBlock ? styles.fabricPlainCell : method === "plain" ? styles.fabricSquareCell : method === "qst" ? styles.fabricQstCell : styles.fabricHstCell} />)}
              </div>
              <div><span>ONE BLOCK FINISHES AT</span><strong>{formatInches(project.blockFinishedWidth)} × {formatInches(project.blockFinishedHeight)}</strong><p>{project.piecedUnitsPerBlock} {noun}{project.plainCellsPerBlock ? ` + ${project.plainCellsPerBlock} plain ${project.plainCellsPerBlock === 1 ? "cell" : "cells"}` : ""}</p></div>
            </div>
          </div>

          <div className={styles.fabricLayoutSection}>
            <div className={styles.fabricLayoutHead}>
              <div><p className={styles.eyebrow}>Join the blocks</p><h3>Choose the final block layout</h3></div>
              <p>Nine blocks can be a 3 × 3 square or a 1 × 9 row. Those use the same pieces but produce very different dimensions.</p>
            </div>
            <div className={styles.segmentedControl} aria-label="Final block layouts">
              {PROJECT_LAYOUTS.map((layout) => {
                const active = blockRows === layout.rows && blockColumns === layout.columns;
                return <button key={layout.label} type="button" aria-pressed={active} className={active ? styles.segmentedActive : ""} onClick={() => { setBlockRows(layout.rows); setBlockColumns(layout.columns); }}>{layout.label}</button>;
              })}
            </div>
            <div className={styles.inputGridTwo}>
              <label className={styles.fieldLabel}><span>Block rows</span><input type="number" min="1" max="30" step="1" value={blockRows} onChange={(event) => setBlockRows(clampInteger(event.target.valueAsNumber, 1, 30, 3))} /></label>
              <label className={styles.fieldLabel}><span>Block columns</span><input type="number" min="1" max="30" step="1" value={blockColumns} onChange={(event) => setBlockColumns(clampInteger(event.target.valueAsNumber, 1, 30, 3))} /></label>
            </div>

            <div className={styles.fabricProjectResult} aria-live="polite">
              <div className={styles.fabricProjectPreview} style={{ "--block-columns": Math.min(12, project.blockColumns) } as CSSProperties} aria-hidden="true">
                {Array.from({ length: blockPreviewCount }, (_, index) => <i key={index} />)}
              </div>
              <div className={styles.fabricProjectNumbers}>
                <span>FINISHED PATCHWORK CENTER · BEFORE BORDERS</span>
                <strong>{formatInches(project.projectFinishedWidth)} × {formatInches(project.projectFinishedHeight)}</strong>
                <p>{project.blockColumns} block columns × {project.blockRows} block rows · {project.requestedBlocks} blocks total</p>
                <dl>
                  <div><dt>{noun} required</dt><dd>{project.requiredUnits}</dd></div>
                  <div><dt>Starting squares required</dt><dd>{project.requiredStartingPieces}</dd></div>
                  <div><dt>Available from your input</dt><dd>{outcome.totalUnits} {noun}</dd></div>
                  <div><dt>{project.enoughUnits ? "Units left" : "Units short"}</dt><dd>{Math.abs(project.unitsShortOrLeft)}</dd></div>
                </dl>
              </div>
            </div>
            {!project.enoughUnits ? <div className={styles.warningBand}><strong>You need more starting fabric for this layout.</strong> It needs {project.requiredStartingPieces} starting squares in complete batches. Your current {startCount} squares make at most {project.maxBlocks} complete blocks in this unit layout.</div> : null}
            {project.enoughUnits && project.spareFromRequirement ? <p className={styles.calculatorFootnote}>Complete production batches make {project.producedForRequirement} {noun}; this layout uses {project.requiredUnits}, leaving {project.spareFromRequirement} spare from the required batches.</p> : null}
          </div>
        </>
      ) : <div className={styles.warningBand}><strong>These starting squares are too small for a reliable result with this method.</strong> Choose a larger square, a smaller rounding increment, or a method with fewer units per batch.</div>}
    </section>
  );
}

export function SquareSubcutCalculator() {
  const [parentSize, setParentSize] = useState(10);
  const [parentCount, setParentCount] = useState(1);
  const [subcutSize, setSubcutSize] = useState(2.5);
  const plan = useMemo(() => squareSubcutPlan({ parentSize, parentCount, subcutSize }), [parentSize, parentCount, subcutSize]);
  return (
    <section className={styles.calculatorCard} aria-labelledby="square-subcut-title">
      <div className={styles.calculatorHead}><div><p className={styles.eyebrow}>Cut large squares smaller</p><h2 id="square-subcut-title">Square subcut yield</h2></div><span className={styles.calculatorBadge}>Before sewing</span></div>
      <div className={styles.inputGridThree}>
        <label className={styles.fieldLabel}><span>Starting square</span><div className={styles.inputWithUnit}><input type="number" min="1" max="30" step="0.125" value={parentSize} onChange={(event) => setParentSize(clampNumber(event.target.valueAsNumber, 1, 30, 10))} /><b>in</b></div></label>
        <label className={styles.fieldLabel}><span>Starting squares</span><input type="number" min="1" max="1000" step="1" value={parentCount} onChange={(event) => setParentCount(clampInteger(event.target.valueAsNumber, 1, 1000, 1))} /></label>
        <label className={styles.fieldLabel}><span>Subcut square</span><div className={styles.inputWithUnit}><input type="number" min="0.5" max={parentSize} step="0.125" value={Math.min(subcutSize, parentSize)} onChange={(event) => setSubcutSize(clampNumber(event.target.valueAsNumber, 0.5, parentSize, 2.5))} /><b>in</b></div></label>
      </div>
      <div className={styles.resultStrip} aria-live="polite"><div><span>Across each direction</span><strong>{plan.across}</strong></div><div><span>Total cut squares</span><strong>{plan.totalPieces}</strong></div><div><span>Each finishes at</span><strong>{formatInches(plan.finishedEach)}</strong></div></div>
      <p className={styles.calculatorFootnote}>Uses {formatInches(plan.usedWidth)} of each parent dimension and leaves {formatInches(plan.remainderPerSide)} at the far edge before squaring or trimming allowances.</p>
    </section>
  );
}

export function StripSetOutcomeCalculator() {
  const [stripWidth, setStripWidth] = useState(2.5);
  const [usableLength, setUsableLength] = useState(40);
  const [stripCount, setStripCount] = useState(3);
  const plan = useMemo(() => stripSetOutcomePlan({ stripWidth, usableLength, stripCount }), [stripWidth, usableLength, stripCount]);
  return (
    <section className={styles.calculatorCard} aria-labelledby="strip-outcome-title">
      <div className={styles.calculatorHead}><div><p className={styles.eyebrow}>Start with strips</p><h2 id="strip-outcome-title">Strip-set outcome</h2></div><span className={styles.calculatorBadge}>¼″ seams</span></div>
      <div className={styles.inputGridThree}>
        <label className={styles.fieldLabel}><span>Cut strip width</span><div className={styles.inputWithUnit}><input type="number" min="0.75" max="12" step="0.125" value={stripWidth} onChange={(event) => setStripWidth(clampNumber(event.target.valueAsNumber, 0.75, 12, 2.5))} /><b>in</b></div></label>
        <label className={styles.fieldLabel}><span>Usable straightened length</span><div className={styles.inputWithUnit}><input type="number" min="1" max="120" step="0.125" value={usableLength} onChange={(event) => setUsableLength(clampNumber(event.target.valueAsNumber, 1, 120, 40))} /><b>in</b></div></label>
        <label className={styles.fieldLabel}><span>Strips in the set</span><input type="number" min="2" max="30" step="1" value={stripCount} onChange={(event) => setStripCount(clampInteger(event.target.valueAsNumber, 2, 30, 3))} /></label>
      </div>
      <div className={styles.resultStrip} aria-live="polite"><div><span>Strip set · raw width</span><strong>{formatInches(plan.rawSetWidth)}</strong></div><div><span>Finished width</span><strong>{formatInches(plan.finishedSetWidth)}</strong></div><div><span>Square rail units</span><strong>{plan.squareSubcuts}</strong></div></div>
      <div className={styles.solutionGrid}><article><span className={styles.cutLabel}>SUBCUT</span><h3>{plan.squareSubcuts} squares at {formatInches(plan.squareUnitRaw)}</h3><p>Each rail unit finishes at {formatInches(plan.squareUnitFinished)} after it is joined into the next patchwork layer.</p></article><article><span className={styles.cutLabel}>REMAINDER</span><h3>{formatInches(plan.remainderLength)} of length</h3><p>Enter the truly usable, straightened strip length. Do not count selvage or the edge removed while squaring.</p></article></div>
    </section>
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  const finite = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, finite));
}

function clampInteger(value: number, min: number, max: number, fallback: number) {
  return Math.floor(clampNumber(value, min, max, fallback));
}

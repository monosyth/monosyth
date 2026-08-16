"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { QUILT_BLOCKS } from "@/lib/quilting/data";
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
  const [blockSlug, setBlockSlug] = useState("custom");
  const [blockFinished, setBlockFinished] = useState(9.5);
  const [sashingFinished, setSashingFinished] = useState(0);
  const [borderFinished, setBorderFinished] = useState(0);
  const [fit, setFit] = useState<"under" | "over">("over");
  const [packId, setPackId] = useState("layer");
  const [packCount, setPackCount] = useState(42);
  const [piecesPerBlock, setPiecesPerBlock] = useState(1);

  const plan = useMemo(() => quiltGridPlan({ targetWidth, targetHeight, blockFinished, sashingFinished, borderFinished, fit }), [targetWidth, targetHeight, blockFinished, sashingFinished, borderFinished, fit]);
  const packMathReady = piecesPerBlock > 0;
  const piecesNeeded = plan.blocks * piecesPerBlock;
  const packsNeeded = packMathReady ? Math.ceil(piecesNeeded / packCount) : 0;
  const piecesSupplied = packsNeeded * packCount;
  const piecesLeft = piecesSupplied - piecesNeeded;
  const selectedPack = PACKS.find((item) => item.id === packId) ?? PACKS[0];
  const selectedBlock = QUILT_BLOCKS.find((block) => block.slug === blockSlug);

  function choosePreset(width: number, height: number) {
    setTargetWidth(width);
    setTargetHeight(height);
  }

  function choosePack(nextId: string) {
    setPackId(nextId);
    const pack = PACKS.find((item) => item.id === nextId);
    if (pack) setPackCount(pack.count);
    if (blockSlug !== "custom") setPiecesPerBlock(0);
  }

  function chooseBlock(nextSlug: string) {
    setBlockSlug(nextSlug);
    const block = QUILT_BLOCKS.find((item) => item.slug === nextSlug);
    if (block) {
      setBlockFinished(parseDisplayInches(block.finishedSize));
      setPiecesPerBlock(0);
    } else {
      setPiecesPerBlock(1);
    }
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
            <legend>2 · Block and construction</legend>
            <label className={styles.fieldLabel}>
              <span>Named block · optional</span>
              <select value={blockSlug} onChange={(event) => chooseBlock(event.target.value)}>
                <option value="custom">Custom block size</option>
                {QUILT_BLOCKS.map((block) => <option key={block.slug} value={block.slug}>{block.name} · {block.finishedSize} finished</option>)}
              </select>
            </label>
            {selectedBlock ? (
              <div className={styles.selectedBlockSummary}>
                <div><strong>{selectedBlock.name}</strong><span>{selectedBlock.unitType} · {selectedBlock.difficulty}</span></div>
                <p>{selectedBlock.summary}</p>
                <Link href={`/app/quilt-guide/block-library/${selectedBlock.slug}`}>Open the full block recipe →</Link>
              </div>
            ) : null}
            <div className={styles.inputGridThree}>
              <NumberInput label={selectedBlock ? "Finished block · from recipe" : "Finished block"} value={blockFinished} onChange={(value) => { setBlockFinished(value); setBlockSlug("custom"); }} step={0.5} min={0.5} />
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
              <label className={styles.fieldLabel}><span>Pieces from this pack / block</span><input type="number" min="0" max="1000" step="1" value={piecesPerBlock} onChange={(event) => setPiecesPerBlock(clampInteger(event.target.valueAsNumber, 0, 1000, 0))} /></label>
            </div>
            {packMathReady ? (
              <div className={styles.packPurchaseSummary} aria-live="polite">
                <div>
                  <span>BUY FOR THE BLOCKS</span>
                  <strong>{packsNeeded} {packsNeeded === 1 ? "PACK" : "PACKS"}</strong>
                  <b>of {selectedPack.label}</b>
                </div>
                <dl>
                  <div><dt>Blocks</dt><dd>{plan.blocks}</dd></div>
                  <div><dt>Pieces required</dt><dd>{piecesNeeded}</dd></div>
                  <div><dt>Pieces supplied</dt><dd>{piecesSupplied}</dd></div>
                  <div><dt>Pieces left</dt><dd>{piecesLeft}</dd></div>
                </dl>
                <p>This covers the entered pieces from the selected pack used inside the blocks only. Other fabrics, sashing, borders, backing, and binding are separate.</p>
              </div>
            ) : (
              <div className={styles.packMathMissing} aria-live="polite">
                <span>ONE INPUT NEEDED</span>
                <strong>Enter how many {selectedPack.label} one block consumes.</strong>
                <p>A named block can mix precuts, yardage, and multiple fabrics. The planner will not invent one pack number and risk telling you to buy the wrong amount.</p>
              </div>
            )}
            <p className={styles.packHelpLink}>Not sure how many precut pieces one block uses? <Link href="/app/quilt-guide/fabric-outcomes">Work forward from the fabric first →</Link></p>
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
            <div className={styles.packResultTile}><span>PACKS TO BUY</span><strong>{packMathReady ? packsNeeded : "—"}</strong><small>{packMathReady ? `${piecesSupplied} supplied · ${piecesLeft} left` : "enter pieces / block"}</small></div>
          </div>
          <div className={styles.cutSummary}>
            <p><span className={styles.cutLabel}>CUT SASHING</span><strong>{sashingFinished > 0 ? `${formatInches(sashingFinished + 0.5)} wide` : "None"}</strong></p>
            <p><span className={styles.cutLabel}>CUT BORDER</span><strong>{borderFinished > 0 ? `${formatInches(borderFinished + 0.5)} wide` : "None"}</strong></p>
            <small>Cut widths include the two ¼″ seam allowances. Measure the real quilt center before cutting final border lengths.</small>
          </div>
          {selectedBlock ? (
            <section className={styles.blockMaterialTotals} aria-labelledby="whole-quilt-cutting-title">
              <div className={styles.blockMaterialTotalsHead}>
                <div><span>SELECTED BLOCK · {plan.blocks} TOTAL</span><h3 id="whole-quilt-cutting-title">Whole-quilt block cutting totals</h3></div>
                <Link href={`/app/quilt-guide/block-library/${selectedBlock.slug}`}>Instructions →</Link>
              </div>
              <div className={styles.blockMaterialGrid}>
                {selectedBlock.cuts.map((group) => (
                  <article key={group.fabric}>
                    <strong>{group.fabric}</strong>
                    <ul>{group.cuts.map((cut) => <li key={cut}>{scaleCutForBlocks(cut, plan.blocks)}</li>)}</ul>
                  </article>
                ))}
              </div>
              <p><strong>Precut note:</strong> {selectedBlock.precutNote}</p>
              <small>Totals multiply the published one-block cut list by {plan.blocks}. They do not perform two-dimensional nesting inside a layer square or yardage cut; use the pack field only for the precut pieces you know one block consumes.</small>
            </section>
          ) : null}
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

function parseDisplayInches(value: string) {
  const fractions: Record<string, number> = { "⅛": 0.125, "¼": 0.25, "⅜": 0.375, "½": 0.5, "⅝": 0.625, "¾": 0.75, "⅞": 0.875 };
  const whole = Number(value.match(/\d+/)?.[0] ?? 0);
  const fraction = Object.entries(fractions).find(([symbol]) => value.includes(symbol))?.[1] ?? 0;
  return whole + fraction;
}

function scaleCutForBlocks(cut: string, blocks: number) {
  const standard = cut.match(/^(\d+)(?:\s+needed)?\s*[—-]\s*(.+)$/);
  if (standard) return `${Number(standard[1]) * blocks} — ${standard[2]}`;
  const optional = cut.match(/^Optional:\s*(\d+)\s+(.+)$/i);
  if (optional) return `Optional: up to ${Number(optional[1]) * blocks} ${optional[2]}`;
  return `${blocks} blocks × ${cut}`;
}

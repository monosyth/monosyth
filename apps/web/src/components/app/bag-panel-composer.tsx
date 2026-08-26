"use client";

import { useId } from "react";

import styles from "@/components/app/bag-panel-composer.module.css";
import {
  formatDecimal,
  formatInches,
  type BagPatternPlan,
} from "@/lib/sewing/bag-pattern";
import {
  minimumSquareForGrid,
  type OuterPanelComposition,
  type OuterPanelDesign,
  type OuterPanelScope,
  type OuterPiecingMode,
} from "@/lib/sewing/panel-composition";

type BagPanelComposerProps = {
  plan: BagPatternPlan;
  value: OuterPanelDesign;
  composition: OuterPanelComposition;
  onChange: (value: OuterPanelDesign) => void;
};

const modeChoices: ReadonlyArray<{
  id: OuterPiecingMode;
  label: string;
  shorthand: string;
}> = [
  { id: "solid", label: "Solid", shorthand: "1 panel" },
  { id: "vertical-strips", label: "Vertical", shorthand: "strip columns" },
  { id: "horizontal-strips", label: "Horizontal", shorthand: "strip rows" },
  { id: "block-grid", label: "Square grid", shorthand: "quilt blocks" },
];

const scopeChoices: ReadonlyArray<{
  id: OuterPanelScope;
  label: string;
}> = [
  { id: "both", label: "Front + back" },
  { id: "front", label: "Front only" },
  { id: "back", label: "Back only" },
];

function CountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min="2"
        max="24"
        step="1"
        value={Math.round(value)}
        onChange={(event) =>
          onChange(
            Math.min(
              24,
              Math.max(2, Math.round(event.target.valueAsNumber || 2)),
            ),
          )
        }
      />
    </label>
  );
}

function InchField({
  label,
  hint,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}<small>{hint}</small></span>
      <span className={styles.inchInput}>
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step="0.125"
          value={formatDecimal(value, 3)}
          onChange={(event) =>
            onChange(Math.max(min, event.target.valueAsNumber || 0))
          }
        />
        <b>in</b>
      </span>
    </label>
  );
}

function PanelDiagram({
  label,
  face,
  plan,
  composition,
}: {
  label: string;
  face: "front" | "back";
  plan: BagPatternPlan;
  composition: OuterPanelComposition;
}) {
  const rawId = useId().replaceAll(":", "");
  const clipId = `panel-build-${face}-${rawId}`;
  const minX = Math.min(0, plan.leftTopInset);
  const width = Math.max(0.01, plan.boundingCutWidth);
  const height = Math.max(0.01, plan.cutHeight);
  const x = (value: number) => 18 + ((value - minX) / width) * 224;
  const y = (value: number) => 14 + (value / height) * 142;
  const c = plan.cornerCut;
  const outline = [
    `M ${x(plan.leftTopInset)} ${y(0)}`,
    `L ${x(plan.cutWidth - plan.rightTopInset)} ${y(0)}`,
    `L ${x(plan.cutWidth)} ${y(height - c)}`,
    `L ${x(plan.cutWidth - c)} ${y(height - c)}`,
    `L ${x(plan.cutWidth - c)} ${y(height)}`,
    `L ${x(c)} ${y(height)}`,
    `L ${x(c)} ${y(height - c)}`,
    `L ${x(0)} ${y(height - c)}`,
    "Z",
  ].join(" ");
  const isPieced =
    composition.design.mode !== "solid" &&
    (composition.design.scope === "both" ||
      composition.design.scope === face);
  const piecedBottom = composition.contrastJoinY ?? height;
  const colors = ["#9b8df0", "#ff8ba9", "#4fe3e6", "#f6ba4c", "#bce859"];
  const columnBoundaries =
    composition.design.mode === "vertical-strips" ||
    composition.design.mode === "block-grid"
      ? [0, ...composition.columnSeams, width]
      : [0, width];
  const rowBoundaries =
    composition.design.mode === "horizontal-strips" ||
    composition.design.mode === "block-grid"
      ? [0, ...composition.rowSeams, piecedBottom]
      : [0, piecedBottom];
  const visibleCells = isPieced
    ? rowBoundaries.slice(0, -1).flatMap((topEdge, row) =>
        columnBoundaries.slice(0, -1).map((leftEdge, column) => ({
          key: `${row}-${column}`,
          left: leftEdge,
          right: columnBoundaries[column + 1],
          top: topEdge,
          bottom: rowBoundaries[row + 1],
          color: colors[(row * 2 + column) % colors.length],
        })),
      )
    : [];

  return (
    <figure className={styles.panelFigure}>
      <svg viewBox="0 0 260 178" role="img" aria-label={`${label} outer-panel build preview`}>
        <defs>
          <clipPath id={clipId}>
            <path d={outline} />
          </clipPath>
        </defs>
        <path d={outline} className={styles.panelBase} />
        <g clipPath={`url(#${clipId})`}>
          {visibleCells.map((cell) => (
            <rect
              key={cell.key}
              x={x(minX + cell.left)}
              y={y(cell.top)}
              width={x(minX + cell.right) - x(minX + cell.left)}
              height={y(cell.bottom) - y(cell.top)}
              fill={cell.color}
              opacity=".72"
            />
          ))}
          {composition.contrastJoinY !== null ? (
            <rect
              x={x(minX)}
              y={y(composition.contrastJoinY)}
              width={x(minX + width) - x(minX)}
              height={y(height) - y(composition.contrastJoinY)}
              className={styles.contrastFill}
            />
          ) : null}
        </g>
        <path d={outline} className={styles.panelOutline} />
        {composition.contrastJoinY !== null ? (
          <line
            x1={x(minX)}
            y1={y(composition.contrastJoinY)}
            x2={x(minX + width)}
            y2={y(composition.contrastJoinY)}
            className={styles.contrastSeam}
            clipPath={`url(#${clipId})`}
          />
        ) : null}
        <text x="130" y="171">{label.toUpperCase()} · {isPieced ? composition.modeLabel.toUpperCase() : "SOLID"}</text>
      </svg>
    </figure>
  );
}

export function BagPanelComposer({
  plan,
  value,
  composition,
  onChange,
}: BagPanelComposerProps) {
  const update = (patch: Partial<OuterPanelDesign>) =>
    onChange({ ...value, ...patch });
  const selectedBlockCount =
    composition.piecedPanelCount * value.rows * value.columns;

  return (
    <section className={styles.composer} aria-labelledby="outer-panel-build-title">
      <header className={styles.header}>
        <div>
          <p>Outer-panel builder</p>
          <h2 id="outer-panel-build-title">Piece it, trim it, then shape it</h2>
          <span>Build the front and back from strips or quilt blocks without changing the finished bag size.</span>
        </div>
        <span className={composition.valid ? styles.ready : styles.check}>
          {composition.valid ? "FIT READY" : "CHECK FIT"}
        </span>
      </header>

      <div className={styles.builderGrid}>
        <div className={styles.controls}>
          <fieldset>
            <legend>Panel style</legend>
            <div className={styles.modeGrid}>
              {modeChoices.map((choice) => (
                <button
                  type="button"
                  key={choice.id}
                  aria-pressed={value.mode === choice.id}
                  onClick={() => update({ mode: choice.id })}
                >
                  <strong>{choice.label}</strong>
                  <small>{choice.shorthand}</small>
                </button>
              ))}
            </div>
          </fieldset>

          {value.mode !== "solid" ? (
            <fieldset>
              <legend>Apply piecing to</legend>
              <div className={styles.segmented}>
                {scopeChoices.map((choice) => (
                  <button
                    type="button"
                    key={choice.id}
                    aria-pressed={value.scope === choice.id}
                    onClick={() => update({ scope: choice.id })}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {value.mode === "vertical-strips" ? (
            <div className={styles.fieldGrid}>
              <CountField label="Strip columns" value={value.columns} onChange={(columns) => update({ columns })} />
            </div>
          ) : null}
          {value.mode === "horizontal-strips" ? (
            <div className={styles.fieldGrid}>
              <CountField label="Strip rows" value={value.rows} onChange={(rows) => update({ rows })} />
            </div>
          ) : null}
          {value.mode === "block-grid" ? (
            <>
              <div className={styles.fieldGrid}>
                <CountField label="Rows" value={value.rows} onChange={(rows) => update({ rows })} />
                <CountField label="Columns" value={value.columns} onChange={(columns) => update({ columns })} />
                <InchField
                  label="Square size"
                  hint={value.blockSizeBasis === "cut" ? "before sewing" : "visible in grid"}
                  value={value.blockSize}
                  min={0.5}
                  onChange={(blockSize) => update({ blockSize })}
                />
              </div>
              <div className={styles.segmented} aria-label="Square size meaning">
                <button type="button" aria-pressed={value.blockSizeBasis === "cut"} onClick={() => update({ blockSizeBasis: "cut" })}>Cut size</button>
                <button type="button" aria-pressed={value.blockSizeBasis === "finished"} onClick={() => update({ blockSizeBasis: "finished" })}>Finished in grid</button>
              </div>
              <button
                type="button"
                className={styles.fitButton}
                onClick={() => update({ blockSize: minimumSquareForGrid(plan, value) })}
              >
                Fit square size to this panel
              </button>
            </>
          ) : null}

          {value.mode !== "solid" || value.contrastEnabled ? (
            <div className={styles.fieldGrid}>
              <InchField label={value.mode === "solid" ? "Band join allowance" : "Piecing allowance"} hint={value.mode === "solid" ? "upper-to-bottom seam" : "between small pieces"} value={value.piecingAllowance} min={0.125} onChange={(piecingAllowance) => update({ piecingAllowance })} />
              {value.mode !== "solid" ? <InchField label="Trim margin" hint="each outside edge" value={value.trimMargin} min={0} onChange={(trimMargin) => update({ trimMargin })} /> : null}
            </div>
          ) : null}

          <div className={styles.contrastControl}>
            <button
              type="button"
              role="switch"
              aria-checked={value.contrastEnabled}
              onClick={() => update({ contrastEnabled: !value.contrastEnabled })}
            >
              <i aria-hidden="true"><span /></i>
              <span><strong>Contrast bottom</strong><small>separate fabric wraps under the base</small></span>
            </button>
            {value.contrastEnabled ? (
              <InchField label="Finished rise" hint="visible above base" value={value.contrastRise} min={0.5} onChange={(contrastRise) => update({ contrastRise })} />
            ) : null}
          </div>

          <p className={styles.allowanceNote}><strong>Keep these allowances separate:</strong> piecing allowance changes the small-piece cuts; the bag seam allowance is already built into the final body panel. A 1/4-inch trim margin suits ordinary piecing; use about 1/2 inch when quilting or adding foam because the slab can shrink.</p>
        </div>

        <div className={styles.previewArea}>
          <div className={styles.panelPair}>
            <PanelDiagram label="Front" face="front" plan={plan} composition={composition} />
            <PanelDiagram label="Back" face="back" plan={plan} composition={composition} />
          </div>

          <div className={styles.metrics}>
            <div>
              <span>Final outer blank</span>
              <strong>{formatInches(composition.targetWidth)} × {formatInches(composition.targetHeight)}</strong>
            </div>
            {value.mode !== "solid" ? (
              <div>
                <span>{value.mode === "block-grid" ? "Grid after seams" : "Oversize slab"}</span>
                <strong>{formatInches(composition.sewnWidth)} × {formatInches(composition.sewnHeight)}</strong>
              </div>
            ) : null}
            {value.mode !== "solid" ? (
              <div>
                <span>Centered trim total</span>
                <strong>{formatInches(Math.max(0, composition.trimWidth))} W × {formatInches(Math.max(0, composition.trimHeight))} H</strong>
              </div>
            ) : null}
            {value.mode === "block-grid" ? (
              <div>
                <span>Squares to cut</span>
                <strong>{selectedBlockCount} at {formatInches(composition.blockCutSize)}</strong>
              </div>
            ) : null}
            {value.contrastEnabled ? (
              <div>
                <span>Contrast band cut</span>
                <strong>2 at {formatInches(composition.targetWidth)} × {formatInches(composition.contrastCutHeight)}</strong>
              </div>
            ) : null}
          </div>

          {composition.warnings.length ? (
            <div className={styles.warnings} role="alert">
              {composition.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}

          <div className={styles.workflow}>
            <div>
              <span>Cut + sew order</span>
              <strong>{composition.modeLabel}{value.mode !== "solid" ? ` · ${composition.scopeLabel}` : ""}</strong>
            </div>
            <ol>
              {composition.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

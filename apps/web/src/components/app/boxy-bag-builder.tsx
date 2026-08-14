"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "@/app/app/boxy-bag/boxy-bag.module.css";
import { useAuth } from "@/components/auth/auth-provider";
import { NoBottomSeamPattern } from "@/components/app/no-bottom-seam-pattern";
import {
  calculateBoxyBagPlan,
  calculateBoxyBagPlanFromPanels,
} from "@/lib/sewing/boxy-bag";

type Unit = "in" | "cm";
type InputMode = "finished" | "panels";
type Draft = {
  length: number;
  height: number;
  seamAllowance: number;
  cornerGuideInches: number;
};
type PanelDraft = {
  width: number;
  height: number;
};

const INCH_TO_CM = 2.54;
const TEMPLATE_GUIDES_INCHES = [1, 1.5, 2, 2.5] as const;
const presets = [
  { name: "Notions", note: "1½″ corner", length: 7, height: 3, cornerGuideInches: 1.5 },
  { name: "Everyday", note: "2″ corner", length: 9, height: 4, cornerGuideInches: 2 },
  { name: "Travel", note: "2½″ corner", length: 12, height: 5, cornerGuideInches: 2.5 },
] as const;

const defaultDraft: Draft = {
  length: 9,
  height: 4,
  seamAllowance: 0.25,
  cornerGuideInches: 2,
};
const defaultPanelDraft: PanelDraft = {
  width: 13,
  height: 15.5,
};

function roundForInput(value: number) {
  return Math.round(value * 1000) / 1000;
}

function convertDraft(draft: Draft, nextUnit: Unit): Draft {
  const factor = nextUnit === "cm" ? INCH_TO_CM : 1 / INCH_TO_CM;
  return {
    ...draft,
    length: roundForInput(draft.length * factor),
    height: roundForInput(draft.height * factor),
    seamAllowance: roundForInput(draft.seamAllowance * factor),
  };
}

function convertPanelDraft(draft: PanelDraft, nextUnit: Unit): PanelDraft {
  const factor = nextUnit === "cm" ? INCH_TO_CM : 1 / INCH_TO_CM;
  return {
    width: roundForInput(draft.width * factor),
    height: roundForInput(draft.height * factor),
  };
}

function guideInUnit(guideInches: number, unit: Unit) {
  return unit === "in" ? guideInches : guideInches * INCH_TO_CM;
}

function formatInches(value: number) {
  const roundedEighths = Math.round(value * 8);
  const whole = Math.floor(roundedEighths / 8);
  let numerator = roundedEighths % 8;

  if (numerator === 0) return `${whole}″`;

  const divisor = numerator % 4 === 0 ? 4 : numerator % 2 === 0 ? 2 : 1;
  numerator /= divisor;
  const denominator = 8 / divisor;

  if (whole === 0) return `${numerator}/${denominator}″`;
  return `${whole} ${numerator}/${denominator}″`;
}

function formatCentimeters(value: number) {
  return `${Number(value.toFixed(1))} cm`;
}

function formatMeasurement(value: number, unit: Unit) {
  return unit === "in" ? formatInches(value) : formatCentimeters(value);
}

function formatEquivalent(value: number, unit: Unit) {
  return unit === "in"
    ? formatCentimeters(value * INCH_TO_CM)
    : formatInches(value / INCH_TO_CM);
}

function measurementPair(value: number, unit: Unit) {
  return `${formatMeasurement(value, unit)} (${formatEquivalent(value, unit)})`;
}

function getPlan(draft: Draft, panelDraft: PanelDraft, inputMode: InputMode, unit: Unit) {
  const shared = {
    length: draft.length,
    height: draft.height,
    cornerCut: guideInUnit(draft.cornerGuideInches, unit),
    seamAllowance: draft.seamAllowance,
  };

  if (inputMode === "panels") {
    return calculateBoxyBagPlanFromPanels({
      panelLength: panelDraft.width,
      panelWidth: panelDraft.height,
      cornerCut: shared.cornerCut,
      seamAllowance: shared.seamAllowance,
    });
  }

  return calculateBoxyBagPlan(shared);
}

function buildCuttingList(draft: Draft, panelDraft: PanelDraft, inputMode: InputMode, unit: Unit) {
  const plan = getPlan(draft, panelDraft, inputMode, unit);
  const guide = formatInches(draft.cornerGuideInches);
  const panelSize = `${measurementPair(plan.panelLength, unit)} × ${measurementPair(plan.panelWidth, unit)}`;
  const zipperTabSize = unit === "in" ? 2.5 : 6;

  return [
    `BOXY BAG — FULL NO-BOTTOM-SEAM PATTERN`,
    `Tool corner: ${guide}`,
    `Seam allowance: ${measurementPair(draft.seamAllowance, unit)}`,
    `Calculator mode: ${inputMode === "finished" ? "finished bag → panel cuts" : "starting panels → finished bag"}`,
    `Finished bag: ${measurementPair(plan.finishedBaseLength, unit)} L × ${measurementPair(plan.finishedDepth, unit)} W × ${measurementPair(plan.finishedHeight, unit)} H`,
    `Bottom footprint: ${measurementPair(plan.finishedBaseLength, unit)} × ${measurementPair(plan.finishedDepth, unit)}`,
    ``,
    `CUT BEFORE SEWING`,
    `Outer: cut 1 rectangle @ ${panelSize}`,
    `Lining: cut 1 rectangle @ ${panelSize}`,
    `Interfacing (recommended): cut 1 rectangle @ ${panelSize} and fuse to the outer wrong side`,
    `Zipper tabs: cut 2 squares @ ${measurementPair(zipperTabSize, unit)}`,
    `Nylon coil zipper: 1 @ ${measurementPair(plan.recommendedZipper, unit)} or longer; trim after making the tabs`,
    ``,
    `THE TOOL CUT HAPPENS AFTER THE ZIPPER + SHORT END SEAMS`,
    `Flatten the sewn unit with the zipper running horizontally through the center, folded outer above it and folded lining below it.`,
    `Remove 1 square from each of the 4 raw corners of that flat unit = 4 ${guide} tool cuts total.`,
    `Place the ${guide} tool corner flush with each RAW corner. It intentionally cuts through the newly sewn short-end seam; reinforce the cut ends immediately.`,
    `Finished depth = 2 × (${formatMeasurement(plan.cornerCut, unit)} tool − ${formatMeasurement(draft.seamAllowance, unit)} seam allowance) = ${formatMeasurement(plan.finishedDepth, unit)}.`,
    ``,
    `ASSEMBLE — ONE OUTER / ONE LINING / ZIPPER-GAP METHOD`,
    `1. Fuse the interfacing to the outer wrong side. Fold and topstitch the two zipper-tab squares into narrow tabs.`,
    `2. ZIPPER SIDE 1: Outer right side up; zipper right side down on one short edge; lining right side down on top. Sew through all 3 layers at ${measurementPair(draft.seamAllowance, unit)}.`,
    `3. Turn both fabrics away from the teeth, press, and topstitch through outer + lining close to the fold.`,
    `4. ZIPPER SIDE 2 / OUTER: bring the opposite short edge of the outer right side to the free zipper tape. Sew at ${measurementPair(draft.seamAllowance, unit)} to form the folded outer loop.`,
    `5. ZIPPER SIDE 2 / LINING: open the zipper and put its pull inside a centered 2 in / 5 cm gap. Sew the opposite lining short edge to the same zipper tape, stopping on both sides of that gap. Press and topstitch, still leaving the gap open.`,
    `6. Close the zipper. Baste one folded tab over each zipper end, catching only the outer and lining layers beside the zipper. Keep the tab folds pointing inward.`,
    `7. Put the zipper pull back inside the turning gap. Turn the tube wrong side out and separate it flat: folded OUTER on one side, folded LINING on the other, zipper running horizontally through the center.`,
    `8. Center the zipper precisely. Align the two raw short ends and sew each end straight across at ${measurementPair(draft.seamAllowance, unit)} through outer, zipper/tab, and lining. Hand-wheel over nylon coil teeth.`,
    `9. NOW CUT: place the ${guide} acrylic corner flush with each raw corner of the sewn flat unit and cut all 4 squares. Reinforce the exposed ends of both short-end seams.`,
    `10. BOX + JOIN each matching corner pair: open the outer cutout into a straight cap, open its lining mate beside it, align the two cap edges with the short-end seam centered, and sew one continuous diagonal cap seam at ${measurementPair(draft.seamAllowance, unit)}. Repeat for all 4 corners.`,
    `11. Pull the bag right side out through the zipper-seam gap. Shape all corners, open the zipper fully, then topstitch the gap closed. The raw allowances remain between outer and lining.`,
  ].join("\n");
}

export function BoxyBagBuilder() {
  const { status } = useAuth();
  const [unit, setUnit] = useState<Unit>("in");
  const [inputMode, setInputMode] = useState<InputMode>("finished");
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [panelDraft, setPanelDraft] = useState<PanelDraft>(defaultPanelDraft);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const plan = useMemo(
    () => getPlan(draft, panelDraft, inputMode, unit),
    [draft, panelDraft, inputMode, unit],
  );
  const isValid =
    draft.seamAllowance > 0 &&
    plan.cornerCut > draft.seamAllowance &&
    plan.finishedBaseLength > 0 &&
    plan.finishedHeight > 0;

  function chooseUnit(nextUnit: Unit) {
    if (nextUnit === unit) return;
    setDraft((current) => convertDraft(current, nextUnit));
    setPanelDraft((current) => convertPanelDraft(current, nextUnit));
    setUnit(nextUnit);
  }

  function chooseInputMode(nextMode: InputMode) {
    if (nextMode === inputMode) return;

    if (nextMode === "panels") {
      setPanelDraft({
        width: roundForInput(plan.panelLength),
        height: roundForInput(plan.panelWidth),
      });
    } else {
      setDraft((current) => ({
        ...current,
        length: roundForInput(plan.finishedBaseLength),
        height: roundForInput(plan.finishedHeight),
      }));
    }

    setInputMode(nextMode);
    setCopyState("idle");
  }

  function updateDraft(key: "length" | "height" | "seamAllowance", value: number) {
    setDraft((current) => ({
      ...current,
      [key]: Number.isFinite(value) ? Math.max(0, value) : 0,
    }));
    setCopyState("idle");
  }

  function selectCorner(cornerGuideInches: number) {
    setDraft((current) => ({ ...current, cornerGuideInches }));
    setCopyState("idle");
  }

  function updatePanelDraft(key: keyof PanelDraft, value: number) {
    setPanelDraft((current) => ({
      ...current,
      [key]: Number.isFinite(value) ? Math.max(0, value) : 0,
    }));
    setCopyState("idle");
  }

  function applyPreset(preset: (typeof presets)[number]) {
    const factor = unit === "in" ? 1 : INCH_TO_CM;
    setDraft((current) => ({
      ...current,
      length: roundForInput(preset.length * factor),
      height: roundForInput(preset.height * factor),
      cornerGuideInches: preset.cornerGuideInches,
    }));
    setInputMode("finished");
    setCopyState("idle");
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(buildCuttingList(draft, panelDraft, inputMode, unit));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  if (status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.loadingSpinner} aria-hidden="true" />
          Opening sewing studio…
        </div>
      </main>
    );
  }

  if (status !== "signed_in") {
    return (
      <main className={styles.page}>
        <section className={styles.gateCard}>
          <span className={styles.gateIcon} aria-hidden="true">✦</span>
          <p className={styles.eyebrow}>Private studio tool</p>
          <h1>Sign in through the studio first.</h1>
          <p>The boxy bag builder lives with your other Monosyth admin tools.</p>
          <Link href="/app" className={styles.primaryButton}>Go to studio sign-in →</Link>
        </section>
      </main>
    );
  }

  const measurementStep = unit === "in" ? 0.125 : 0.1;
  const cornerCutLabel = formatMeasurement(plan.cornerCut, unit);
  const finishedDepthLabel = formatMeasurement(plan.finishedDepth, unit);
  const finishedLengthLabel = formatMeasurement(plan.finishedBaseLength, unit);
  const finishedHeightLabel = formatMeasurement(plan.finishedHeight, unit);

  return (
    <main className={styles.page}>
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Breadcrumb">
          <Link href="/app" className={styles.backLink}>← Monosyth Studio</Link>
          <span className={styles.navRule} />
          <span className={styles.navCurrent}>Boxy bag builder</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Sewing studio / Full pattern maker</p>
            <h1>Size it. Sew the zipper.<br /><span>Then cut the corners.</span></h1>
            <p className={styles.heroIntro}>
              Start with a finished bag size or panels you already have. Choose
              an acrylic corner, then follow the illustrated no-bottom-seam pattern.
            </p>
            <div className={styles.heroTags} aria-label="Pattern details">
              <span>Fully lined</span>
              <span>1 outer + 1 lining</span>
              <span>4 tool sizes</span>
            </div>
          </div>
          <BagDiagram
            length={finishedLengthLabel}
            width={finishedDepthLabel}
            height={finishedHeightLabel}
          />
        </header>

        <div className={styles.workspace}>
          <aside className={styles.controls}>
            <div className={styles.cardHeading}>
              <div>
                <p className={styles.cardNumber}>01</p>
                <h2>Bag + tool</h2>
              </div>
              <div className={styles.unitToggle} aria-label="Measurement unit">
                <button type="button" aria-pressed={unit === "in"} className={unit === "in" ? styles.unitActive : ""} onClick={() => chooseUnit("in")}>inches</button>
                <button type="button" aria-pressed={unit === "cm"} className={unit === "cm" ? styles.unitActive : ""} onClick={() => chooseUnit("cm")}>cm</button>
              </div>
            </div>

            <fieldset className={styles.templatePicker}>
              <legend>What do you know?</legend>
              <p>Work forward from a finished bag size, or backward from two matching rectangles you already cut.</p>
              <div className={styles.templateChoices}>
                <button
                  type="button"
                  aria-pressed={inputMode === "finished"}
                  className={inputMode === "finished" ? styles.templateChoiceActive : ""}
                  onClick={() => chooseInputMode("finished")}
                >
                  <strong>Finished bag</strong>
                  <small>Choose final size → get both rectangles</small>
                </button>
                <button
                  type="button"
                  aria-pressed={inputMode === "panels"}
                  className={inputMode === "panels" ? styles.templateChoiceActive : ""}
                  onClick={() => chooseInputMode("panels")}
                >
                  <strong>My panels</strong>
                  <small>Enter panel size → get final bag</small>
                </button>
              </div>
            </fieldset>

            {inputMode === "finished" ? (
              <div className={styles.presets}>
                {presets.map((preset) => (
                  <button type="button" key={preset.name} onClick={() => applyPreset(preset)}>
                    <span>{preset.name}</span>
                    <small>{preset.note}</small>
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.fields}>
              {inputMode === "finished" ? (
                <>
                  <MeasurementInput id="bag-length" label="Finished length" note="Along the zipper" value={draft.length} unit={unit} step={measurementStep} onChange={(value) => updateDraft("length", value)} />
                  <MeasurementInput id="bag-height" label="Finished height" note="Top to bottom" value={draft.height} unit={unit} step={measurementStep} onChange={(value) => updateDraft("height", value)} />
                </>
              ) : (
                <>
                  <MeasurementInput id="panel-width" label="Starting panel width" note="Short edge attached to zipper" value={panelDraft.width} unit={unit} step={measurementStep} onChange={(value) => updatePanelDraft("width", value)} />
                  <MeasurementInput id="panel-height" label="Starting panel height" note="Long edge wraps around bag" value={panelDraft.height} unit={unit} step={measurementStep} onChange={(value) => updatePanelDraft("height", value)} />
                </>
              )}
              <MeasurementInput id="bag-seam" label="Seam allowance" note="Used throughout" value={draft.seamAllowance} unit={unit} step={measurementStep} onChange={(value) => updateDraft("seamAllowance", value)} />
            </div>

            <fieldset className={styles.templatePicker}>
              <legend>Choose the tool corner</legend>
              <p>These are the four printed square corners on your acrylic template.</p>
              <div className={styles.templateChoices}>
                {TEMPLATE_GUIDES_INCHES.map((guide) => {
                  const cut = guideInUnit(guide, unit);
                  const finishedDepth = Math.max(0, (cut - draft.seamAllowance) * 2);
                  const selected = draft.cornerGuideInches === guide;

                  return (
                    <button
                      type="button"
                      key={guide}
                      aria-pressed={selected}
                      className={selected ? styles.templateChoiceActive : ""}
                      onClick={() => selectCorner(guide)}
                    >
                      <strong>{formatInches(guide)}</strong>
                      <small>{formatMeasurement(finishedDepth, unit)} finished depth</small>
                    </button>
                  );
                })}
              </div>
              <div className={styles.derivedEnd}>
                <span>Selected cut</span>
                <strong>{formatInches(draft.cornerGuideInches)} square</strong>
                <small>makes the bag {finishedDepthLabel} front to back</small>
              </div>
            </fieldset>

            {!isValid ? (
              <p className={styles.validation} role="alert">
                {plan.cornerCut <= draft.seamAllowance
                  ? "The seam allowance must be smaller than the selected tool corner."
                  : inputMode === "panels"
                    ? "The rectangles are too small for this tool corner and seam allowance."
                    : "Enter a finished length and height greater than zero."}
              </p>
            ) : null}

            <div className={styles.methodNote}>
              <span aria-hidden="true">◎</span>
              <p>
                <strong>Zipper-gap method · no bottom seam</strong> One outer rectangle and one lining rectangle each fold around from one zipper edge to the other. The four acrylic cuts happen only after the zipper is centered and the two short ends are sewn.
              </p>
            </div>
          </aside>

          <section className={styles.results} aria-live="polite">
            <div className={styles.resultsHeader}>
              <div>
                <p className={styles.cardNumber}>02</p>
                <h2>Your complete pattern</h2>
                <p>{inputMode === "panels" ? "Your starting panels make the finished bag below." : "All mandatory fabric pieces are shown below."}</p>
              </div>
              <div className={styles.resultActions}>
                <button type="button" onClick={() => void copyPlan()} disabled={!isValid}>{copyState === "copied" ? "Copied ✓" : copyState === "error" ? "Copy failed" : "Copy list"}</button>
                <button type="button" onClick={() => window.print()} disabled={!isValid}>Print plan</button>
              </div>
            </div>

            <div className={styles.finishedBanner}>
              <span>Finished bag</span>
              <strong>{finishedLengthLabel} × {finishedDepthLabel} × {finishedHeightLabel}</strong>
              <small>length × depth × height</small>
            </div>

            <div className={styles.dimensionBreakdown} aria-label="Finished dimension details">
              <span><small>Zipper span</small><strong>{finishedLengthLabel}</strong></span>
              <span><small>Bottom footprint</small><strong>{formatMeasurement(plan.finishedBaseLength, unit)} × {finishedDepthLabel}</strong></span>
              <span><small>Vertical height</small><strong>{finishedHeightLabel}</strong></span>
            </div>

            <div className={styles.outputGrid}>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 1</span> Outer rectangle</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>Fuse one matching piece of interfacing to its wrong side.</small>
              </article>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 1</span> Lining rectangle</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>Same size as the outer. Leave it rectangular—do not cut corners yet.</small>
              </article>
              <article className={`${styles.cutCard} ${styles.cornerCard}`}>
                <div className={styles.outputLabel}><span>Cut later</span> 4 assembled corners</div>
                <strong>{cornerCutLabel} × {cornerCutLabel}</strong>
                <small>Use the tool only after the zipper unit is flat and both short ends are sewn.</small>
              </article>
              <article className={`${styles.cutCard} ${styles.zipperCard}`}>
                <div className={styles.outputLabel}><span>Cut 1 + 2 tabs</span> Nylon zipper</div>
                <strong>{formatMeasurement(plan.recommendedZipper, unit)}</strong>
                <small>Use this length or longer. Cut two 2½″ / 6 cm squares for folded end tabs.</small>
              </article>
            </div>

            <article className={styles.cutFirstCallout}>
              <span aria-hidden="true">CUT LATER</span>
              <div>
                <strong>The zipper and short-end seams come before the acrylic tool.</strong>
                <p>Flatten the sewn tube with outer above, lining below, and zipper running horizontally through the exact center. Then put the tool directly on each of the four raw corners—no measuring from the stitch line.</p>
              </div>
            </article>

            <PatternDiagram
              finishedLength={finishedLengthLabel}
              panelLength={formatMeasurement(plan.panelLength, unit)}
              panelWidth={formatMeasurement(plan.panelWidth, unit)}
              cornerCut={cornerCutLabel}
              finishedDepth={finishedDepthLabel}
              finishedHeight={finishedHeightLabel}
              seamAllowance={formatMeasurement(draft.seamAllowance, unit)}
            />

            <div className={styles.notesGrid}>
              <article>
                <p className={styles.cardNumber}>03</p>
                <h3>Complete cutting checklist</h3>
                <ul>
                  <li><span>1</span> rectangular outer panel</li>
                  <li><span>1</span> matching lining panel</li>
                  <li><span>1</span> matching interfacing panel</li>
                  <li><span>2</span> 2½″ / 6 cm zipper-tab squares</li>
                  <li><span>1</span> {formatMeasurement(plan.recommendedZipper, unit)} nylon coil zipper</li>
                </ul>
              </article>
              <article>
                <p className={styles.cardNumber}>04</p>
                <h3>Sewing sequence</h3>
                <ol>
                  <li>Wrap outer and lining around both zipper edges.</li>
                  <li>Leave the zipper-side turning gap; flatten and sew both ends.</li>
                  <li>Cut four tool corners, then sew four joined corner caps.</li>
                </ol>
              </article>
            </div>

            <p className={styles.accuracyNote}>
              Tool-cut math subtracts the short-end seam allowance from both sides of the finished depth. Fabric bulk and turn-of-cloth can still shift the result slightly; test precious fabric in muslin first.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function MeasurementInput({ id, label, note, value, unit, step, onChange }: {
  id: string;
  label: string;
  note: string;
  value: number;
  unit: Unit;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span><strong>{label}</strong><small>{note}</small></span>
      <span className={styles.inputWrap}>
        <input id={id} type="number" min={step} step={step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} />
        <b>{unit}</b>
      </span>
    </label>
  );
}

function BagDiagram({ length, width, height }: { length: string; width: string; height: string }) {
  return (
    <figure className={styles.bagFigure}>
      <svg viewBox="0 0 520 330" role="img" aria-label={`Boxy bag ${length} long, ${width} wide, ${height} high`}>
        <defs>
          <linearGradient id="bag-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd75e" /><stop offset="1" stopColor="#ff8b68" /></linearGradient>
          <linearGradient id="bag-front" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stopColor="#7f5cff" /><stop offset="1" stopColor="#44229c" /></linearGradient>
          <linearGradient id="bag-side" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4de1ff" /><stop offset="1" stopColor="#177f9c" /></linearGradient>
          <filter id="bag-glow"><feGaussianBlur stdDeviation="9" /></filter>
          <marker id="bag-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M8 0 0 4l8 4" fill="none" stroke="#f8f4ff" strokeWidth="1.4" /></marker>
        </defs>
        <ellipse cx="272" cy="274" rx="184" ry="25" fill="#6b48d7" opacity=".35" filter="url(#bag-glow)" />
        <path d="M112 111 343 76l82 58-232 36Z" fill="url(#bag-top)" />
        <path d="M112 111 193 170v88l-81-57Z" fill="url(#bag-side)" />
        <path d="M193 170 425 134v88l-232 36Z" fill="url(#bag-front)" />
        <path d="m134 119 209-32 61 43-211 32Z" fill="none" stroke="#231244" strokeWidth="6" strokeLinecap="round" />
        <path d="m344 87 60 43" stroke="#fff5c2" strokeWidth="3" strokeDasharray="4 6" />
        <rect x="335" y="84" width="22" height="13" rx="6" transform="rotate(35 335 84)" fill="#241744" />
        <g fill="none" stroke="#f8f4ff" strokeWidth="1.5" markerStart="url(#bag-arrow)" markerEnd="url(#bag-arrow)"><path d="m196 292 228-36" /><path d="m83 116 0 86" /><path d="m110 84 78 55" /></g>
        <g fill="#f8f4ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14" fontWeight="500"><text x="285" y="306" textAnchor="middle">L {length}</text><text x="70" y="164" textAnchor="end">H {height}</text><text x="126" y="72" textAnchor="middle">W {width}</text></g>
      </svg>
      <figcaption>Finished shape preview</figcaption>
    </figure>
  );
}

function PanelPiece({ layer, number, panelLength, panelWidth, cornerCut }: {
  layer: "Outer" | "Lining";
  number: 1 | 2;
  panelLength: string;
  panelWidth: string;
  cornerCut: string;
}) {
  const outer = layer === "Outer";
  return (
    <article className={`${styles.panelPiece} ${outer ? styles.outerPiece : styles.liningPiece}`}>
      <header><span>{layer}</span><strong>Panel {number}</strong></header>
      <svg viewBox="0 0 300 170" role="img" aria-label={`${layer} panel ${number}, ${panelLength} by ${panelWidth}, with a ${cornerCut} square removed from all four raw corners`}>
        <g fill="#ff7aac" fillOpacity=".13" stroke="#ff7aac" strokeDasharray="5 4"><rect x="26" y="22" width="46" height="46" /><rect x="228" y="22" width="46" height="46" /><rect x="26" y="102" width="46" height="46" /><rect x="228" y="102" width="46" height="46" /></g>
        <path d="M72 22h156v46h46v34h-46v46H72v-46H26V68h46Z" fill={outer ? "#302052" : "#12364b"} stroke={outer ? "#a78bfa" : "#4de1ff"} strokeWidth="2" />
        <path d="M72 22h156" stroke="#ffd75e" strokeWidth="4" />
        <text x="150" y="74" textAnchor="middle" fill="#f6f2ff" fontSize="15" fontWeight="700">{layer.toUpperCase()} {number}</text>
        <text x="150" y="94" textAnchor="middle" fill="#a9a0bf" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">YELLOW · ZIPPER EDGE</text>
        <text x="150" y="127" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">4 RAW-CORNER CUTOUTS · {cornerCut}</text>
      </svg>
      <p><strong>{panelLength} × {panelWidth}</strong><span>overall before corner squares</span></p>
    </article>
  );
}

function PatternDiagram({ finishedLength, panelLength, panelWidth, cornerCut, finishedDepth, finishedHeight, seamAllowance }: {
  finishedLength: string;
  panelLength: string;
  panelWidth: string;
  cornerCut: string;
  finishedDepth: string;
  finishedHeight: string;
  seamAllowance: string;
}) {
  if (finishedLength) {
    return (
      <NoBottomSeamPattern
        finishedLength={finishedLength}
        panelLength={panelLength}
        panelWidth={panelWidth}
        cornerCut={cornerCut}
        finishedDepth={finishedDepth}
        finishedHeight={finishedHeight}
        seamAllowance={seamAllowance}
      />
    );
  }

  return (
    <figure className={styles.patternFigure}>
      <div className={styles.figureTitle}>
        <div><span>Detailed cut map</span><strong>Every fabric panel is fully shaped before sewing begins.</strong></div>
        <span className={styles.figureScale}>diagram · not to scale</span>
      </div>
      <div className={styles.diagramLegend} aria-label="Diagram color key">
        <span><i className={styles.legendCut} /> pink = remove</span>
        <span><i className={styles.legendSew} /> yellow = zipper edge / sew</span>
        <span><i className={styles.legendSeam} /> cyan = lining</span>
      </div>

      <div className={styles.methodCompare} aria-label="Construction method comparison">
        <article>
          <span>Not this pattern</span>
          <strong>Straight-across top zipper</strong>
          <p>Only the lower corners are boxed, so the zipper stops at the two top ends.</p>
        </article>
        <b aria-hidden="true">→</b>
        <article className={styles.methodSelected}>
          <span>This pattern</span>
          <strong>Wraparound zipper + 4 panels</strong>
          <p>Four cuts per panel create lower box corners plus flat, straight-sewn zipper ends.</p>
        </article>
      </div>

      <section className={styles.allPanelsSection}>
        <div className={styles.sectionHeading}>
          <span>Step 1</span>
          <div><strong>Cut these four mandatory panels</strong><small>Use the same printed acrylic corner on all four raw corners of every panel.</small></div>
        </div>
        <div className={styles.panelSet}>
          <PanelPiece layer="Outer" number={1} panelLength={panelLength} panelWidth={panelWidth} cornerCut={cornerCut} />
          <PanelPiece layer="Outer" number={2} panelLength={panelLength} panelWidth={panelWidth} cornerCut={cornerCut} />
          <PanelPiece layer="Lining" number={1} panelLength={panelLength} panelWidth={panelWidth} cornerCut={cornerCut} />
          <PanelPiece layer="Lining" number={2} panelLength={panelLength} panelWidth={panelWidth} cornerCut={cornerCut} />
        </div>
        <div className={styles.interfacingStrip}>
          <span>Optional</span>
          <strong>Interfacing panels 1 + 2</strong>
          <p>Cut two more copies of this final shape, or fuse to the outer rectangles and cut the corner squares through both layers together.</p>
        </div>
      </section>

      <section className={styles.panelAnatomy}>
        <div className={styles.sectionHeading}>
          <span>Step 2</span>
          <div><strong>Shape one panel—then repeat four times</strong><small>Place the acrylic template flush to the raw edges. Do not measure from a seam.</small></div>
        </div>
        <svg viewBox="0 0 760 390" role="img" aria-label={`Panel starts ${panelLength} by ${panelWidth}. Remove a ${cornerCut} square from all four raw corners. The finished bag is ${finishedLength} long, ${finishedDepth} deep, and ${finishedHeight} high.`}>
          <defs>
            <pattern id="panel-cut-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#ff7aac" fillOpacity=".13" /><path d="M0 0v9" stroke="#ff7aac" strokeOpacity=".5" strokeWidth="2" /></pattern>
            <pattern id="panel-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#a78bfa" strokeOpacity=".12" /></pattern>
            <marker id="measure-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M8 0 0 4l8 4" fill="none" stroke="#d9d2ef" strokeWidth="1.3" /></marker>
          </defs>
          <g transform="translate(96 56)">
            <rect width="568" height="236" fill="none" stroke="#5c4a7d" strokeDasharray="5 6" />
            <g fill="url(#panel-cut-hatch)" stroke="#ff7aac" strokeWidth="1.5" strokeDasharray="6 5"><rect width="64" height="64" /><rect x="504" width="64" height="64" /><rect y="172" width="64" height="64" /><rect x="504" y="172" width="64" height="64" /></g>
            <path d="M64 0h440v64h64v108h-64v64H64v-64H0V64h64Z" fill="#20163d" stroke="#a78bfa" strokeWidth="2.5" />
            <path d="M64 0h440" stroke="#ffd75e" strokeWidth="6" />
            <path d="M64 0h440v64h64v108h-64v64H64v-64H0V64h64Z" fill="url(#panel-grid)" />
            <text x="284" y="108" textAnchor="middle" fill="#f6f2ff" fontSize="21" fontWeight="700">ONE SHAPED PANEL</text>
            <text x="284" y="137" textAnchor="middle" fill="#bcb2d4" fontFamily="var(--font-ibm-plex-mono)" fontSize="13">REPEAT × 4 FABRIC PANELS</text>
            <text x="284" y="25" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">ZIPPER RAW EDGE · FINISHES {finishedLength}</text>
            <text x="284" y="198" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">REMOVE 4 SQUARES · {cornerCut} × {cornerCut}</text>
            <text x="284" y="220" textAnchor="middle" fill="#bcb2d4" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">CENTER SIDE FINISHES {finishedHeight} HIGH</text>
            <g stroke="#d9d2ef" strokeWidth="1.3" markerStart="url(#measure-arrow)" markerEnd="url(#measure-arrow)"><path d="M0 270h568" /><path d="M-31 0v236" /><path d="M0 -18h64" /><path d="M-22 0v64" /></g>
            <text x="284" y="299" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14">OVERALL {panelLength}</text>
            <text x="-42" y="118" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14" transform="rotate(-90 -42 118)">OVERALL {panelWidth}</text>
            <text x="32" y="-24" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">{cornerCut}</text>
            <text x="-30" y="32" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11" transform="rotate(-90 -30 32)">{cornerCut}</text>
          </g>
        </svg>
        <div className={styles.criticalStrip}><strong>Raw-edge rule:</strong> a {cornerCut} tool with a {seamAllowance} seam allowance makes approximately {finishedDepth} finished depth: 2 × ({cornerCut} − {seamAllowance}). Patterns that measure from a stitched seam are naming the finished half-depth; this calculator names the actual acrylic cut.</div>
      </section>

      <section className={styles.zipperSection}>
        <div className={styles.sectionHeading}>
          <span>Step 3</span>
          <div><strong>Apply the zipper in two sandwiches</strong><small>Right sides face the zipper; wrong sides remain visible on the outside of each stack.</small></div>
        </div>
        <div className={styles.zipperSteps}>
          <article>
            <div className={styles.miniStep}><span>A</span><strong>First side: panels 1</strong></div>
            <div className={styles.layerStack} aria-label="First zipper sandwich, shown from top to bottom">
              <div className={styles.liningLayer}><b>TOP · LINING 1</b><small>wrong side visible · right side faces zipper</small></div>
              <div className={styles.zipperLayer}><b>ZIPPER</b><small>wrong side visible · teeth face Outer 1</small></div>
              <div className={styles.outerLayer}><b>BOTTOM · OUTER 1</b><small>right side up</small></div>
            </div>
            <p>Align all three raw top edges. With a zipper foot, sew {seamAllowance} from the edge.</p>
          </article>
          <article>
            <div className={styles.miniStep}><span>B</span><strong>Second side: panels 2</strong></div>
            <div className={styles.layerStack} aria-label="Second zipper sandwich, shown from top to bottom">
              <div className={styles.liningLayer}><b>TOP · LINING 2</b><small>wrong side visible · right side faces zipper</small></div>
              <div className={styles.zipperLayer}><b>UNSEWN ZIPPER EDGE</b><small>teeth face Outer 2</small></div>
              <div className={styles.outerLayer}><b>BOTTOM · OUTER 2</b><small>right side up</small></div>
            </div>
            <p>Move panels 1 away from the needle. Align the unused tape edge with panels 2 and sew the same way.</p>
          </article>
          <article>
            <div className={styles.miniStep}><span>C</span><strong>Open, press + topstitch</strong></div>
            <svg viewBox="0 0 300 126" role="img" aria-label="Outer and lining panels pressed away from both sides of the zipper and topstitched">
              <path d="M18 18h115v90H18Z" fill="#302052" stroke="#a78bfa" strokeWidth="2" />
              <path d="M167 18h115v90H167Z" fill="#302052" stroke="#a78bfa" strokeWidth="2" />
              <rect x="133" y="18" width="34" height="90" rx="3" fill="#d3a72e" />
              <path d="M150 22v82" stroke="#20152e" strokeWidth="6" strokeDasharray="4 4" />
              <path d="M126 18v90M174 18v90" stroke="#ffd75e" strokeWidth="3" strokeDasharray="5 3" />
              <text x="75" y="67" textAnchor="middle" fill="#f7f3ff" fontSize="12">PANELS 1</text>
              <text x="225" y="67" textAnchor="middle" fill="#f7f3ff" fontSize="12">PANELS 2</text>
            </svg>
            <p>Press outer and lining away from the teeth. Topstitch close to each fold without catching the opposite panel.</p>
          </article>
        </div>
        <p className={styles.orientationNote}><strong>Layer check:</strong> when opened flat, both outer right sides face up together; flip the unit and both lining right sides face up together.</p>
      </section>

      <section className={styles.shellSection}>
        <div className={styles.sectionHeading}>
          <span>Step 4</span>
          <div><strong>Sew the center seams—leave every corner open</strong><small>Open the zipper halfway first. Keep outer and lining seams separate.</small></div>
        </div>
        <div className={styles.shellGrid}>
          <article>
            <header><span>Outer shell</span><strong>Outer 1 + Outer 2 · right sides together</strong></header>
            <svg viewBox="0 0 300 170" role="img" aria-label="Outer panels right sides together with side-center and bottom-center seams sewn while all four corner openings remain open">
              <path d="M81 22h138v36h47v44h-47v46H81v-46H34V58h47Z" fill="#2c1c50" stroke="#a78bfa" strokeWidth="2" />
              <path d="M34 58v44M266 58v44M81 148h138" fill="none" stroke="#ffd75e" strokeWidth="5" />
              <path d="M34 58h47V22M219 22v36h47M34 102h47v46M266 102h-47v46" fill="none" stroke="#ff7aac" strokeWidth="3" strokeDasharray="5 4" />
              <path d="M81 22h138" stroke="#a78bfa" strokeWidth="4" strokeDasharray="4 3" />
              <text x="150" y="75" textAnchor="middle" fill="#f7f3ff" fontSize="11">SEW SIDE CENTERS</text>
              <text x="150" y="92" textAnchor="middle" fill="#b8aed0" fontSize="9">+ BOTTOM CENTER</text>
              <text x="150" y="119" textAnchor="middle" fill="#ffb3d2" fontSize="9">LEAVE 4 OPENINGS</text>
            </svg>
          </article>
          <article>
            <header><span>Lining shell</span><strong>Lining 1 + Lining 2 · right sides together</strong></header>
            <svg viewBox="0 0 300 170" role="img" aria-label="Lining panels right sides together with side-center and bottom-center seams sewn, all corner openings open, and a turning gap in the bottom seam">
              <path d="M81 22h138v36h47v44h-47v46H81v-46H34V58h47Z" fill="#10364a" stroke="#4de1ff" strokeWidth="2" />
              <path d="M34 58v44M266 58v44M81 148h45M174 148h45" fill="none" stroke="#ffd75e" strokeWidth="5" />
              <path d="M126 148h48" stroke="#4de1ff" strokeWidth="4" strokeDasharray="6 4" />
              <path d="M34 58h47V22M219 22v36h47M34 102h47v46M266 102h-47v46" fill="none" stroke="#ff7aac" strokeWidth="3" strokeDasharray="5 4" />
              <path d="M81 22h138" stroke="#4de1ff" strokeWidth="4" strokeDasharray="4 3" />
              <text x="150" y="75" textAnchor="middle" fill="#f7f3ff" fontSize="11">SEW SIDE CENTERS</text>
              <text x="150" y="92" textAnchor="middle" fill="#a7efff" fontSize="9">BOTTOM GAP 3–4″ / 8–10 CM</text>
              <text x="150" y="119" textAnchor="middle" fill="#ffb3d2" fontSize="9">LEAVE 4 OPENINGS</text>
            </svg>
          </article>
        </div>
        <div className={styles.criticalStrip}><strong>Stop here at the zipper ends:</strong> do not close the upper openings as ordinary side seams. They stay open until Step 7, when you invert each end, flatten the outer and lining together, and sew one straight line across the zipper.</div>
      </section>

      <section className={styles.sewingMap}>
        <div className={styles.sectionHeading}>
          <span>Step 5</span>
          <div><strong>Box only the four lower corners</strong><small>Two in the outer shell and two in the lining shell. Save the upper zipper corners for Step 7.</small></div>
        </div>
        <div className={styles.sewingSteps}>
          <article><span>A</span><strong>Find one paired opening</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M24 18h132v40h-42v34H24Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M114 92V58h42" fill="none" stroke="#ff7aac" strokeWidth="4" /></svg><p>Two matching {cornerCut} cutouts have formed one open corner.</p></article>
          <article><span>B</span><strong>Match seams + raw edges</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M31 27 89 55 149 27" fill="none" stroke="#a78bfa" strokeWidth="19" strokeLinejoin="round" /><path d="M31 27 89 55 149 27" fill="none" stroke="#ff7aac" strokeWidth="3" /><path d="M47 79h84" stroke="#d9d2ef" strokeDasharray="5 4" /><path d="m76 67 13 12 13-12" fill="none" stroke="#d9d2ef" strokeWidth="2" /></svg><p>Pull the opening flat. Nest the side seam directly on the bottom seam.</p></article>
          <article><span>C</span><strong>Sew straight across</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M26 31 154 70 143 98 15 59Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M26 31 154 70" stroke="#ff7aac" strokeWidth="4" /><path d="M20 50 148 89" stroke="#ffd75e" strokeWidth="5" /></svg><p>Sew {seamAllowance} from the raw edge; finished depth ≈ {finishedDepth}. Backstitch both ends.</p></article>
        </div>
        <div className={styles.cornerCount}><span>LOWER OUTER</span><b>left + right</b><i aria-hidden="true">＋</i><span>LOWER LINING</span><b>left + right</b><strong>= 4 separate cap seams</strong></div>
      </section>

      <section className={styles.anchorSection}>
        <div className={styles.sectionHeading}>
          <span>Step 6</span>
          <div><strong>Optional: anchor matching lower corners</strong><small>This keeps the lining seated without putting raw edges inside the bag.</small></div>
        </div>
        <div className={styles.anchorGrid}>
          <svg viewBox="0 0 330 170" role="img" aria-label="Outer boxed corner seam allowance matched to the corresponding lining boxed corner seam allowance with a short anchor stitch">
            <path d="M30 30 151 79 134 123 13 74Z" fill="#302052" stroke="#a78bfa" strokeWidth="2" />
            <path d="M180 79 301 30l17 44-121 49Z" fill="#10364a" stroke="#4de1ff" strokeWidth="2" />
            <path d="M24 52 145 101M186 101 307 52" stroke="#ffd75e" strokeWidth="4" />
            <path d="M140 101h51" stroke="#ff7aac" strokeWidth="7" strokeLinecap="round" />
            <text x="72" y="147" textAnchor="middle" fill="#bdb3d2" fontSize="10">OUTER CAP S.A.</text>
            <text x="258" y="147" textAnchor="middle" fill="#a7efff" fontSize="10">LINING CAP S.A.</text>
            <text x="165" y="92" textAnchor="middle" fill="#fff" fontSize="10">TACK</text>
          </svg>
          <ol>
            <li>Reach through the lining gap and find one outer corner plus its lining mate.</li>
            <li>Confirm the lining is not twisted; place only the two cap seam allowances together.</li>
            <li>Sew a short bar tack inside the existing seam allowance. Repeat for the other corner.</li>
          </ol>
        </div>
      </section>

      <section className={styles.anchorSection}>
        <div className={styles.sectionHeading}>
          <span>Step 7</span>
          <div><strong>Invert each end + sew straight across the zipper</strong><small>The zipper turns down the short sides; the center-bottom seam sits directly opposite it.</small></div>
        </div>
        <div className={styles.sewingSteps}>
          <article><span>A</span><strong>Invert + flatten one end</strong><svg viewBox="0 0 180 110" role="img" aria-label="One bag end turned inside out and opened flat"><path d="M25 89V27h130v62Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M32 35h116" stroke="#4de1ff" strokeWidth="8" /><path d="M90 18v79" stroke="#d3a72e" strokeWidth="10" /><path d="M90 18v79" stroke="#21172b" strokeWidth="3" strokeDasharray="4 4" /><path d="M54 88 90 70l36 18" fill="none" stroke="#ff7aac" strokeWidth="3" /><text x="90" y="106" textAnchor="middle" fill="#ffb3d2" fontSize="8">BOTTOM SEAM OPPOSITE ZIPPER</text></svg><p>Pull the end inside out through the lining gap. Open the upper cutouts until the end lies flat like a straight stack.</p></article>
          <article><span>B</span><strong>Center + align the layers</strong><svg viewBox="0 0 180 110" role="img" aria-label="Zipper centered over aligned outer and lining bottom seams"><path d="M22 31h136v58H22Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M28 39h124" stroke="#4de1ff" strokeWidth="8" /><path d="M90 20v78" stroke="#d3a72e" strokeWidth="10" /><path d="M90 20v78" stroke="#21172b" strokeWidth="3" strokeDasharray="4 4" /><path d="M78 76h24M90 66v25" stroke="#ff7aac" strokeWidth="3" /><path d="m80 60 10 7 10-7" fill="none" stroke="#ff7aac" strokeWidth="2" /><text x="90" y="108" textAnchor="middle" fill="#ffb3d2" fontSize="8">MATCH CENTER LINES</text></svg><p>Put the zipper directly over the outer center-bottom seam. Align the matching lining seam on that same center line; keep the lining untwisted.</p></article>
          <article><span>C</span><strong>Sew one straight end seam</strong><svg viewBox="0 0 180 110" role="img" aria-label="One straight stitch line sewn across the flattened outer, zipper and lining"><path d="M22 31h136v58H22Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M28 39h124" stroke="#4de1ff" strokeWidth="8" /><path d="M90 20v78" stroke="#d3a72e" strokeWidth="10" /><path d="M90 20v78" stroke="#21172b" strokeWidth="3" strokeDasharray="4 4" /><path d="M22 78h136" stroke="#ffd75e" strokeWidth="5" /><path d="m144 70 12 8-12 8" fill="none" stroke="#ffd75e" strokeWidth="3" /><text x="90" y="106" textAnchor="middle" fill="#fff1ae" fontSize="8">SEW STRAIGHT ACROSS</text></svg><p>Match every raw edge. Sew {seamAllowance} from the edge across outer, nylon zipper coil and lining. Repeat at the other end.</p></article>
        </div>
        <div className={styles.criticalStrip}><strong>This is not a French seam:</strong> it is one straight end seam. Open the zipper halfway, keep any tab folded inward, and use a nylon coil zipper—never metal teeth or a metal stop under the needle. Hand-wheel slowly, backstitch, then trim excess tape. After turning, the allowance stays between the outer and lining.</div>
      </section>

      <section className={styles.finishSection}>
        <div className={styles.sectionHeading}>
          <span>Step 8</span>
          <div><strong>Turn, close + finish</strong><small>The zipper and lining openings are the two exits you must preserve.</small></div>
        </div>
        <div className={styles.finishChecks}>
          <article><b>1</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M8 11h32v31H8Z" fill="#12364b" stroke="#4de1ff" /><path d="M32 18h35v27H32Z" fill="#302052" stroke="#a78bfa" /><path d="m24 27 20 0" stroke="#ffd75e" strokeWidth="3" /><path d="m39 21 7 6-7 6" fill="none" stroke="#ffd75e" strokeWidth="2" /></svg><span><strong>Turn</strong> Pull the entire pouch through the lining gap, then through the half-open zipper.</span></article>
          <article><b>2</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="m11 17 40-7 14 10-40 7Z" fill="#ffd75e" /><path d="m11 17 14 10v18L11 35Z" fill="#177f9c" /><path d="m25 27 40-7v18l-40 7Z" fill="#5f38b4" /><path d="m18 18 33-6 10 7" fill="none" stroke="#24162e" strokeWidth="2" /></svg><span><strong>Shape</strong> Push out the four lower corners and both zipper-end caps; make sure the zipper wraps down evenly.</span></article>
          <article><b>3</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M8 10h60v35H8Z" fill="#12364b" stroke="#4de1ff" /><path d="M17 38h42" stroke="#4de1ff" strokeWidth="3" strokeDasharray="4 3" /><path d="M28 38h20" stroke="#ffd75e" strokeWidth="4" /></svg><span><strong>Close</strong> Fold the lining gap allowances inward and edgestitch or ladder-stitch closed.</span></article>
          <article><b>4</b><svg viewBox="0 0 76 54" aria-hidden="true"><path d="M10 9h56v38H10Z" fill="#302052" stroke="#a78bfa" /><path d="M18 16h40v24H18Z" fill="#12364b" stroke="#4de1ff" /><path d="M14 12h48" stroke="#ffd75e" strokeWidth="4" /><path d="m31 23 7 6 7-6" fill="none" stroke="#ff7aac" strokeWidth="2" /></svg><span><strong>Seat</strong> Place the lining inside and press gently around the zipper.</span></article>
        </div>
      </section>

      <section className={styles.fullPattern}>
        <div className={styles.sectionHeading}>
          <span>Full pattern</span>
          <div><strong>Complete order of construction</strong><small>Use {seamAllowance} seam allowance unless a step says otherwise.</small></div>
        </div>
        <ol>
          <li><strong>Prepare the rectangles.</strong> Cut two outer and two lining panels at {panelLength} × {panelWidth}. Mark the same top edge on all four. If using batting or fusible structure, attach it to the wrong side of each outer now; quilt and trim cleanly.</li>
          <li><strong>Cut every raw corner.</strong> Put the {cornerCut} corner of the acrylic template flush with both raw edges of one panel. Cut around it. Repeat at all four corners and on all four panels: 16 identical square cutouts total. Do not measure from a stitch line and do not add seam allowance to the tool.</li>
          <li><strong>Stabilize if needed.</strong> Staystitch quilted outer raw edges about 1/8″ / 3 mm from the edge so the layers cannot shift. Mark a 3–4″ / 8–10 cm turning gap on the lining bottom-center edge.</li>
          <li><strong>Sew zipper side 1.</strong> Stack Outer 1 right side up, zipper right side down, and Lining 1 right side down. Align the three straight top-center raw edges; the zipper may extend beyond both ends. Clip and sew {seamAllowance} from the edge.</li>
          <li><strong>Sew zipper side 2.</strong> Stack Outer 2 right side up, the free zipper tape edge right side down, and Lining 2 right side down. Keep the first fabric pair clear, align the second top-center edge, and sew.</li>
          <li><strong>Press, topstitch and add tabs.</strong> Press both outer and lining layers away from the teeth. Topstitch close to each fabric fold without catching the opposite panel. If using folded ribbon tabs, baste one at each zipper end with each fold pointing inward and centered on the teeth.</li>
          <li><strong>Form two shells.</strong> Open the zipper halfway. Bring the outer panels right sides together and the lining panels right sides together. Match the two side-center edges, the bottom-center edges and all corner cutouts; keep the zipper seam allowances directed toward the lining.</li>
          <li><strong>Sew only the center seams.</strong> Sew the outer side-center edges and bottom-center edge. Sew the lining side-center edges and bottom-center edge separately, stopping for the marked turning gap. Leave all four cutout openings in each shell unsewn.</li>
          <li><strong>Box the four lower corners.</strong> Flatten one lower outer opening so its side seam sits directly on its bottom seam; nest the allowances and sew {seamAllowance} from the raw edge. Repeat for the second lower outer corner and both lower lining corners. Optionally tack each outer cap allowance to its matching lining cap allowance.</li>
          <li><strong>Invert and sew zipper end 1.</strong> Pull the end inside out through the lining gap and flatten the upper outer and lining openings. Center the zipper directly opposite the outer center-bottom seam; put the matching lining seam on that same center line. Bring all raw cut edges into one straight stack, keep any ribbon folded inward, and sew {seamAllowance} straight across every layer.</li>
          <li><strong>Invert and sew zipper end 2.</strong> Repeat at the other end. Confirm that the zipper is still half open and the lining is not twisted. Hand-wheel over nylon coil teeth, backstitch securely, then trim excess zipper tape outside the new seams. Do not sew a second line or turn this into a French seam.</li>
          <li><strong>Turn and close.</strong> Pull the pouch through the lining gap and then through the open zipper. Push out the lower corners and zipper-end caps, close the lining gap, and seat the lining. The finished bag is approximately {finishedLength} long × {finishedDepth} deep × {finishedHeight} high.</li>
        </ol>
      </section>
    </figure>
  );
}

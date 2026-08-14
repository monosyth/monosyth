"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "@/app/app/boxy-bag/boxy-bag.module.css";
import { useAuth } from "@/components/auth/auth-provider";
import { calculateBoxyBagPlan } from "@/lib/sewing/boxy-bag";

type Unit = "in" | "cm";
type Draft = {
  length: number;
  height: number;
  seamAllowance: number;
  cornerGuideInches: number;
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

function getPlan(draft: Draft, unit: Unit) {
  return calculateBoxyBagPlan({
    length: draft.length,
    height: draft.height,
    cornerCut: guideInUnit(draft.cornerGuideInches, unit),
    seamAllowance: draft.seamAllowance,
    zipperExtra: unit === "in" ? 2 : 5,
  });
}

function buildCuttingList(draft: Draft, unit: Unit) {
  const plan = getPlan(draft, unit);
  const guide = formatInches(draft.cornerGuideInches);
  const panelSize = `${measurementPair(plan.panelLength, unit)} × ${measurementPair(plan.panelWidth, unit)}`;
  const cornerSize = `${measurementPair(plan.cornerCut, unit)} × ${measurementPair(plan.cornerCut, unit)}`;

  return [
    `BOXY BAG — CUT-FIRST PLAN`,
    `Tool corner: ${guide}`,
    `Seam allowance: ${measurementPair(draft.seamAllowance, unit)}`,
    `Finished bag: ${measurementPair(draft.length, unit)} L × ${measurementPair(plan.finishedDepth, unit)} W × ${measurementPair(draft.height, unit)} H`,
    `Bottom footprint: ${measurementPair(plan.finishedBaseLength, unit)} × ${measurementPair(plan.finishedDepth, unit)}`,
    ``,
    `CUT ALL PANELS BEFORE SEWING`,
    `Outer panel 1: start ${panelSize}; remove ${cornerSize} from both BOTTOM corners`,
    `Outer panel 2: start ${panelSize}; remove ${cornerSize} from both BOTTOM corners`,
    `Lining panel 1: start ${panelSize}; remove ${cornerSize} from both BOTTOM corners`,
    `Lining panel 2: start ${panelSize}; remove ${cornerSize} from both BOTTOM corners`,
    `Interfacing panels 1–2 (optional): cut to the same final shape`,
    `Zipper tape: 1 @ ${measurementPair(plan.recommendedZipper, unit)}`,
    ``,
    `CORNER TOTAL`,
    `Remove 2 bottom squares per mandatory panel = 8 ${guide} corner squares total.`,
    ``,
    `ASSEMBLE — ENCLOSED-SEAM METHOD`,
    `1. Fuse optional interfacing to the wrong sides of both outer panels.`,
    `2. First zipper sandwich: Outer 1 right side up, zipper right side down, Lining 1 right side down. Align the top zipper edge and sew.`,
    `3. Second zipper sandwich: Outer 2 right side up, the zipper assembly right side down, Lining 2 right side down. Align and sew.`,
    `4. Press both fabric layers away from the zipper and topstitch each side without catching the opposite panel.`,
    `5. OPEN THE ZIPPER HALFWAY. Put outer panels right sides together and lining panels right sides together.`,
    `6. Sew the outer side and bottom edges, leaving both bottom corner openings unsewn. Sew the lining side and bottom edges separately, leaving both bottom corner openings unsewn and a 3–4 in / 8–10 cm turning gap in the lining bottom.`,
    `7. Box 2 outer and 2 lining corners: pull each paired square opening flat, match the side seam to the bottom seam, nest the allowances, and sew ${measurementPair(draft.seamAllowance, unit)} from the raw edge.`,
    `8. Optional: match each outer boxed-corner seam with its lining mate and tack only their seam allowances together. Check that neither pair is twisted.`,
    `9. Turn through the lining gap, push out the shape, close the gap, and place the lining inside.`,
  ].join("\n");
}

export function BoxyBagBuilder() {
  const { status } = useAuth();
  const [unit, setUnit] = useState<Unit>("in");
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const plan = useMemo(() => getPlan(draft, unit), [draft, unit]);
  const isValid =
    draft.length > 0 &&
    draft.height > 0 &&
    draft.seamAllowance > 0 &&
    plan.cornerCut > draft.seamAllowance &&
    plan.finishedBaseLength > 0;

  function chooseUnit(nextUnit: Unit) {
    if (nextUnit === unit) return;
    setDraft((current) => convertDraft(current, nextUnit));
    setUnit(nextUnit);
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

  function applyPreset(preset: (typeof presets)[number]) {
    const factor = unit === "in" ? 1 : INCH_TO_CM;
    setDraft((current) => ({
      ...current,
      length: roundForInput(preset.length * factor),
      height: roundForInput(preset.height * factor),
      cornerGuideInches: preset.cornerGuideInches,
    }));
    setCopyState("idle");
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(buildCuttingList(draft, unit));
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
            <p className={styles.eyebrow}>Sewing studio / Cut-first builder</p>
            <h1>Pick a corner.<br /><span>Cut every panel.</span></h1>
            <p className={styles.heroIntro}>
              Choose an acrylic corner and a finished height. Then follow the
              complete four-panel pattern for a lining with no exposed seams.
            </p>
            <div className={styles.heroTags} aria-label="Pattern details">
              <span>Fully lined</span>
              <span>Cut first</span>
              <span>4 tool sizes</span>
            </div>
          </div>
          <BagDiagram
            length={formatMeasurement(draft.length, unit)}
            width={finishedDepthLabel}
            height={formatMeasurement(draft.height, unit)}
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

            <div className={styles.presets}>
              {presets.map((preset) => (
                <button type="button" key={preset.name} onClick={() => applyPreset(preset)}>
                  <span>{preset.name}</span>
                  <small>{preset.note}</small>
                </button>
              ))}
            </div>

            <div className={styles.fields}>
              <MeasurementInput id="bag-length" label="Finished length" note="Along the zipper" value={draft.length} unit={unit} step={measurementStep} onChange={(value) => updateDraft("length", value)} />
              <MeasurementInput id="bag-height" label="Finished height" note="Top to bottom" value={draft.height} unit={unit} step={measurementStep} onChange={(value) => updateDraft("height", value)} />
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
                  : "Finished length must be greater than the depth made by this corner."}
              </p>
            ) : null}

            <div className={styles.methodNote}>
              <span aria-hidden="true">◎</span>
              <p>
                <strong>Clean-finish method</strong> This uses two outer and two lining panels—not the one-piece French-seam construction. The outer bottom and lining bottom are sewn separately, then turned to hide every raw seam.
              </p>
            </div>
          </aside>

          <section className={styles.results} aria-live="polite">
            <div className={styles.resultsHeader}>
              <div>
                <p className={styles.cardNumber}>02</p>
                <h2>Your cut-first plan</h2>
                <p>All mandatory fabric pieces are shown below.</p>
              </div>
              <div className={styles.resultActions}>
                <button type="button" onClick={() => void copyPlan()} disabled={!isValid}>{copyState === "copied" ? "Copied ✓" : copyState === "error" ? "Copy failed" : "Copy list"}</button>
                <button type="button" onClick={() => window.print()} disabled={!isValid}>Print plan</button>
              </div>
            </div>

            <div className={styles.finishedBanner}>
              <span>Finished bag</span>
              <strong>{formatMeasurement(draft.length, unit)} × {finishedDepthLabel} × {formatMeasurement(draft.height, unit)}</strong>
              <small>length × depth × height</small>
            </div>

            <div className={styles.dimensionBreakdown} aria-label="Finished dimension details">
              <span><small>Zipper span</small><strong>{formatMeasurement(draft.length, unit)}</strong></span>
              <span><small>Bottom footprint</small><strong>{formatMeasurement(plan.finishedBaseLength, unit)} × {finishedDepthLabel}</strong></span>
              <span><small>Vertical height</small><strong>{formatMeasurement(draft.height, unit)}</strong></span>
            </div>

            <div className={styles.outputGrid}>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 2</span> Outer panels</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>Then remove two {cornerCutLabel} squares from the bottom edge of each panel.</small>
              </article>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 2</span> Lining panels</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>Same final shape as the outer panels.</small>
              </article>
              <article className={`${styles.cutCard} ${styles.cornerCard}`}>
                <div className={styles.outputLabel}><span>Cut 2 ea.</span> Bottom corners</div>
                <strong>{cornerCutLabel} × {cornerCutLabel}</strong>
                <small>8 bottom corner squares removed across the four mandatory panels.</small>
              </article>
              <article className={`${styles.cutCard} ${styles.zipperCard}`}>
                <div className={styles.outputLabel}><span>Cut 1</span> Zipper tape</div>
                <strong>{formatMeasurement(plan.recommendedZipper, unit)}</strong>
                <small>Includes working room beyond the finished zipper opening.</small>
              </article>
            </div>

            <article className={styles.cutFirstCallout}>
              <span aria-hidden="true">4 PANELS</span>
              <div>
                <strong>Separate outer and lining shells conceal every seam.</strong>
                <p>Cut the bottom notches first, build two zipper sandwiches, sew each shell separately, box four corners, then turn through the lining.</p>
              </div>
            </article>

            <PatternDiagram
              finishedLength={formatMeasurement(draft.length, unit)}
              panelLength={formatMeasurement(plan.panelLength, unit)}
              panelWidth={formatMeasurement(plan.panelWidth, unit)}
              cornerCut={cornerCutLabel}
              finishedDepth={finishedDepthLabel}
              finishedHeight={formatMeasurement(draft.height, unit)}
              seamAllowance={formatMeasurement(draft.seamAllowance, unit)}
            />

            <div className={styles.notesGrid}>
              <article>
                <p className={styles.cardNumber}>03</p>
                <h3>Complete cutting checklist</h3>
                <ul>
                  <li><span>2</span> shaped outer panels</li>
                  <li><span>2</span> shaped lining panels</li>
                  <li><span>2</span> shaped interfacing panels, optional</li>
                  <li><span>1</span> {formatMeasurement(plan.recommendedZipper, unit)} nylon coil zipper</li>
                </ul>
              </article>
              <article>
                <p className={styles.cardNumber}>04</p>
                <h3>Sewing sequence</h3>
                <ol>
                  <li>Attach outer and lining panels to the zipper.</li>
                  <li>Sew the remaining main seams, leaving every notch open.</li>
                  <li>Match each side seam to its bottom seam and sew four boxed corners.</li>
                </ol>
              </article>
            </div>

            <p className={styles.accuracyNote}>
              Cut-first math subtracts seam allowance from both sides of each cap seam. Fabric bulk and turn-of-cloth can still shift the finished size slightly; test precious fabric in muslin first.
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
      <svg viewBox="0 0 300 170" role="img" aria-label={`${layer} panel ${number}, ${panelLength} by ${panelWidth}, with two ${cornerCut} square bottom corners removed`}>
        <g fill="#ff7aac" fillOpacity=".13" stroke="#ff7aac" strokeDasharray="5 4"><rect x="26" y="102" width="46" height="46" /><rect x="228" y="102" width="46" height="46" /></g>
        <path d="M26 22h248v80h-46v46H72v-46H26Z" fill={outer ? "#302052" : "#12364b"} stroke={outer ? "#a78bfa" : "#4de1ff"} strokeWidth="2" />
        <path d="M26 22h248" stroke="#ffd75e" strokeWidth="4" />
        <text x="150" y="74" textAnchor="middle" fill="#f6f2ff" fontSize="15" fontWeight="700">{layer.toUpperCase()} {number}</text>
        <text x="150" y="94" textAnchor="middle" fill="#a9a0bf" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">TOP · ZIPPER EDGE</text>
        <text x="150" y="127" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">2 BOTTOM CUTOUTS · {cornerCut}</text>
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
          <strong>One large outer + one large lining</strong>
          <p>Zipper edges meet and the pouch is closed as one large tube or cross-shaped piece.</p>
        </article>
        <b aria-hidden="true">→</b>
        <article className={styles.methodSelected}>
          <span>This pattern</span>
          <strong>2 outer panels + 2 lining panels</strong>
          <p>Sew two zipper sandwiches, then sew the outer bottom and lining bottom separately.</p>
        </article>
      </div>

      <section className={styles.allPanelsSection}>
        <div className={styles.sectionHeading}>
          <span>Step 1</span>
          <div><strong>Cut these four mandatory panels</strong><small>Each one receives two bottom corner cutouts before assembly.</small></div>
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
          <div><strong>Measure one panel</strong><small>Mark the zipper edge, then cut both bottom corners with the selected tool.</small></div>
        </div>
        <svg viewBox="0 0 760 390" role="img" aria-label={`Panel starts ${panelLength} by ${panelWidth}. Remove a ${cornerCut} square from both bottom corners. The finished bag is ${finishedLength} along the zipper, ${finishedDepth} deep, and ${finishedHeight} high.`}>
          <defs>
            <pattern id="panel-cut-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#ff7aac" fillOpacity=".13" /><path d="M0 0v9" stroke="#ff7aac" strokeOpacity=".5" strokeWidth="2" /></pattern>
            <pattern id="panel-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#a78bfa" strokeOpacity=".12" /></pattern>
            <marker id="measure-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M8 0 0 4l8 4" fill="none" stroke="#d9d2ef" strokeWidth="1.3" /></marker>
          </defs>
          <g transform="translate(96 56)">
            <rect width="568" height="236" fill="none" stroke="#5c4a7d" strokeDasharray="5 6" />
            <g fill="url(#panel-cut-hatch)" stroke="#ff7aac" strokeWidth="1.5" strokeDasharray="6 5"><rect y="172" width="64" height="64" /><rect x="504" y="172" width="64" height="64" /></g>
            <path d="M0 0h568v172h-64v64H64v-64H0Z" fill="#20163d" stroke="#a78bfa" strokeWidth="2.5" />
            <path d="M0 0h568" stroke="#ffd75e" strokeWidth="6" />
            <path d="M0 0h568v172h-64v64H64v-64H0Z" fill="url(#panel-grid)" />
            <text x="284" y="108" textAnchor="middle" fill="#f6f2ff" fontSize="21" fontWeight="700">ONE SHAPED PANEL</text>
            <text x="284" y="137" textAnchor="middle" fill="#bcb2d4" fontFamily="var(--font-ibm-plex-mono)" fontSize="13">REPEAT × 4 FABRIC PANELS</text>
            <text x="284" y="24" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">RAW ZIPPER EDGE · {panelLength}</text>
            <text x="284" y="198" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">REMOVE 2 BOTTOM SQUARES · {cornerCut} × {cornerCut}</text>
            <g stroke="#d9d2ef" strokeWidth="1.3" markerStart="url(#measure-arrow)" markerEnd="url(#measure-arrow)"><path d="M0 270h568" /><path d="M-31 0v236" /><path d="M0 252h64" /><path d="M-22 172v64" /></g>
            <text x="284" y="299" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14">OVERALL {panelLength}</text>
            <text x="-42" y="118" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14" transform="rotate(-90 -42 118)">OVERALL {panelWidth}</text>
            <text x="32" y="267" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">{cornerCut}</text>
            <text x="-30" y="204" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11" transform="rotate(-90 -30 204)">{cornerCut}</text>
          </g>
        </svg>
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
          <div><strong>Make two separate shells</strong><small>Open the zipper halfway before sewing anything else.</small></div>
        </div>
        <div className={styles.shellGrid}>
          <article>
            <header><span>Outer shell</span><strong>Outer 1 + Outer 2 · right sides together</strong></header>
            <svg viewBox="0 0 300 170" role="img" aria-label="Outer panels right sides together with side and bottom seams sewn and bottom corner openings left open">
              <path d="M34 22h232v82h-47v44H81v-44H34Z" fill="#2c1c50" stroke="#a78bfa" strokeWidth="2" />
              <path d="M34 22v82M266 22v82M81 148h138" fill="none" stroke="#ffd75e" strokeWidth="5" />
              <path d="M34 104h47v44M266 104h-47v44" fill="none" stroke="#ff7aac" strokeWidth="4" strokeDasharray="5 4" />
              <text x="150" y="63" textAnchor="middle" fill="#f7f3ff" fontSize="12">SEW SIDES + BOTTOM</text>
              <text x="150" y="86" textAnchor="middle" fill="#b8aed0" fontSize="10">LEAVE 2 CORNER OPENINGS</text>
            </svg>
          </article>
          <article>
            <header><span>Lining shell</span><strong>Lining 1 + Lining 2 · right sides together</strong></header>
            <svg viewBox="0 0 300 170" role="img" aria-label="Lining panels right sides together with side and bottom seams sewn, bottom corner openings open, and a turning gap in the bottom seam">
              <path d="M34 22h232v82h-47v44H81v-44H34Z" fill="#10364a" stroke="#4de1ff" strokeWidth="2" />
              <path d="M34 22v82M266 22v82M81 148h45M174 148h45" fill="none" stroke="#ffd75e" strokeWidth="5" />
              <path d="M126 148h48" stroke="#4de1ff" strokeWidth="4" strokeDasharray="6 4" />
              <path d="M34 104h47v44M266 104h-47v44" fill="none" stroke="#ff7aac" strokeWidth="4" strokeDasharray="5 4" />
              <text x="150" y="63" textAnchor="middle" fill="#f7f3ff" fontSize="12">SEW SIDES + BOTTOM</text>
              <text x="150" y="87" textAnchor="middle" fill="#a7efff" fontSize="10">LEAVE 3–4″ / 8–10 CM GAP</text>
            </svg>
          </article>
        </div>
        <div className={styles.criticalStrip}><strong>At both zipper ends:</strong> fold the zipper seam allowances toward the lining, match the outer-to-lining seam, and sew slowly across nylon coil teeth. Trim excess tape only after the side seams are secure.</div>
      </section>

      <section className={styles.sewingMap}>
        <div className={styles.sectionHeading}>
          <span>Step 5</span>
          <div><strong>Sew four pre-cut boxed corners</strong><small>Two in the outer shell and two in the lining shell; no fabric is trimmed after assembly.</small></div>
        </div>
        <div className={styles.sewingSteps}>
          <article><span>A</span><strong>Find one paired opening</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M24 18h132v40h-42v34H24Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M114 92V58h42" fill="none" stroke="#ff7aac" strokeWidth="4" /></svg><p>Two matching {cornerCut} cutouts have formed one open corner.</p></article>
          <article><span>B</span><strong>Match seams + raw edges</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M31 27 89 55 149 27" fill="none" stroke="#a78bfa" strokeWidth="19" strokeLinejoin="round" /><path d="M31 27 89 55 149 27" fill="none" stroke="#ff7aac" strokeWidth="3" /><path d="M47 79h84" stroke="#d9d2ef" strokeDasharray="5 4" /><path d="m76 67 13 12 13-12" fill="none" stroke="#d9d2ef" strokeWidth="2" /></svg><p>Pull the opening flat. Nest the side seam directly on the bottom seam.</p></article>
          <article><span>C</span><strong>Sew straight across</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M26 31 154 70 143 98 15 59Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M26 31 154 70" stroke="#ff7aac" strokeWidth="4" /><path d="M20 50 148 89" stroke="#ffd75e" strokeWidth="5" /></svg><p>Sew {seamAllowance} from the raw edge; finished depth ≈ {finishedDepth}. Backstitch both ends.</p></article>
        </div>
        <div className={styles.cornerCount}><span>OUTER</span><b>left + right</b><i aria-hidden="true">＋</i><span>LINING</span><b>left + right</b><strong>= 4 boxed-corner seams</strong></div>
      </section>

      <section className={styles.anchorSection}>
        <div className={styles.sectionHeading}>
          <span>Step 6</span>
          <div><strong>Optional: anchor matching corners</strong><small>This keeps the lining seated without putting raw edges inside the bag.</small></div>
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

      <section className={styles.finishSection}>
        <div className={styles.sectionHeading}>
          <span>Step 7</span>
          <div><strong>Turn, close + finish</strong><small>The zipper and lining openings are the two exits you must preserve.</small></div>
        </div>
        <div className={styles.finishChecks}>
          <article><b>1</b><span><strong>Turn</strong> Pull the entire pouch through the lining gap, then through the half-open zipper.</span></article>
          <article><b>2</b><span><strong>Shape</strong> Push out the outer corners and check that both boxed seams sit square.</span></article>
          <article><b>3</b><span><strong>Close</strong> Fold the lining gap allowances inward and edgestitch or ladder-stitch closed.</span></article>
          <article><b>4</b><span><strong>Seat</strong> Place the lining inside and press gently around the zipper.</span></article>
        </div>
      </section>

      <section className={styles.fullPattern}>
        <div className={styles.sectionHeading}>
          <span>Full pattern</span>
          <div><strong>Complete order of construction</strong><small>Use {seamAllowance} seam allowance unless a step says otherwise.</small></div>
        </div>
        <ol>
          <li><strong>Cut and mark.</strong> Cut two outer and two lining panels at {panelLength} × {panelWidth}. Mark the top edge on every piece. Remove a {cornerCut} square from both bottom corners of every panel.</li>
          <li><strong>Add structure.</strong> Fuse optional interfacing to the wrong side of each outer panel. Transfer the top mark and bottom turning-gap marks.</li>
          <li><strong>Sew zipper side 1.</strong> Stack Outer 1 right side up, zipper right side down, and Lining 1 right side down. Align top raw edges and sew.</li>
          <li><strong>Sew zipper side 2.</strong> Stack Outer 2 right side up, the free zipper tape edge right side down, and Lining 2 right side down. Keep the first pair clear and sew.</li>
          <li><strong>Press and topstitch.</strong> Press both fabric layers away from the zipper teeth; topstitch close to each folded edge.</li>
          <li><strong>Form the shells.</strong> Open the zipper halfway. Put outer panels right sides together and lining panels right sides together. Match zipper joins, side edges, bottom edges, and every cutout.</li>
          <li><strong>Sew the perimeter.</strong> Sew outer sides and bottom, leaving both corner openings. Sew lining sides and bottom separately, leaving both corner openings plus a 3–4″ / 8–10 cm gap in the lining bottom.</li>
          <li><strong>Box four corners.</strong> For each shell, pull one corner opening flat, nest its side and bottom seams, and sew straight across {seamAllowance} from the raw edge. Repeat for two outer and two lining corners.</li>
          <li><strong>Anchor if wanted.</strong> Without twisting the lining, tack each outer cap seam allowance to its matching lining cap seam allowance.</li>
          <li><strong>Turn and close.</strong> Turn through the lining gap, shape the pouch, close the gap, and place the lining inside. The finished bag is {finishedLength} long × {finishedDepth} deep × {finishedHeight} high.</li>
        </ol>
      </section>
    </figure>
  );
}

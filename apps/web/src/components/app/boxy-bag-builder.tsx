"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "@/app/app/boxy-bag/boxy-bag.module.css";
import { useAuth } from "@/components/auth/auth-provider";
import { calculateBoxyBagPlan } from "@/lib/sewing/boxy-bag";

type Unit = "in" | "cm";
type Draft = {
  length: number;
  seamAllowance: number;
  cornerGuideInches: number;
};

const INCH_TO_CM = 2.54;
const TEMPLATE_GUIDES_INCHES = [1, 1.5, 2, 2.5] as const;
const presets = [
  { name: "Notions", note: "1½″ tool corner", length: 7, cornerGuideInches: 1.5 },
  { name: "Everyday", note: "2″ tool corner", length: 9, cornerGuideInches: 2 },
  { name: "Travel", note: "2½″ tool corner", length: 12, cornerGuideInches: 2.5 },
] as const;

const defaultDraft: Draft = {
  length: 9,
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
    `Finished bag: ${measurementPair(draft.length, unit)} L × ${measurementPair(plan.finishedEnd, unit)} W × ${measurementPair(plan.finishedEnd, unit)} H`,
    ``,
    `CUT ALL PANELS BEFORE SEWING`,
    `Outer panel 1: start ${panelSize}; remove ${cornerSize} from all 4 corners`,
    `Outer panel 2: start ${panelSize}; remove ${cornerSize} from all 4 corners`,
    `Lining panel 1: start ${panelSize}; remove ${cornerSize} from all 4 corners`,
    `Lining panel 2: start ${panelSize}; remove ${cornerSize} from all 4 corners`,
    `Interfacing panels 1–2 (optional): cut to the same final shape`,
    `Zipper tape: 1 @ ${measurementPair(plan.recommendedZipper, unit)}`,
    ``,
    `CORNER TOTAL`,
    `Remove 4 squares per mandatory panel = 16 ${guide} corner squares total.`,
    ``,
    `SEW`,
    `1. Install the zipper and sew the main panel seams with the corner squares already removed.`,
    `2. At every open notch, bring its two raw edges together.`,
    `3. Sew ${measurementPair(draft.seamAllowance, unit)} from the matched raw edges.`,
    `4. Each finished diagonal cap seam is about ${measurementPair(plan.cornerStitchLine, unit)} across.`,
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
    draft.seamAllowance > 0 &&
    plan.cornerCut > draft.seamAllowance;

  function chooseUnit(nextUnit: Unit) {
    if (nextUnit === unit) return;
    setDraft((current) => convertDraft(current, nextUnit));
    setUnit(nextUnit);
  }

  function updateDraft(key: "length" | "seamAllowance", value: number) {
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
  const finishedEndLabel = formatMeasurement(plan.finishedEnd, unit);

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
              Choose one of the four corners on your acrylic tool. The builder
              sizes every shaped panel, the finished square end, and the zipper.
            </p>
            <div className={styles.heroTags} aria-label="Pattern details">
              <span>Fully lined</span>
              <span>Cut first</span>
              <span>4 tool sizes</span>
            </div>
          </div>
          <BagDiagram
            length={formatMeasurement(draft.length, unit)}
            width={finishedEndLabel}
            height={finishedEndLabel}
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
              <MeasurementInput id="bag-seam" label="Seam allowance" note="Used throughout" value={draft.seamAllowance} unit={unit} step={measurementStep} onChange={(value) => updateDraft("seamAllowance", value)} />
            </div>

            <fieldset className={styles.templatePicker}>
              <legend>Choose the tool corner</legend>
              <p>These are the four printed square corners on your acrylic template.</p>
              <div className={styles.templateChoices}>
                {TEMPLATE_GUIDES_INCHES.map((guide) => {
                  const cut = guideInUnit(guide, unit);
                  const finishedEnd = Math.max(0, (cut - draft.seamAllowance) * 2);
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
                      <small>{formatMeasurement(finishedEnd, unit)} finished end</small>
                    </button>
                  );
                })}
              </div>
              <div className={styles.derivedEnd}>
                <span>Selected cut</span>
                <strong>{formatInches(draft.cornerGuideInches)} square</strong>
                <small>makes a {finishedEndLabel} × {finishedEndLabel} finished end</small>
              </div>
            </fieldset>

            {!isValid ? (
              <p className={styles.validation} role="alert">
                The seam allowance must be smaller than the selected tool corner.
              </p>
            ) : null}

            <div className={styles.methodNote}>
              <span aria-hidden="true">✂</span>
              <p>
                <strong>Cut-first method</strong> Trace and remove all four corner squares from every outer and lining panel before any sewing. Your <a href="https://www.amazon.com/dp/B0H8RCQGS9" target="_blank" rel="noreferrer">acrylic tool</a> supplies the exact cut size.
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
              <strong>{formatMeasurement(draft.length, unit)} × {finishedEndLabel} × {finishedEndLabel}</strong>
              <small>length × width × height · square end</small>
            </div>

            <div className={styles.outputGrid}>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 2</span> Outer panels</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>Then remove four {cornerCutLabel} squares from each panel.</small>
              </article>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 2</span> Lining panels</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>Same final shape as the outer panels.</small>
              </article>
              <article className={`${styles.cutCard} ${styles.cornerCard}`}>
                <div className={styles.outputLabel}><span>Cut 4 ea.</span> Every panel</div>
                <strong>{cornerCutLabel} × {cornerCutLabel}</strong>
                <small>16 corner squares removed across the four mandatory panels.</small>
              </article>
              <article className={`${styles.cutCard} ${styles.zipperCard}`}>
                <div className={styles.outputLabel}><span>Cut 1</span> Zipper tape</div>
                <strong>{formatMeasurement(plan.recommendedZipper, unit)}</strong>
                <small>Includes working room beyond the finished zipper opening.</small>
              </article>
            </div>

            <article className={styles.cutFirstCallout}>
              <span aria-hidden="true">01 → 02 → 03</span>
              <div>
                <strong>Cut shapes first. Install zipper second. Sew corner caps last.</strong>
                <p>The corner squares are already gone when you begin assembly; no measuring or trimming a pinched triangle later.</p>
              </div>
            </article>

            <PatternDiagram
              finishedLength={formatMeasurement(draft.length, unit)}
              panelLength={formatMeasurement(plan.panelLength, unit)}
              panelWidth={formatMeasurement(plan.panelWidth, unit)}
              cornerCut={cornerCutLabel}
              finishedEnd={finishedEndLabel}
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
                  <li>Match each notch’s two raw edges and sew the diagonal cap seam.</li>
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
      <figcaption>Finished square-end preview</figcaption>
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
      <svg viewBox="0 0 300 170" role="img" aria-label={`${layer} panel ${number}, ${panelLength} by ${panelWidth}, with four ${cornerCut} square corners removed`}>
        <g fill="#ff7aac" fillOpacity=".13" stroke="#ff7aac" strokeDasharray="5 4"><rect x="26" y="22" width="46" height="46" /><rect x="228" y="22" width="46" height="46" /><rect x="26" y="102" width="46" height="46" /><rect x="228" y="102" width="46" height="46" /></g>
        <path d="M72 22h156v46h46v34h-46v46H72v-46H26V68h46Z" fill={outer ? "#302052" : "#12364b"} stroke={outer ? "#a78bfa" : "#4de1ff"} strokeWidth="2" />
        <path d="M72 22h156" stroke="#ffd75e" strokeWidth="4" />
        <text x="150" y="91" textAnchor="middle" fill="#f6f2ff" fontSize="15" fontWeight="700">{layer.toUpperCase()} {number}</text>
        <text x="150" y="116" textAnchor="middle" fill="#a9a0bf" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">4 × {cornerCut} CUTOUTS</text>
      </svg>
      <p><strong>{panelLength} × {panelWidth}</strong><span>overall before corner squares</span></p>
    </article>
  );
}

function PatternDiagram({ finishedLength, panelLength, panelWidth, cornerCut, finishedEnd, seamAllowance }: {
  finishedLength: string;
  panelLength: string;
  panelWidth: string;
  cornerCut: string;
  finishedEnd: string;
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

      <section className={styles.allPanelsSection}>
        <div className={styles.sectionHeading}>
          <span>Step 1</span>
          <div><strong>Cut these four mandatory panels</strong><small>Each one receives four corner cutouts before assembly.</small></div>
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
          <div><strong>Measure one panel</strong><small>Repeat these exact cuts for all four fabric panels.</small></div>
        </div>
        <svg viewBox="0 0 760 390" role="img" aria-label={`Panel starts ${panelLength} by ${panelWidth}. Remove a ${cornerCut} square from all four corners. The remaining center edges are ${finishedLength} along the zipper and ${finishedEnd} on the sides.`}>
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
            <text x="284" y="24" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">ZIPPER EDGE AFTER CUT · {finishedLength}</text>
            <text x="284" y="198" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">REMOVE 4 SQUARES · {cornerCut} × {cornerCut}</text>
            <g stroke="#d9d2ef" strokeWidth="1.3" markerStart="url(#measure-arrow)" markerEnd="url(#measure-arrow)"><path d="M0 270h568" /><path d="M-31 0v236" /><path d="M0 -24h64" /><path d="M-22 0v64" /></g>
            <text x="284" y="299" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14">OVERALL {panelLength}</text>
            <text x="-42" y="118" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14" transform="rotate(-90 -42 118)">OVERALL {panelWidth}</text>
            <text x="32" y="-31" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">{cornerCut}</text>
            <text x="-30" y="34" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11" transform="rotate(-90 -30 34)">{cornerCut}</text>
          </g>
        </svg>
      </section>

      <section className={styles.sewingMap}>
        <div className={styles.sectionHeading}>
          <span>Step 3</span>
          <div><strong>Sew the pre-cut corner caps</strong><small>No corner fabric is trimmed after assembly.</small></div>
        </div>
        <div className={styles.sewingSteps}>
          <article><span>A</span><strong>Leave notch open</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M24 18h132v74H96V58H60v34H24Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M60 92V58h36v34" fill="none" stroke="#ff7aac" strokeWidth="4" /></svg><p>The {cornerCut} square is already removed.</p></article>
          <article><span>B</span><strong>Match raw edges</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M31 27 89 55 149 27" fill="none" stroke="#a78bfa" strokeWidth="19" strokeLinejoin="round" /><path d="M31 27 89 55 149 27" fill="none" stroke="#ff7aac" strokeWidth="3" /><path d="M47 79h84" stroke="#d9d2ef" strokeDasharray="5 4" /><path d="m76 67 13 12 13-12" fill="none" stroke="#d9d2ef" strokeWidth="2" /></svg><p>Bring both cut edges together evenly.</p></article>
          <article><span>C</span><strong>Sew the diagonal cap</strong><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M26 31 154 70 143 98 15 59Z" fill="#241943" stroke="#a78bfa" strokeWidth="2" /><path d="M26 31 154 70" stroke="#ff7aac" strokeWidth="4" /><path d="M20 50 148 89" stroke="#ffd75e" strokeWidth="5" /></svg><p>Sew {seamAllowance} from the matched edge; finished cap ≈ {finishedEnd}.</p></article>
        </div>
      </section>
    </figure>
  );
}

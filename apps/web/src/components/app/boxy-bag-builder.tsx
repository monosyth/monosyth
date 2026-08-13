"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "@/app/app/boxy-bag/boxy-bag.module.css";
import { useAuth } from "@/components/auth/auth-provider";
import { calculateBoxyBagPlan } from "@/lib/sewing/boxy-bag";

type Unit = "in" | "cm";
type Draft = {
  length: number;
  width: number;
  height: number;
  seamAllowance: number;
};

const INCH_TO_CM = 2.54;
const TEMPLATE_GUIDES_INCHES = [1, 1.5, 2, 2.5] as const;
const presets = [
  { name: "Notions", note: "Pins + small tools", length: 7, width: 3, height: 3 },
  { name: "Everyday", note: "Makeup + cables", length: 9, width: 4, height: 4 },
  { name: "Travel", note: "Roomy toiletry bag", length: 12, width: 5, height: 5 },
] as const;

const defaultDraft: Draft = {
  length: 9,
  width: 4,
  height: 4,
  seamAllowance: 0.5,
};

function roundForInput(value: number) {
  return Math.round(value * 1000) / 1000;
}

function convertDraft(draft: Draft, nextUnit: Unit): Draft {
  const factor = nextUnit === "cm" ? INCH_TO_CM : 1 / INCH_TO_CM;
  return {
    length: roundForInput(draft.length * factor),
    width: roundForInput(draft.width * factor),
    height: roundForInput(draft.height * factor),
    seamAllowance: roundForInput(draft.seamAllowance * factor),
  };
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

function getTemplateFit(guide: number, unit: Unit) {
  const guideInches = unit === "in" ? guide : guide / INCH_TO_CM;
  const exactGuide = TEMPLATE_GUIDES_INCHES.find(
    (size) => Math.abs(size - guideInches) < 0.01,
  );
  const nearestGuide = TEMPLATE_GUIDES_INCHES.reduce((nearest, size) =>
    Math.abs(size - guideInches) < Math.abs(nearest - guideInches) ? size : nearest,
  );

  return { exactGuide, guideInches, nearestGuide };
}

function buildCuttingList(draft: Draft, unit: Unit) {
  const plan = calculateBoxyBagPlan({
    ...draft,
    zipperExtra: unit === "in" ? 2 : 5,
  });
  const templateFit = getTemplateFit(plan.cornerTemplateGuide, unit);
  const guideText = templateFit.exactGuide
    ? `Use the ${formatInches(templateFit.exactGuide)} corner on the clear Boxy Bag Template.`
    : `Required guide: ${formatInches(templateFit.guideInches)}. The clear template has 1″, 1 1/2″, 2″, and 2 1/2″ corners; mark this custom size with a ruler.`;

  return [
    `BOXY BAG CUTTING PLAN`,
    `Finished bag: ${measurementPair(draft.length, unit)} L × ${measurementPair(draft.width, unit)} W × ${measurementPair(draft.height, unit)} H`,
    `Seam allowance: ${measurementPair(draft.seamAllowance, unit)}`,
    ``,
    `CUT`,
    `Outer fabric: 2 @ ${measurementPair(plan.panelLength, unit)} × ${measurementPair(plan.panelWidth, unit)}`,
    `Lining: 2 @ ${measurementPair(plan.panelLength, unit)} × ${measurementPair(plan.panelWidth, unit)}`,
    `Interfacing (optional): 2 @ ${measurementPair(plan.panelLength, unit)} × ${measurementPair(plan.panelWidth, unit)}`,
    `Zipper tape: 1 @ ${measurementPair(plan.recommendedZipper, unit)}`,
    ``,
    `BOX THE CORNERS — OUTER + LINING`,
    guideText,
    `The guide is half the finished front-to-back width: ${measurementPair(plan.cornerTemplateGuide, unit)}.`,
    `If measuring from the raw fabric corner before sewing, mark ${measurementPair(plan.rawCornerMark, unit)} (guide + seam allowance).`,
    `Cut the square, bring its two raw edges together, and sew with a ${measurementPair(draft.seamAllowance, unit)} seam allowance. The finished corner seam is ${measurementPair(plan.cornerStitchLine, unit)} across.`,
  ].join("\n");
}

export function BoxyBagBuilder() {
  const { status } = useAuth();
  const [unit, setUnit] = useState<Unit>("in");
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const plan = useMemo(
    () =>
      calculateBoxyBagPlan({
        ...draft,
        zipperExtra: unit === "in" ? 2 : 5,
      }),
    [draft, unit],
  );
  const templateFit = getTemplateFit(plan.cornerTemplateGuide, unit);

  const isValid =
    draft.length > 0 &&
    draft.width > 0 &&
    draft.height > 0 &&
    draft.seamAllowance > 0;

  function chooseUnit(nextUnit: Unit) {
    if (nextUnit === unit) return;
    setDraft((current) => convertDraft(current, nextUnit));
    setUnit(nextUnit);
  }

  function updateDraft(key: keyof Draft, value: number) {
    setDraft((current) => ({
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
      width: roundForInput(preset.width * factor),
      height: roundForInput(preset.height * factor),
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
            <p className={styles.eyebrow}>Sewing studio / Draft 01</p>
            <h1>Build the box.<br /><span>We’ll do the math.</span></h1>
            <p className={styles.heroIntro}>
              Start with the size you want to hold. Get an exact cutting list,
              the matching box-corner guide, zipper length, and a visual pattern map.
            </p>
            <div className={styles.heroTags} aria-label="Pattern details">
              <span>Fully lined</span>
              <span>Cut rectangles first</span>
              <span>Template-ready</span>
            </div>
          </div>
          <BagDiagram
            length={formatMeasurement(draft.length, unit)}
            width={formatMeasurement(draft.width, unit)}
            height={formatMeasurement(draft.height, unit)}
          />
        </header>

        <div className={styles.workspace}>
          <aside className={styles.controls}>
            <div className={styles.cardHeading}>
              <div>
                <p className={styles.cardNumber}>01</p>
                <h2>Finished size</h2>
              </div>
              <div className={styles.unitToggle} aria-label="Measurement unit">
                <button
                  type="button"
                  aria-pressed={unit === "in"}
                  className={unit === "in" ? styles.unitActive : ""}
                  onClick={() => chooseUnit("in")}
                >
                  inches
                </button>
                <button
                  type="button"
                  aria-pressed={unit === "cm"}
                  className={unit === "cm" ? styles.unitActive : ""}
                  onClick={() => chooseUnit("cm")}
                >
                  cm
                </button>
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
              <MeasurementInput
                id="bag-length"
                label="Length"
                note="Along the zipper"
                value={draft.length}
                unit={unit}
                step={measurementStep}
                onChange={(value) => updateDraft("length", value)}
              />
              <MeasurementInput
                id="bag-width"
                label="Width"
                note="Front to back"
                value={draft.width}
                unit={unit}
                step={measurementStep}
                onChange={(value) => updateDraft("width", value)}
              />
              <MeasurementInput
                id="bag-height"
                label="Height"
                note="Top to bottom"
                value={draft.height}
                unit={unit}
                step={measurementStep}
                onChange={(value) => updateDraft("height", value)}
              />
              <MeasurementInput
                id="bag-seam"
                label="Seam allowance"
                note="Used throughout"
                value={draft.seamAllowance}
                unit={unit}
                step={measurementStep}
                onChange={(value) => updateDraft("seamAllowance", value)}
              />
            </div>

            {!isValid ? (
              <p className={styles.validation} role="alert">
                Enter positive dimensions and a positive seam allowance.
              </p>
            ) : null}

            <div className={styles.methodNote}>
              <span aria-hidden="true">⌁</span>
              <p>
                <strong>Your tool method</strong> Cut two outer and two lining rectangles first,
                then box the assembled corners with the clear <a href="https://www.amazon.com/dp/B0H8RCQGS9" target="_blank" rel="noreferrer">1″–2½″ guide</a>.
              </p>
            </div>
          </aside>

          <section className={styles.results} aria-live="polite">
            <div className={styles.resultsHeader}>
              <div>
                <p className={styles.cardNumber}>02</p>
                <h2>Your cutting plan</h2>
                <p>Measurements update as you type.</p>
              </div>
              <div className={styles.resultActions}>
                <button type="button" onClick={() => void copyPlan()} disabled={!isValid}>
                  {copyState === "copied" ? "Copied ✓" : copyState === "error" ? "Copy failed" : "Copy list"}
                </button>
                <button type="button" onClick={() => window.print()} disabled={!isValid}>Print plan</button>
              </div>
            </div>

            <div className={styles.finishedBanner}>
              <span>Finished bag</span>
              <strong>
                {formatMeasurement(draft.length, unit)} × {formatMeasurement(draft.width, unit)} × {formatMeasurement(draft.height, unit)}
              </strong>
              <small>length × width × height</small>
            </div>

            <div className={styles.outputGrid}>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 2</span> Outer fabric</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>{formatEquivalent(plan.panelLength, unit)} × {formatEquivalent(plan.panelWidth, unit)}</small>
              </article>
              <article className={styles.cutCard}>
                <div className={styles.outputLabel}><span>Cut 2</span> Lining</div>
                <strong>{formatMeasurement(plan.panelLength, unit)} × {formatMeasurement(plan.panelWidth, unit)}</strong>
                <small>{formatEquivalent(plan.panelLength, unit)} × {formatEquivalent(plan.panelWidth, unit)}</small>
              </article>
              <article className={`${styles.cutCard} ${styles.cornerCard}`}>
                <div className={styles.outputLabel}><span>Use</span> Boxy bag template</div>
                <strong>{formatMeasurement(plan.cornerTemplateGuide, unit)} corner guide</strong>
                <small>Half the finished front-to-back width; sew with a {formatMeasurement(draft.seamAllowance, unit)} seam allowance</small>
              </article>
              <article className={`${styles.cutCard} ${styles.zipperCard}`}>
                <div className={styles.outputLabel}><span>Cut 1</span> Zipper tape</div>
                <strong>{formatMeasurement(plan.recommendedZipper, unit)}</strong>
                <small>{formatMeasurement(unit === "in" ? 1 : 2.5, unit)} working room at each end</small>
              </article>
            </div>

            <article className={`${styles.templateCallout} ${templateFit.exactGuide ? "" : styles.templateWarning}`}>
              <span className={styles.templateIcon} aria-hidden="true">⌜</span>
              <div>
                <span>Your clear template</span>
                <strong>
                  {templateFit.exactGuide
                    ? `Use the ${formatInches(templateFit.exactGuide)} corner.`
                    : `This draft needs a ${formatInches(templateFit.guideInches)} guide.`}
                </strong>
                <p>
                  {templateFit.exactGuide
                    ? `That guide makes the finished bag ${formatMeasurement(draft.width, unit)} front to back. If you measure from the raw fabric edge instead of the sewn seam lines, mark ${formatMeasurement(plan.rawCornerMark, unit)}.`
                    : `The tool has 1″, 1 1/2″, 2″, and 2 1/2″ corners. Its nearest mark is ${formatInches(templateFit.nearestGuide)}; use a ruler for this custom size or change the finished width to ${formatMeasurement((templateFit.nearestGuide * 2) * (unit === "in" ? 1 : INCH_TO_CM), unit)}.`}
                </p>
              </div>
            </article>

            <PatternDiagram
              panelLength={formatMeasurement(plan.panelLength, unit)}
              panelWidth={formatMeasurement(plan.panelWidth, unit)}
              cornerGuide={formatMeasurement(plan.cornerTemplateGuide, unit)}
              rawCornerMark={formatMeasurement(plan.rawCornerMark, unit)}
              stitchLine={formatMeasurement(plan.cornerStitchLine, unit)}
              seamAllowance={formatMeasurement(draft.seamAllowance, unit)}
            />

            <div className={styles.notesGrid}>
              <article>
                <p className={styles.cardNumber}>03</p>
                <h3>Cutting checklist</h3>
                <ul>
                  <li><span>2</span> outer panels</li>
                  <li><span>2</span> lining panels</li>
                  <li><span>2</span> interfacing panels, optional</li>
                  <li><span>1</span> nylon coil zipper</li>
                </ul>
              </article>
              <article>
                <p className={styles.cardNumber}>04</p>
                <h3>Corner sequence</h3>
                <ol>
                  <li>Assemble the zipper, bottom, and side seams.</li>
                  <li>Use the {formatMeasurement(plan.cornerTemplateGuide, unit)} guide at each sewn corner and cut.</li>
                  <li>Bring the two cut edges together and sew the diagonal cap seam.</li>
                </ol>
              </article>
            </div>

            <p className={styles.accuracyNote}>
              Finished size is approximate: fabric bulk, zipper installation, and turn-of-cloth can shift the result slightly. For precious fabric, test the draft in muslin first.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function MeasurementInput({
  id,
  label,
  note,
  value,
  unit,
  step,
  onChange,
}: {
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
        <input
          id={id}
          type="number"
          min={step}
          step={step}
          value={value}
          onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        />
        <b>{unit === "in" ? "in" : "cm"}</b>
      </span>
    </label>
  );
}

function BagDiagram({ length, width, height }: { length: string; width: string; height: string }) {
  return (
    <figure className={styles.bagFigure}>
      <svg viewBox="0 0 520 330" role="img" aria-label={`Boxy bag ${length} long, ${width} wide, ${height} high`}>
        <defs>
          <linearGradient id="bag-top" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd75e" />
            <stop offset="1" stopColor="#ff8b68" />
          </linearGradient>
          <linearGradient id="bag-front" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#7f5cff" />
            <stop offset="1" stopColor="#44229c" />
          </linearGradient>
          <linearGradient id="bag-side" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4de1ff" />
            <stop offset="1" stopColor="#177f9c" />
          </linearGradient>
          <filter id="bag-glow"><feGaussianBlur stdDeviation="9" /></filter>
          <marker id="bag-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
            <path d="M8 0 0 4l8 4" fill="none" stroke="#f8f4ff" strokeWidth="1.4" />
          </marker>
        </defs>
        <ellipse cx="272" cy="274" rx="184" ry="25" fill="#6b48d7" opacity=".35" filter="url(#bag-glow)" />
        <path d="M112 111 343 76l82 58-232 36Z" fill="url(#bag-top)" />
        <path d="M112 111 193 170v88l-81-57Z" fill="url(#bag-side)" />
        <path d="M193 170 425 134v88l-232 36Z" fill="url(#bag-front)" />
        <path d="m134 119 209-32 61 43-211 32Z" fill="none" stroke="#231244" strokeWidth="6" strokeLinecap="round" />
        <path d="m344 87 60 43" stroke="#fff5c2" strokeWidth="3" strokeDasharray="4 6" />
        <rect x="335" y="84" width="22" height="13" rx="6" transform="rotate(35 335 84)" fill="#241744" />
        <g fill="none" stroke="#f8f4ff" strokeWidth="1.5" markerStart="url(#bag-arrow)" markerEnd="url(#bag-arrow)">
          <path d="m196 292 228-36" />
          <path d="m83 116 0 86" />
          <path d="m110 84 78 55" />
        </g>
        <g fill="#f8f4ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="14" fontWeight="500">
          <text x="285" y="306" textAnchor="middle">L {length}</text>
          <text x="70" y="164" textAnchor="end">H {height}</text>
          <text x="126" y="72" textAnchor="middle">W {width}</text>
        </g>
      </svg>
      <figcaption>Finished shape preview</figcaption>
    </figure>
  );
}

function PatternDiagram({
  panelLength,
  panelWidth,
  cornerGuide,
  rawCornerMark,
  stitchLine,
  seamAllowance,
}: {
  panelLength: string;
  panelWidth: string;
  cornerGuide: string;
  rawCornerMark: string;
  stitchLine: string;
  seamAllowance: string;
}) {
  return (
    <figure className={styles.patternFigure}>
      <div className={styles.figureTitle}>
        <div><span>Pattern map</span><strong>Cut the rectangles first. Box the sewn corners second.</strong></div>
        <span className={styles.figureScale}>diagram · not to scale</span>
      </div>
      <div className={styles.diagramLegend} aria-label="Diagram color key">
        <span><i className={styles.legendCut} /> pink = cut away</span>
        <span><i className={styles.legendSew} /> yellow = sew</span>
        <span><i className={styles.legendSeam} /> cyan = existing seam</span>
      </div>
      <div className={styles.diagramSteps}>
        <section className={styles.diagramStep}>
          <header className={styles.diagramStepHeader}>
            <span>1</span>
            <div>
              <strong>Cut flat panels</strong>
              <small>Two outer + two lining, all the same size.</small>
            </div>
          </header>
          <svg viewBox="0 0 560 350" role="img" aria-label={`Cut two outer and two lining rectangles ${panelLength} by ${panelWidth}. Do not cut corners from the flat panels.`}>
            <defs>
              <pattern id="fabric-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M22 0H0v22" fill="none" stroke="#a78bfa" strokeOpacity=".12" strokeWidth="1" />
              </pattern>
              <marker id="panel-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
                <path d="M8 0 0 4l8 4" fill="none" stroke="#d9d2ef" strokeWidth="1.4" />
              </marker>
            </defs>
            <g transform="translate(54 50)">
              <rect width="452" height="220" rx="3" fill="#1c1535" stroke="#a78bfa" strokeWidth="2" />
              <rect width="452" height="220" rx="3" fill="url(#fabric-grid)" />
              <rect x="16" y="16" width="420" height="188" rx="2" fill="none" stroke="#4de1ff" strokeDasharray="7 7" strokeOpacity=".82" />
              <path d="M0 27h452" stroke="#ffd75e" strokeWidth="5" />
              <rect x="145" y="14" width="162" height="26" rx="13" fill="#130d2c" stroke="#ffd75e" strokeOpacity=".55" />
              <text x="226" y="32" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">ATTACH TO ZIPPER</text>
              <text x="226" y="111" textAnchor="middle" fill="#f6f2ff" fontSize="23" fontWeight="650">OUTER · CUT 2</text>
              <text x="226" y="141" textAnchor="middle" fill="#bcb2d4" fontFamily="var(--font-ibm-plex-mono)" fontSize="14">LINING · CUT 2 AT SAME SIZE</text>
              <text x="226" y="188" textAnchor="middle" fill="#4de1ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">ASSEMBLE ZIPPER + MAIN SEAMS FIRST</text>
              <g stroke="#d9d2ef" strokeWidth="1.4" markerStart="url(#panel-arrow)" markerEnd="url(#panel-arrow)">
                <path d="M0 249h452" />
                <path d="M-25 0v220" />
              </g>
              <text x="226" y="276" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="15">{panelLength}</text>
              <text x="-34" y="110" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="15" transform="rotate(-90 -34 110)">{panelWidth}</text>
            </g>
            <text x="280" y="332" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">START WITH THE FULL RECTANGLE</text>
          </svg>
        </section>

        <section className={styles.diagramStep}>
          <header className={styles.diagramStepHeader}>
            <span>2</span>
            <div>
              <strong>Cut + sew each corner cap</strong>
              <small>Use the Boxy Bag Template after the main seams are sewn.</small>
            </div>
          </header>
          <svg viewBox="0 0 520 350" role="img" aria-label={`At each sewn corner, use the ${cornerGuide} template guide. If measuring from the raw edge, mark ${rawCornerMark}. Cut away the pink square, bring the two cut edges together, and sew with a ${seamAllowance} seam allowance. The finished corner seam is ${stitchLine}.`}>
            <defs>
              <pattern id="cut-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#ff7aac" fillOpacity=".16" />
                <path d="M0 0v8" stroke="#ff7aac" strokeOpacity=".5" strokeWidth="2" />
              </pattern>
              <marker id="fold-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0 0 8 4 0 8" fill="none" stroke="#d9d2ef" strokeWidth="1.4" />
              </marker>
            </defs>
            <g>
              <text x="105" y="30" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">A · TRACE + CUT</text>
              <path d="M24 52h181v181H24Z" fill="#21183d" stroke="#a78bfa" strokeWidth="2" />
              <path d="M181 52v157H24M24 209h157" fill="none" stroke="#4de1ff" strokeWidth="1.7" strokeDasharray="7 6" />
              <path d="M126 154h79v79h-79Z" fill="url(#cut-hatch)" />
              <path d="M126 233v-79h79" fill="none" stroke="#ff7aac" strokeWidth="3" strokeDasharray="7 5" />
              <circle cx="181" cy="209" r="5" fill="#4de1ff" />
              <text x="174" y="198" textAnchor="end" fill="#9ff1ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">SEAM INTERSECTION</text>
              <text x="165" y="176" textAnchor="middle" fill="#ffd0e2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">CUT AWAY</text>
              <text x="114" y="260" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">RAW-EDGE MARK {rawCornerMark}</text>
              <path d="M181 214v36M126 238v12" stroke="#ffb3d2" strokeWidth="1" />
              <path d="M126 247h55" stroke="#ffb3d2" strokeWidth="1.4" />
              <text x="105" y="284" textAnchor="middle" fill="#d8d0eb" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">TOOL GUIDE {cornerGuide}</text>

              <path d="M226 154h48" fill="none" stroke="#d9d2ef" strokeWidth="1.5" strokeDasharray="5 5" markerEnd="url(#fold-arrow)" />
              <text x="250" y="143" textAnchor="middle" fill="#9389aa" fontFamily="var(--font-ibm-plex-mono)" fontSize="9">MATCH EDGES</text>

              <text x="397" y="30" textAnchor="middle" fill="#f6f2ff" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">B · BRING EDGES TOGETHER</text>
              <path d="M291 85 486 168 454 245 259 162Z" fill="#21183d" stroke="#a78bfa" strokeWidth="2.2" />
              <path d="M291 85 486 168" stroke="#ff7aac" strokeWidth="4" />
              <path d="M281 109 476 192" stroke="#ffd75e" strokeWidth="5" />
              <path d="M271 133 466 216" stroke="#4de1ff" strokeWidth="1.5" strokeDasharray="7 6" opacity=".8" />
              <text x="395" y="104" transform="rotate(23 395 104)" textAnchor="middle" fill="#ffd0e2" fontFamily="var(--font-ibm-plex-mono)" fontSize="10">MATCHED RAW EDGES</text>
              <text x="378" y="157" transform="rotate(23 378 157)" textAnchor="middle" fill="#fff3b0" fontFamily="var(--font-ibm-plex-mono)" fontSize="12">SEW {seamAllowance} FROM EDGE</text>
              <text x="372" y="276" textAnchor="middle" fill="#d8d0eb" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">FINISHED CAP SEAM · {stitchLine}</text>
              <text x="260" y="323" textAnchor="middle" fill="#ffb3d2" fontFamily="var(--font-ibm-plex-mono)" fontSize="11">PINK IS REMOVED · YELLOW IS THE ONLY NEW SEAM</text>
            </g>
          </svg>
          <ol className={styles.diagramInstructions}>
            <li>Use the <strong>{cornerGuide}</strong> template corner at the sewn seam intersection.</li>
            <li>Cut away the square. A raw-edge measurement is <strong>{rawCornerMark}</strong>.</li>
            <li>Match the two cut edges and sew with a <strong>{seamAllowance}</strong> seam allowance.</li>
          </ol>
        </section>
      </div>
    </figure>
  );
}

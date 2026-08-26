"use client";

import { useId, useState } from "react";

import styles from "@/components/app/bag-outcome-preview.module.css";
import {
  clamp,
  formatDecimal,
  formatInches,
  type BagClosure,
  type BagPatternPlan,
} from "@/lib/sewing/bag-pattern";

type PreviewView = "left" | "front" | "right";

export type BagOutcomeOptions = {
  handleDrop: number;
  sideZipperLength: number;
  zipperGap: number;
  recessDepth: number;
  recessEndGap: number;
};

type Point = {
  x: number;
  y: number;
};

type BagOutcomePreviewProps = {
  plan: BagPatternPlan;
  closure: BagClosure;
  options: BagOutcomeOptions;
};

const viewChoices: ReadonlyArray<{
  id: PreviewView;
  label: string;
  detail: string;
}> = [
  { id: "left", label: "Left", detail: "left three-quarter view" },
  { id: "front", label: "Front", detail: "straight-on view" },
  { id: "right", label: "Right", detail: "right three-quarter view" },
];

const closureLabels: Record<BagClosure, string> = {
  "open-tote": "Open tote + handles",
  "top-zipper": "Top zipper",
  "side-zipper": "Side zipper",
  "zipper-gusset": "Zipper gusset",
  "recessed-zipper": "Recessed zipper",
};

const closureNotes: Record<BagClosure, string> = {
  "open-tote": "The dark top plane is the finished opening; handle drop is scaled from the rim.",
  "top-zipper": "The two full flat top seams meet at the zipper ridge, so this closure changes the top silhouette.",
  "side-zipper": "The zipper is positioned on the visible side panel; choose Left or Right to inspect it.",
  "zipper-gusset": "The highlighted top panel spans the standing rim, with two gusset strips meeting at the measured reveal.",
  "recessed-zipper": "The zipper panel sits below the rim and stops short of both side seams by the measured end gaps.",
};

function add(point: Point, vector: Point): Point {
  return { x: point.x + vector.x, y: point.y + vector.y };
}

function lerp(from: Point, to: Point, amount: number): Point {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
  };
}

function midpoint(from: Point, to: Point): Point {
  return lerp(from, to, 0.5);
}

function points(pointsToJoin: Point[]) {
  return pointsToJoin.map((point) => `${point.x},${point.y}`).join(" ");
}

function shiftedSegment(from: Point, to: Point, distance: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const shift = { x: (-dy / length) * distance, y: (dx / length) * distance };
  return { from: add(from, shift), to: add(to, shift) };
}

function ZipperLine({
  from,
  to,
  accent = "#f6ba4c",
  label,
}: {
  from: Point;
  to: Point;
  accent?: string;
  label?: string;
}) {
  const tapeA = shiftedSegment(from, to, -4.5);
  const tapeB = shiftedSegment(from, to, 4.5);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normal = { x: (-dy / length) * 3.4, y: (dx / length) * 3.4 };
  const ticks = Array.from({ length: 20 }, (_, index) => {
    const center = lerp(from, to, (index + 0.5) / 20);
    return {
      from: { x: center.x - normal.x, y: center.y - normal.y },
      to: { x: center.x + normal.x, y: center.y + normal.y },
    };
  });
  const pull = lerp(from, to, 0.68);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <g aria-hidden="true">
      <line x1={tapeA.from.x} y1={tapeA.from.y} x2={tapeA.to.x} y2={tapeA.to.y} stroke="rgba(255,255,255,.42)" strokeWidth="3" strokeLinecap="round" />
      <line x1={tapeB.from.x} y1={tapeB.from.y} x2={tapeB.to.x} y2={tapeB.to.y} stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinecap="round" />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={accent} strokeWidth="2" strokeLinecap="round" />
      {ticks.map((tick, index) => (
        <line key={index} x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} stroke="#172638" strokeWidth="1.4" />
      ))}
      <g transform={`translate(${pull.x} ${pull.y}) rotate(${angle})`}>
        <circle r="5" fill="#172638" stroke={accent} strokeWidth="1.6" />
        <path d="M 3 -1 L 12 -1 Q 15 -1 15 2 Q 15 5 12 5 L 8 5" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      </g>
      {label ? (
        <text x={midpoint(from, to).x} y={midpoint(from, to).y - 12} className={styles.outcomeSvgLabel}>{label}</text>
      ) : null}
    </g>
  );
}

function DimensionLine({
  from,
  to,
  label,
  markerId,
  textOffset = { x: 0, y: -8 },
}: {
  from: Point;
  to: Point;
  label: string;
  markerId: string;
  textOffset?: Point;
}) {
  const center = midpoint(from, to);
  return (
    <g className={styles.outcomeDimension} aria-hidden="true">
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`} />
      <text x={center.x + textOffset.x} y={center.y + textOffset.y}>{label}</text>
    </g>
  );
}

export function BagOutcomePreview({
  plan,
  closure,
  options,
}: BagOutcomePreviewProps) {
  const [view, setView] = useState<PreviewView>("right");
  const rawId = useId().replaceAll(":", "");
  const markerId = `outcome-arrow-${rawId}`;
  const frontGradientId = `outcome-front-${rawId}`;
  const sideGradientId = `outcome-side-${rawId}`;
  const topGradientId = `outcome-top-${rawId}`;
  const weaveId = `outcome-weave-${rawId}`;
  const shadowId = `outcome-shadow-${rawId}`;

  const safeWidth = Math.max(0.5, plan.finishedBaseWidth);
  // One flat panel spans the front plus half of each side once the bag stands.
  // Subtracting the boxed depth converts that flat seam span to the visible rim.
  const standingTopWidth = Math.max(
    0,
    plan.finishedTopOpening - plan.finishedDepth,
  );
  const safeTopWidth = Math.max(0.5, standingTopWidth);
  const safeHeight = Math.max(0.5, plan.finishedHeight);
  const safeDepth = Math.max(0.25, plan.finishedDepth);
  const topCollapsesToZipper = closure === "top-zipper";
  const bodyTopWidth = topCollapsesToZipper
    ? Math.max(0.5, plan.finishedTopOpening)
    : safeTopWidth;
  const direction = view === "left" ? -1 : view === "right" ? 1 : 0;
  const depthXModel = safeDepth * (view === "front" ? 0 : 0.72) * direction;
  const depthYModel = -safeDepth * (view === "front" ? 0.82 : 0.75);
  const handleModel = closure === "open-tote"
    ? Math.max(0.5, options.handleDrop)
    : 0;
  const modelWidth = Math.max(safeWidth, bodyTopWidth) + Math.abs(depthXModel) + 3.4;
  const modelHeight = safeHeight + Math.abs(depthYModel) + handleModel + 2;
  const scale = Math.min(480 / modelWidth, 290 / modelHeight, 32);
  const baseWidth = safeWidth * scale;
  const topWidth = bodyTopWidth * scale;
  const height = safeHeight * scale;
  const depthVector = { x: depthXModel * scale, y: depthYModel * scale };
  const topDepthVector = topCollapsesToZipper
    ? { x: 0, y: 0 }
    : depthVector;
  const zipperRidgeOffset = topCollapsesToZipper
    ? { x: depthVector.x / 2, y: depthVector.y / 2 }
    : { x: 0, y: 0 };
  const frontCenterX = 360 - depthVector.x / 2;
  const bottomY = 352;
  const topCenterShift = ((plan.leftTopInset - plan.rightTopInset) / 2) * scale;
  const frontTopCenterX = frontCenterX + topCenterShift + zipperRidgeOffset.x;
  const frontTopY = bottomY - height + zipperRidgeOffset.y;
  const frontBottomLeft = { x: frontCenterX - baseWidth / 2, y: bottomY };
  const frontBottomRight = { x: frontCenterX + baseWidth / 2, y: bottomY };
  const frontTopLeft = { x: frontTopCenterX - topWidth / 2, y: frontTopY };
  const frontTopRight = { x: frontTopCenterX + topWidth / 2, y: frontTopY };
  const backBottomLeft = add(frontBottomLeft, depthVector);
  const backBottomRight = add(frontBottomRight, depthVector);
  const backTopLeft = add(frontTopLeft, topDepthVector);
  const backTopRight = add(frontTopRight, topDepthVector);
  const visibleSide = direction < 0
    ? [frontTopLeft, backTopLeft, backBottomLeft, frontBottomLeft]
    : [frontTopRight, backTopRight, backBottomRight, frontBottomRight];
  const frontFace = [frontTopLeft, frontTopRight, frontBottomRight, frontBottomLeft];
  const topFace = [frontTopLeft, frontTopRight, backTopRight, backTopLeft];
  const topZipFrom = topCollapsesToZipper
    ? frontTopLeft
    : lerp(frontTopLeft, backTopLeft, 0.5);
  const topZipTo = topCollapsesToZipper
    ? frontTopRight
    : lerp(frontTopRight, backTopRight, 0.5);
  const gussetGapRatio = clamp(options.zipperGap / safeDepth, 0, 0.98);
  const gussetSeamA = {
    from: lerp(frontTopLeft, backTopLeft, 0.5 - gussetGapRatio / 2),
    to: lerp(frontTopRight, backTopRight, 0.5 - gussetGapRatio / 2),
  };
  const gussetSeamB = {
    from: lerp(frontTopLeft, backTopLeft, 0.5 + gussetGapRatio / 2),
    to: lerp(frontTopRight, backTopRight, 0.5 + gussetGapRatio / 2),
  };
  const handleHeight = handleModel * scale;
  const frontHandleLeft = lerp(frontTopLeft, frontTopRight, 0.27);
  const frontHandleRight = lerp(frontTopLeft, frontTopRight, 0.73);
  const backHandleLeft = lerp(backTopLeft, backTopRight, 0.27);
  const backHandleRight = lerp(backTopLeft, backTopRight, 0.73);
  const widthDimensionY = bottomY + 29;
  const heightDimensionX = Math.min(frontBottomLeft.x, backBottomLeft.x, frontTopLeft.x, backTopLeft.x) - 34;
  const depthDimensionShift = direction < 0 ? -17 : 17;
  const depthDimensionAnchorFrom = direction < 0
    ? frontBottomLeft
    : frontBottomRight;
  const depthDimensionAnchorTo = direction < 0
    ? backBottomLeft
    : backBottomRight;
  const depthDimensionFrom = {
    x: depthDimensionAnchorFrom.x + depthDimensionShift,
    y: depthDimensionAnchorFrom.y + 14,
  };
  const depthDimensionTo = {
    x: depthDimensionAnchorTo.x + depthDimensionShift,
    y: depthDimensionAnchorTo.y + 14,
  };
  const viewDetail = viewChoices.find((choice) => choice.id === view)?.detail ?? "three-quarter view";
  const title = `${closureLabels[closure]} — ${viewDetail}`;
  const accessibleDimensions = `${formatInches(plan.finishedBaseWidth)} wide by ${formatInches(plan.finishedHeight)} high by ${formatInches(plan.finishedDepth)} deep`;

  const recessedEndRatio = clamp(
    options.recessEndGap / Math.max(standingTopWidth, 0.5),
    0,
    0.5,
  );
  const recessedDrop = Math.max(0, options.recessDepth) * scale;
  const recessFrontLeft = add(lerp(frontTopLeft, frontTopRight, recessedEndRatio), { x: 0, y: recessedDrop });
  const recessFrontRight = add(lerp(frontTopRight, frontTopLeft, recessedEndRatio), { x: 0, y: recessedDrop });
  const recessBackLeft = add(lerp(backTopLeft, backTopRight, recessedEndRatio), { x: 0, y: recessedDrop });
  const recessBackRight = add(lerp(backTopRight, backTopLeft, recessedEndRatio), { x: 0, y: recessedDrop });
  const recessZipFrom = lerp(recessFrontLeft, recessBackLeft, 0.48);
  const recessZipTo = lerp(recessFrontRight, recessBackRight, 0.48);

  const sideTop = direction < 0
    ? lerp(frontTopLeft, backTopLeft, 0.56)
    : lerp(frontTopRight, backTopRight, 0.56);
  const sideBottom = direction < 0
    ? lerp(frontBottomLeft, backBottomLeft, 0.56)
    : lerp(frontBottomRight, backBottomRight, 0.56);
  const sideSeamLength = Math.hypot(
    safeHeight,
    (bodyTopWidth - safeWidth) / 2,
  );
  const sideZipRatio = clamp(
    options.sideZipperLength / Math.max(sideSeamLength, 0.5),
    0,
    1,
  );
  const sideZipStartRatio = (1 - sideZipRatio) / 2;
  const sideZipStart = lerp(sideTop, sideBottom, sideZipStartRatio);
  const sideZipEnd = lerp(
    sideTop,
    sideBottom,
    sideZipStartRatio + sideZipRatio,
  );

  return (
    <section className={styles.outcomeSection} aria-labelledby={`outcome-title-${rawId}`}>
      <header className={styles.outcomeHeader}>
        <div>
          <p>Live 3D vector</p>
          <h2 id={`outcome-title-${rawId}`}>Finished outcome preview</h2>
          <span>Shaped from the same finished dimensions as your cut pattern.</span>
        </div>
        <div className={styles.outcomeViewButtons} role="group" aria-label="Choose a 3D preview view">
          {viewChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              aria-pressed={view === choice.id}
              onClick={() => setView(choice.id)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.outcomeStage}>
        <svg
          className={styles.outcomeSvg}
          viewBox="0 0 720 430"
          role="img"
          aria-label={`${title}. ${accessibleDimensions}.${closure === "side-zipper" && view === "front" ? " The side zipper is hidden in this view." : ""}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <title>{title}</title>
          <desc>A dimension-driven concept drawing showing the finished bag volume, visible faces, selected closure, and width, height, and depth measurements.</desc>
          <defs>
            <linearGradient id={frontGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9d8cff" />
              <stop offset="0.52" stopColor="#7466ce" />
              <stop offset="1" stopColor="#4d427f" />
            </linearGradient>
            <linearGradient id={sideGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#554a91" />
              <stop offset="1" stopColor="#2e294e" />
            </linearGradient>
            <linearGradient id={topGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#beb4ff" />
              <stop offset="1" stopColor="#7669c3" />
            </linearGradient>
            <pattern id={weaveId} width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 1 H 8 M 1 0 V 8" stroke="rgba(255,255,255,.16)" strokeWidth=".7" />
              <path d="M 0 5 H 8 M 5 0 V 8" stroke="rgba(16,25,45,.12)" strokeWidth=".7" />
            </pattern>
            <filter id={shadowId} x="-35%" y="-50%" width="170%" height="200%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
            <marker id={markerId} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M 1 5 L 9 1 L 9 9 Z" fill="#4fe3e6" />
            </marker>
          </defs>

          <g className={styles.outcomeGrid} aria-hidden="true">
            <path d="M 68 372 H 654" />
            <path d="M 118 395 L 213 346 M 228 395 L 323 346 M 338 395 L 433 346 M 448 395 L 543 346 M 558 395 L 653 346" />
          </g>
          <ellipse cx="360" cy="360" rx={Math.max(105, (baseWidth + Math.abs(depthVector.x)) * 0.54)} ry="24" fill="rgba(0,0,0,.34)" filter={`url(#${shadowId})`} />

          {closure === "open-tote" ? (
            <path
              d={`M ${backHandleLeft.x} ${backHandleLeft.y} C ${backHandleLeft.x} ${backHandleLeft.y - handleHeight * 4 / 3} ${backHandleRight.x} ${backHandleRight.y - handleHeight * 4 / 3} ${backHandleRight.x} ${backHandleRight.y}`}
              className={styles.outcomeHandleBack}
            />
          ) : null}

          {view !== "front" ? (
            <polygon points={points(visibleSide)} fill={`url(#${sideGradientId})`} className={styles.outcomeFace} />
          ) : null}
          {!topCollapsesToZipper ? (
            <polygon
              points={points(topFace)}
              fill={closure === "open-tote" || closure === "recessed-zipper" ? "#162536" : `url(#${topGradientId})`}
              className={styles.outcomeTopFace}
            />
          ) : null}

          {closure === "open-tote" ? (
            <polygon
              points={points([
                lerp(frontTopLeft, frontTopRight, 0.07),
                lerp(frontTopRight, frontTopLeft, 0.07),
                lerp(backTopRight, backTopLeft, 0.07),
                lerp(backTopLeft, backTopRight, 0.07),
              ])}
              fill="#071019"
              stroke="#f6ba4c"
              strokeWidth="1.5"
              opacity=".92"
            />
          ) : null}

          {closure === "zipper-gusset" ? (
            <g aria-hidden="true">
              <polygon points={points(topFace)} fill="rgba(79,227,230,.12)" stroke="#4fe3e6" strokeWidth="1.5" strokeDasharray="5 4" />
              <line x1={gussetSeamA.from.x} y1={gussetSeamA.from.y} x2={gussetSeamA.to.x} y2={gussetSeamA.to.y} stroke="rgba(79,227,230,.76)" strokeWidth="1.5" />
              <line x1={gussetSeamB.from.x} y1={gussetSeamB.from.y} x2={gussetSeamB.to.x} y2={gussetSeamB.to.y} stroke="rgba(79,227,230,.76)" strokeWidth="1.5" />
              <ZipperLine from={topZipFrom} to={topZipTo} accent="#4fe3e6" label={`${formatInches(options.zipperGap)} REVEAL`} />
            </g>
          ) : null}

          {closure === "recessed-zipper" ? (
            <g aria-hidden="true">
              <line x1={frontTopLeft.x} y1={frontTopLeft.y} x2={recessFrontLeft.x} y2={recessFrontLeft.y} className={styles.outcomeRecessDrop} />
              <line x1={frontTopRight.x} y1={frontTopRight.y} x2={recessFrontRight.x} y2={recessFrontRight.y} className={styles.outcomeRecessDrop} />
              <polygon points={points([recessFrontLeft, recessFrontRight, recessBackRight, recessBackLeft])} fill="#101a27" stroke="#4fe3e6" strokeWidth="1.4" />
              <ZipperLine from={recessZipFrom} to={recessZipTo} accent="#4fe3e6" label={`${formatInches(options.recessDepth)} RECESS`} />
            </g>
          ) : null}

          <polygon points={points(frontFace)} fill={`url(#${frontGradientId})`} className={styles.outcomeFace} />
          <polygon points={points(frontFace)} fill={`url(#${weaveId})`} className={styles.outcomeWeave} />

          {closure === "top-zipper" ? (
            <ZipperLine
              from={topZipFrom}
              to={topZipTo}
              label={`${formatInches(plan.finishedTopOpening)} TOP ZIP`}
            />
          ) : null}

          {closure === "recessed-zipper" ? (
            <path d={`M ${frontTopLeft.x} ${frontTopLeft.y} L ${frontTopRight.x} ${frontTopRight.y}`} className={styles.outcomeRecessLip} aria-hidden="true" />
          ) : null}

          {closure === "open-tote" ? (
            <g aria-hidden="true">
              <path
                d={`M ${frontHandleLeft.x} ${frontHandleLeft.y} C ${frontHandleLeft.x} ${frontHandleLeft.y - handleHeight * 4 / 3} ${frontHandleRight.x} ${frontHandleRight.y - handleHeight * 4 / 3} ${frontHandleRight.x} ${frontHandleRight.y}`}
                className={styles.outcomeHandle}
              />
              {[frontHandleLeft, frontHandleRight].map((attachment, index) => (
                <g key={index}>
                  <rect x={attachment.x - 7} y={attachment.y + 4} width="14" height="30" rx="3" fill="rgba(41,33,77,.55)" stroke="#d4ceff" strokeWidth="1" />
                  <path d={`M ${attachment.x - 5} ${attachment.y + 15} L ${attachment.x + 5} ${attachment.y + 24} M ${attachment.x + 5} ${attachment.y + 15} L ${attachment.x - 5} ${attachment.y + 24}`} stroke="#f6ba4c" strokeWidth="1.2" />
                </g>
              ))}
            </g>
          ) : null}

          {closure === "side-zipper" && view !== "front" ? (
            <ZipperLine from={sideZipStart} to={sideZipEnd} accent="#ff7194" label={`${formatInches(options.sideZipperLength)} SIDE ZIP`} />
          ) : null}

          <DimensionLine
            from={{ x: frontBottomLeft.x, y: widthDimensionY }}
            to={{ x: frontBottomRight.x, y: widthDimensionY }}
            label={`${formatInches(plan.finishedBaseWidth)} W`}
            markerId={markerId}
          />
          <DimensionLine
            from={{ x: heightDimensionX, y: bottomY - height }}
            to={{ x: heightDimensionX, y: frontBottomLeft.y }}
            label={`${formatInches(plan.finishedHeight)} H`}
            markerId={markerId}
            textOffset={{ x: -15, y: 4 }}
          />
          <DimensionLine
            from={depthDimensionFrom}
            to={depthDimensionTo}
            label={`${formatInches(plan.finishedDepth)} D`}
            markerId={markerId}
            textOffset={{ x: direction < 0 ? -7 : 7, y: -8 }}
          />
        </svg>

        <div className={styles.outcomeBadge} aria-hidden="true">
          <i /> live vector
        </div>
      </div>

      <div className={styles.outcomeReadout}>
        <div>
          <span>Finished shape</span>
          <strong>{formatInches(plan.finishedBaseWidth)} W × {formatInches(plan.finishedHeight)} H × {formatInches(plan.finishedDepth)} D</strong>
        </div>
        <div>
          <span>{topCollapsesToZipper ? "Closed ridge / open-rim estimate" : "Approx. rim / flat top seam"}</span>
          <strong>
            {topCollapsesToZipper
              ? `${formatInches(plan.finishedTopOpening)} / ${formatInches(standingTopWidth)}`
              : `${formatInches(standingTopWidth)} / ${formatInches(plan.finishedTopOpening)}`}
          </strong>
        </div>
        <div>
          <span>Side angles</span>
          <strong>{formatDecimal(plan.leftTopAngle, 1)}° / {formatDecimal(plan.rightTopAngle, 1)}°</strong>
        </div>
        <div className={styles.outcomeClosureReadout}>
          <span>Selected build</span>
          <strong>{closureLabels[closure]}</strong>
        </div>
      </div>
      <p className={styles.outcomeNote}><strong>{closureNotes[closure]}</strong> This is a proportional concept view based on stitch-line dimensions; fabric drape, foam, and turn-of-cloth can change the sewn silhouette.</p>
    </section>
  );
}

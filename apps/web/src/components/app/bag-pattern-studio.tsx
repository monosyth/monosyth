"use client";

import Link from "next/link";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import styles from "@/app/app/bag-studio/bag-studio.module.css";
import { BagOutcomePreview } from "@/components/app/bag-outcome-preview";
import { BagPanelComposer } from "@/components/app/bag-panel-composer";
import { useAuth } from "@/components/auth/auth-provider";
import {
  calculateBagPatternPlan,
  calculateBodyFabricLayout,
  calculateFatQuarterPieceLayout,
  calculatePanelStitchGeometry,
  clamp,
  draftFromFinishedSize,
  formatDecimal,
  formatInches,
  formatYards,
  snapMeasurement,
  type BagClosure,
  type BagPatternDraft,
  type BagPatternPlan,
} from "@/lib/sewing/bag-pattern";
import {
  calculateOuterPanelComposition,
  defaultOuterPanelDesign,
  type OuterPanelComposition,
  type OuterPanelDesign,
} from "@/lib/sewing/panel-composition";
import {
  calculateToteHandlePlan,
  handlePlacementInstruction,
  type ToteHandleOptions,
  type ToteHandlePlan,
} from "@/lib/sewing/tote-handle";
import {
  BAG_STUDIO_SCHEMA_VERSION,
  MAX_SAVED_BAGS,
  createSavedBagId,
  readBagStudioState,
  writeBagStudioState,
  type BagStudioClosureOptions,
  type BagStudioFabricSettings,
  type BagStudioSizeBasis,
  type BagStudioSnapshot,
  type BagStudioSnapStep,
  type BagStudioStoredState,
  type BagStudioTab,
  type BagStudioToolMode,
  type SavedBagDesign,
} from "@/lib/sewing/bag-studio-storage";

type SizeBasis = BagStudioSizeBasis;
type ToolMode = BagStudioToolMode;
type SnapStep = BagStudioSnapStep;
type DragHandle =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "corner"
  | "shape-left"
  | "shape-right";

type ClosureOptions = BagStudioClosureOptions & ToteHandleOptions;

type CutPiece = {
  material: "outer" | "contrast" | "lining" | "interfacing" | "handle";
  name: string;
  quantity: number;
  width: number;
  height: number;
  note: string;
};

const closureChoices: ReadonlyArray<{
  id: BagClosure;
  label: string;
  short: string;
  description: string;
}> = [
  {
    id: "open-tote",
    label: "Open tote",
    short: "TOTE",
    description: "Lined rim + handles",
  },
  {
    id: "top-zipper",
    label: "Top zipper",
    short: "TOP ZIP",
    description: "Zipper in the top seam",
  },
  {
    id: "side-zipper",
    label: "Side zipper",
    short: "SIDE ZIP",
    description: "Opening in one side seam",
  },
  {
    id: "zipper-gusset",
    label: "Zipper gusset",
    short: "GUSSET",
    description: "Four-strip zipper panel",
  },
  {
    id: "recessed-zipper",
    label: "Recessed zipper",
    short: "RECESSED",
    description: "Free-ended inset panel",
  },
] as const;

const seamPresets = [0.25, 0.375, 0.5] as const;
const cornerPresets = [1, 1.5, 2, 2.5, 3] as const;

const defaultDraft = draftFromFinishedSize({
  baseWidth: 14,
  height: 12,
  depth: 4,
  seamAllowance: 0.25,
  fabricWidth: 44,
});

const defaultClosureOptions: ClosureOptions = {
  handleMaterial: "webbing",
  handleDrop: 11,
  handleWidth: 1.5,
  handleInset: 3.5,
  handleAttachmentDepth: 4,
  sideZipperLength: 8,
  sideZipperSide: "right",
  zipperGap: 0.25,
  recessDepth: 1.5,
  recessEndGap: 0.5,
};

const defaultFabricSettings: BagStudioFabricSettings = {
  source: "bolt",
  fatQuarterWidth: 21,
  fatQuarterLength: 18,
  allowFatQuarterRotation: false,
};

const defaultStudioSnapshot: BagStudioSnapshot = {
  closure: "open-tote",
  basis: "finished",
  draft: defaultDraft,
  closureOptions: defaultClosureOptions,
  outerDesign: defaultOuterPanelDesign,
  mirror: true,
  toolMode: "select",
  snapStep: 0.25,
  fabricSettings: defaultFabricSettings,
  previewYaw: 30,
};

function cleanInput(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function savedBagCopyName(name: string, savedBags: SavedBagDesign[]) {
  const base = `${name.trim() || "Untitled bag"} copy`;
  const existing = new Set(savedBags.map((saved) => saved.name.toLocaleLowerCase()));
  if (!existing.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  while (existing.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
  return `${base} ${suffix}`;
}

function formatSavedBagTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function standingTopRimWidth(plan: BagPatternPlan) {
  return Math.max(0, plan.finishedTopOpening - plan.finishedDepth);
}

function finishedSideSeamLength(plan: BagPatternPlan) {
  return Math.hypot(
    plan.finishedHeight,
    (standingTopRimWidth(plan) - plan.finishedBaseWidth) / 2,
  );
}

function recessedPanelFinishedLength(
  plan: BagPatternPlan,
  endGap: number,
) {
  return Math.max(0, standingTopRimWidth(plan) - endGap * 2);
}

function getCutPieces(
  plan: BagPatternPlan,
  closure: BagClosure,
  options: ClosureOptions,
  composition: OuterPanelComposition,
  handlePlan: ToteHandlePlan,
): CutPiece[] {
  const pieces: CutPiece[] = [
    ...composition.cutPieces,
    {
      material: "lining",
      name: "Main lining panel",
      quantity: 2,
      width: plan.boundingCutWidth,
      height: plan.cutHeight,
      note: "Use the same corner and shaping marks as the outer.",
    },
    {
      material: "interfacing",
      name: "Body support",
      quantity: 2,
      width: plan.boundingCutWidth,
      height: plan.cutHeight,
      note: "Optional; trim out of the seam allowance for bulky support.",
    },
  ];

  if (closure === "open-tote") {
    pieces.push({
      material: options.handleMaterial === "webbing" ? "handle" : "outer",
      name: options.handleMaterial === "webbing" ? "Webbing handle" : "Quarter-fold fabric handle",
      quantity: 2,
      width: handlePlan.cutWidth,
      height: handlePlan.cutLength,
      note: options.handleMaterial === "webbing"
        ? `Finished ${formatInches(options.handleWidth)} wide; includes 1/2 inch turned under at each end and 1/2 inch total matching allowance.`
        : `Quarter-fold to ${formatInches(options.handleWidth)} finished width; includes end turns and pressing allowance.`,
    });
  }

  if (closure === "top-zipper") {
    pieces.push({
      material: "outer",
      name: "Zipper tab square",
      quantity: 2,
      width: 2.5,
      height: 2.5,
      note: "Fold around the zipper ends, then trim to the tape width.",
    });
  }

  if (closure === "zipper-gusset") {
    const stripWidth =
      Math.max(0, plan.finishedDepth - options.zipperGap) / 2 +
      plan.seamAllowance * 2;
    const stripLength = standingTopRimWidth(plan) + 1;
    pieces.push(
      {
        material: "outer",
        name: "Zipper-gusset strip",
        quantity: 2,
        width: stripLength,
        height: stripWidth,
        note: "Make slightly long, assemble around the zipper, then trim to the standing rim span between side seams.",
      },
      {
        material: "lining",
        name: "Zipper-gusset lining",
        quantity: 2,
        width: stripLength,
        height: stripWidth,
        note: "Pairs with the outer strips around the zipper tape.",
      },
    );
  }

  if (closure === "recessed-zipper") {
    const finishedLength = recessedPanelFinishedLength(
      plan,
      options.recessEndGap,
    );
    const stripLength = finishedLength + plan.seamAllowance * 2;
    const stripWidth = options.recessDepth + plan.seamAllowance * 2;
    pieces.push(
      {
        material: "outer",
        name: "Recessed zipper strip",
        quantity: 2,
        width: stripLength,
        height: stripWidth,
        note: "Free ends finish short of the side seams by the chosen end gap.",
      },
      {
        material: "lining",
        name: "Recessed zipper lining",
        quantity: 2,
        width: stripLength,
        height: stripWidth,
        note: "Cut to match the two exterior zipper strips.",
      },
    );
  }

  return pieces;
}

function zipperNote(
  plan: BagPatternPlan,
  closure: BagClosure,
  options: ClosureOptions,
) {
  switch (closure) {
    case "open-tote": {
      const handlePlan = calculateToteHandlePlan(plan, options);
      return `Handles: cut 2 ${options.handleMaterial === "webbing" ? "webbing lengths" : "fabric strips"} at ${formatInches(handlePlan.cutLength)} × ${formatInches(handlePlan.cutWidth)}. Place centers ${formatInches(options.handleInset)} from each finished front corner, ${formatInches(handlePlan.centerSpacing)} apart; secure ${formatInches(options.handleAttachmentDepth)} below the rim for a ${formatInches(options.handleDrop)} inside drop.`;
    }
    case "top-zipper":
      return `Flat-top zipper: use ${formatInches(plan.finishedTopOpening + 2)} or longer and trim after the tabs are added.`;
    case "side-zipper":
      return `${options.sideZipperSide === "left" ? "Left" : "Right"} side-seam zipper opening: ${formatInches(options.sideZipperLength)}. Keep both stops clear of the boxed-corner zone.`;
    case "zipper-gusset":
      return `Zipper: ${formatInches(standingTopRimWidth(plan) + 2)} or longer. Finished reveal between folds: ${formatInches(options.zipperGap)}.`;
    case "recessed-zipper":
      return `Inset zipper panel: ${formatInches(recessedPanelFinishedLength(plan, options.recessEndGap))} finished length with ${formatInches(options.recessEndGap)} free at each end.`;
  }
}

function closureTeaching(closure: BagClosure) {
  switch (closure) {
    case "open-tote":
      return "The top take-up is one matching seam allowance for a lined rim. Center each handle on the marks and reinforce the full box-and-X area from behind; a double-fold hem needs its own larger top allowance.";
    case "top-zipper":
      return "The two flat top stitch lines meet at the zipper, collapsing the opening into a ridge. Zipper length means the teeth/stop span, not the loose tape beyond it.";
    case "side-zipper":
      return "A zipper replacing part of a side seam changes sewing order, not the shell dimensions. A welt pocket is a separate pattern system.";
    case "zipper-gusset":
      return "The two symmetric strips are sized from the finished gusset width, zipper reveal, zipper seam, and outer attachment seam.";
    case "recessed-zipper":
      return "This uses a floating free-ended panel. The end gap and strip depth stay editable because they control access and recess.";
  }
}

function buildPlanText(
  plan: BagPatternPlan,
  closure: BagClosure,
  options: ClosureOptions,
  pieces: CutPiece[],
  composition: OuterPanelComposition,
  handlePlan: ToteHandlePlan,
) {
  const closureLabel =
    closureChoices.find((choice) => choice.id === closure)?.label ?? closure;
  const lines = [
    "MONOSYTH BAG PATTERN STUDIO",
    closureLabel,
    "",
    `Finished base: ${formatInches(plan.finishedBaseWidth)} W × ${formatInches(plan.finishedHeight)} H × ${formatInches(plan.finishedDepth)} D`,
    `Flat/top width before shaping: ${formatInches(plan.finishedFlatWidth)}`,
    `Flat top seam after shaping: ${formatInches(plan.finishedTopOpening)}`,
    `Approximate standing rim width: ${formatInches(standingTopRimWidth(plan))}`,
    `Seam allowance: ${formatInches(plan.seamAllowance)}`,
    `Raw-edge corner square: ${formatInches(plan.cornerCut)} × ${formatInches(plan.cornerCut)}`,
    `Corner rule: ${formatInches(plan.cornerCut)} × 2 = ${formatInches(plan.finishedDepth)} finished depth`,
    "",
    "OUTER PANEL BUILD",
    `${composition.modeLabel}${composition.design.mode !== "solid" ? ` — ${composition.scopeLabel}` : ""}`,
    ...(composition.design.mode !== "solid"
      ? [
          `Piecing allowance: ${formatInches(composition.design.piecingAllowance)} (separate from the bag seam allowance)`,
          `Assembled slab: ${formatInches(composition.sewnWidth)} × ${formatInches(composition.sewnHeight)}; final outer blank: ${formatInches(composition.targetWidth)} × ${formatInches(composition.targetHeight)}`,
        ]
      : []),
    ...(composition.design.contrastEnabled
      ? [`Contrast bottom: ${formatInches(composition.design.contrastRise)} finished rise; cut band height ${formatInches(composition.contrastCutHeight)}; join allowance ${formatInches(composition.design.piecingAllowance)}`]
      : []),
    ...composition.instructions.map((instruction, index) => `${index + 1}. ${instruction}`),
    "",
    "CUT LIST",
    ...pieces.map(
      (piece) =>
        `${piece.quantity}× ${piece.name} (${piece.material}): ${formatInches(piece.width)} × ${formatInches(piece.height)} — ${piece.note}`,
    ),
    "",
    zipperNote(plan, closure, options),
    ...(closure === "open-tote"
      ? [
          handlePlacementInstruction(handlePlan),
          `Flat-panel center marks: ${formatInches(handlePlan.rawLeftCenter)} and ${formatInches(handlePlan.rawRightCenter)} from the panel's left raw edge; finished rim line ${formatInches(handlePlan.rawRimY)} below the raw top.`,
        ]
      : []),
    "",
    "REFERENCE",
    "Corner squares are measured from the raw side and bottom edges. This shortcut assumes the side, bottom, and corner seams use the same allowance.",
    "For thick foam, vinyl, or canvas, sew a scrap test because turn-of-cloth changes the usable inside size.",
    "Open the zipper at least halfway before closing the shell.",
  ];

  return lines.join("\n");
}

function downloadPatternSvg(
  plan: BagPatternPlan,
  composition: OuterPanelComposition,
  closure: BagClosure,
  handlePlan: ToteHandlePlan,
) {
  const pixelsPerInch = 96;
  const margin = 0.75;
  const footer = 1.75;
  const topLeft = plan.leftTopInset;
  const topRight = plan.cutWidth - plan.rightTopInset;
  const minX = Math.min(0, topLeft);
  const maxX = Math.max(plan.cutWidth, topRight);
  const pageWidth = maxX - minX + margin * 2;
  const pageHeight = plan.cutHeight + margin * 2 + footer;
  const shiftX = margin - minX;
  const shiftY = margin;
  const scale = pixelsPerInch;
  const x = (value: number) => (value + shiftX) * scale;
  const y = (value: number) => (value + shiftY) * scale;
  const c = plan.cornerCut;
  const w = plan.cutWidth;
  const h = plan.cutHeight;
  const stitchGeometry = calculatePanelStitchGeometry(plan);
  const outline = [
    `M ${x(topLeft)} ${y(0)}`,
    `L ${x(topRight)} ${y(0)}`,
    `L ${x(w)} ${y(h - c)}`,
    `L ${x(w - c)} ${y(h - c)}`,
    `L ${x(w - c)} ${y(h)}`,
    `L ${x(c)} ${y(h)}`,
    `L ${x(c)} ${y(h - c)}`,
    `L ${x(0)} ${y(h - c)}`,
    "Z",
  ].join(" ");
  const seam = plan.seamAllowance * scale;
  const stitchOutline = [
    `M ${x(stitchGeometry.topLeft.x)} ${y(stitchGeometry.topLeft.y)}`,
    `L ${x(stitchGeometry.topRight.x)} ${y(stitchGeometry.topRight.y)}`,
    `L ${x(stitchGeometry.rightSideBottom.x)} ${y(stitchGeometry.rightSideBottom.y)}`,
    `L ${x(stitchGeometry.rightBoxLineX)} ${y(stitchGeometry.boxLineY)}`,
    `L ${x(stitchGeometry.rightBoxLineX)} ${y(stitchGeometry.bottomRight.y)}`,
    `L ${x(stitchGeometry.leftBoxLineX)} ${y(stitchGeometry.bottomLeft.y)}`,
    `L ${x(stitchGeometry.leftBoxLineX)} ${y(stitchGeometry.boxLineY)}`,
    `L ${x(stitchGeometry.leftSideBottom.x)} ${y(stitchGeometry.leftSideBottom.y)}`,
    "Z",
  ].join(" ");
  const compositionBottom = composition.contrastJoinY ?? h;
  const compositionLines: string[] = [];
  const blankMinX = minX;
  const blankWidth = plan.boundingCutWidth;

  if (composition.design.mode === "vertical-strips") {
    for (const seamX of composition.columnSeams) {
      const lineX = blankMinX + seamX;
      compositionLines.push(
        `<line x1="${x(lineX)}" y1="${y(0)}" x2="${x(lineX)}" y2="${y(compositionBottom)}"/>`,
      );
    }
  }
  if (
    composition.design.mode === "horizontal-strips" ||
    composition.design.mode === "block-grid"
  ) {
    for (const lineY of composition.rowSeams) {
      compositionLines.push(
        `<line x1="${x(blankMinX)}" y1="${y(lineY)}" x2="${x(blankMinX + blankWidth)}" y2="${y(lineY)}"/>`,
      );
    }
  }
  if (composition.design.mode === "block-grid") {
    for (const seamX of composition.columnSeams) {
      const lineX = blankMinX + seamX;
      compositionLines.push(
        `<line x1="${x(lineX)}" y1="${y(0)}" x2="${x(lineX)}" y2="${y(compositionBottom)}"/>`,
      );
    }
  }

  const contrastMarkup = composition.contrastJoinY === null
    ? ""
    : `<rect x="${x(blankMinX)}" y="${y(composition.contrastJoinY)}" width="${blankWidth * scale}" height="${(h - composition.contrastJoinY) * scale}" fill="#d9edf0" clip-path="url(#cut-shape)"/>
  <line x1="${x(blankMinX)}" y1="${y(composition.contrastJoinY)}" x2="${x(blankMinX + blankWidth)}" y2="${y(composition.contrastJoinY)}" stroke="#b95c00" stroke-width="2" stroke-dasharray="10 6" clip-path="url(#cut-shape)"/>`;
  const compositionMarkup = compositionLines.length
    ? `<g fill="none" stroke="#7458a8" stroke-width="1.5" stroke-dasharray="5 4" clip-path="url(#cut-shape)">${compositionLines.join("\n")}</g>`
    : "";
  const handleMarkup = closure === "open-tote"
    ? [handlePlan.rawLeftCenter, handlePlan.rawRightCenter]
        .map(
          (center) => `<rect x="${x(center - handlePlan.handleWidth / 2)}" y="${y(handlePlan.rawRimY)}" width="${handlePlan.handleWidth * scale}" height="${handlePlan.handleAttachmentDepth * scale}" fill="none" stroke="#b95c00" stroke-width="2" stroke-dasharray="8 5" clip-path="url(#cut-shape)"/>
  <line x1="${x(center)}" y1="${y(0)}" x2="${x(center)}" y2="${y(handlePlan.rawAttachmentEndY)}" stroke="#b95c00" stroke-width="1.5" stroke-dasharray="4 4" clip-path="url(#cut-shape)"/>`,
        )
        .join("\n")
    : "";
  const calibrationY = (plan.cutHeight + margin + 0.35) * scale;
  const labelX = pageWidth * scale - margin * scale;
  const compositionScope = composition.design.mode === "solid"
    ? "FRONT + BACK"
    : composition.scopeLabel.toUpperCase();
  const fileName = `monosyth-bag-panel-${formatDecimal(plan.cutWidth)}x${formatDecimal(plan.cutHeight)}.svg`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}in" height="${pageHeight}in" viewBox="0 0 ${pageWidth * scale} ${pageHeight * scale}">
  <rect width="100%" height="100%" fill="white"/>
  <defs><clipPath id="cut-shape"><path d="${outline}"/></clipPath></defs>
  <path d="${outline}" fill="#fffdf8" stroke="#151c32" stroke-width="2"/>
  <path d="${outline}" fill="none" stroke="#f6b94b" stroke-opacity=".24" stroke-width="${seam * 2}" clip-path="url(#cut-shape)"/>
  ${contrastMarkup}
  ${compositionMarkup}
  <path d="${stitchOutline}" fill="none" stroke="#147d91" stroke-width="2" stroke-dasharray="8 6" stroke-linejoin="round"/>
  ${handleMarkup}
  <line x1="${x(w / 2)}" y1="${y(0.8)}" x2="${x(w / 2)}" y2="${y(h - 1)}" stroke="#65708b" stroke-width="1.5" stroke-dasharray="14 8"/>
  <text x="${x(w / 2)}" y="${y(h / 2)}" text-anchor="middle" font-family="monospace" font-size="18" fill="#151c32">MAIN PANEL · ${composition.modeLabel.toUpperCase()} · ${compositionScope}</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 28}" text-anchor="middle" font-family="monospace" font-size="14" fill="#65708b">CUT LINE SOLID · STITCH LINE DASHED · GRAINLINE CENTER</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 54}" text-anchor="middle" font-family="monospace" font-size="14" fill="#65708b">CORNER ${formatInches(c)} · SEAM ${formatInches(plan.seamAllowance)}</text>
  ${closure === "open-tote" ? `<text x="${x(w / 2)}" y="${y(h / 2) + 80}" text-anchor="middle" font-family="monospace" font-size="14" fill="#b95c00">HANDLE MARKS REPEAT ON BOTH OUTER FACES</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 102}" text-anchor="middle" font-family="monospace" font-size="14" fill="#b95c00">CENTERS ${formatInches(handlePlan.handleInset)} FROM FINISHED FRONT CORNERS · ${formatInches(handlePlan.handleWidth)} WIDE</text>` : ""}
  <rect x="${margin * scale}" y="${calibrationY}" width="${scale}" height="${scale}" fill="none" stroke="#151c32" stroke-width="2"/>
  <text x="${margin * scale}" y="${calibrationY - 10}" font-family="monospace" font-size="13" fill="#151c32">1-INCH CALIBRATION SQUARE</text>
  <text x="${labelX}" y="${calibrationY + 36}" text-anchor="end" font-family="monospace" font-size="13" fill="#151c32">PRINT AT ACTUAL SIZE / 100%</text>
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function MeasurementField({
  label,
  hint,
  value,
  step = 0.125,
  min = 0,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.measureField}>
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <span className={styles.measureInput}>
        <input
          type="number"
          inputMode="decimal"
          value={formatDecimal(value, 3)}
          min={min}
          step={step}
          onChange={(event) => onChange(cleanInput(event.target.valueAsNumber))}
        />
        <b>in</b>
      </span>
    </label>
  );
}

function Handle({
  x,
  y,
  label,
  kind = "round",
  axis,
  onPointerDown,
  onKeyDown,
}: {
  x: number;
  y: number;
  label: string;
  kind?: "round" | "diamond" | "corner";
  axis?: "horizontal" | "vertical";
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
  onKeyDown: (event: KeyboardEvent<SVGGElement>) => void;
}) {
  return (
    <g
      className={`${styles.vectorHandle} ${kind === "round" ? "" : styles[`vectorHandle_${kind}`]} ${axis ? styles[`handle_${axis}`] : ""}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      {kind === "diamond" ? (
        <path d="M0 -10L10 0 0 10-10 0Z" />
      ) : kind === "corner" ? (
        <path d="M-10 -10H10V10H-10Z" />
      ) : (
        <circle r="10" />
      )}
      <circle className={styles.handleCore} r="3" />
    </g>
  );
}

function PatternCanvas({
  draft,
  plan,
  composition,
  closure,
  handlePlan,
  mirror,
  snapStep,
  toolMode,
  onDraftChange,
  onUseCutBasis,
}: {
  draft: BagPatternDraft;
  plan: BagPatternPlan;
  composition: OuterPanelComposition;
  closure: BagClosure;
  handlePlan: ToteHandlePlan;
  mirror: boolean;
  snapStep: SnapStep;
  toolMode: ToolMode;
  onDraftChange: (draft: BagPatternDraft) => void;
  onUseCutBasis: () => void;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    handle: DragHandle;
    pointerId: number;
    startX: number;
    startY: number;
    draft: BagPatternDraft;
    offset: { x: number; y: number };
    scale: number;
    screenToViewX: number;
    screenToViewY: number;
  } | null>(null);

  const scale = Math.min(
    19,
    570 / Math.max(plan.boundingCutWidth + 4, 20),
    350 / Math.max(plan.cutHeight + 4, 16),
  );
  const centerX = 380 + offset.x * scale;
  const centerY = 262 + offset.y * scale;
  const left = centerX - (plan.cutWidth * scale) / 2;
  const right = centerX + (plan.cutWidth * scale) / 2;
  const top = centerY - (plan.cutHeight * scale) / 2;
  const bottom = centerY + (plan.cutHeight * scale) / 2;
  const cut = plan.cornerCut * scale;
  const topLeft = left + plan.leftTopInset * scale;
  const topRight = right - plan.rightTopInset * scale;
  const seam = Math.max(3, plan.seamAllowance * scale);
  const stitchGeometry = calculatePanelStitchGeometry(plan);
  const stitchX = (value: number) => left + value * scale;
  const stitchY = (value: number) => top + value * scale;
  const outline = [
    `M ${topLeft} ${top}`,
    `L ${topRight} ${top}`,
    `L ${right} ${bottom - cut}`,
    `L ${right - cut} ${bottom - cut}`,
    `L ${right - cut} ${bottom}`,
    `L ${left + cut} ${bottom}`,
    `L ${left + cut} ${bottom - cut}`,
    `L ${left} ${bottom - cut}`,
    "Z",
  ].join(" ");
  const stitchOutline = [
    `M ${stitchX(stitchGeometry.topLeft.x)} ${stitchY(stitchGeometry.topLeft.y)}`,
    `L ${stitchX(stitchGeometry.topRight.x)} ${stitchY(stitchGeometry.topRight.y)}`,
    `L ${stitchX(stitchGeometry.rightSideBottom.x)} ${stitchY(stitchGeometry.rightSideBottom.y)}`,
    `L ${stitchX(stitchGeometry.rightBoxLineX)} ${stitchY(stitchGeometry.boxLineY)}`,
    `L ${stitchX(stitchGeometry.rightBoxLineX)} ${stitchY(stitchGeometry.bottomRight.y)}`,
    `L ${stitchX(stitchGeometry.leftBoxLineX)} ${stitchY(stitchGeometry.bottomLeft.y)}`,
    `L ${stitchX(stitchGeometry.leftBoxLineX)} ${stitchY(stitchGeometry.boxLineY)}`,
    `L ${stitchX(stitchGeometry.leftSideBottom.x)} ${stitchY(stitchGeometry.leftSideBottom.y)}`,
    "Z",
  ].join(" ");
  const blankMinX = Math.min(0, plan.leftTopInset);
  const blankWidth = plan.boundingCutWidth;
  const compositionBottom = composition.contrastJoinY ?? plan.cutHeight;
  const compositionTopY = stitchY(0);
  const compositionBottomY = stitchY(compositionBottom);
  const blankLeft = stitchX(blankMinX);
  const blankRight = stitchX(blankMinX + blankWidth);

  function beginDrag(
    handle: DragHandle,
    event: PointerEvent<SVGGElement>,
  ) {
    event.preventDefault();
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    svg?.setPointerCapture(event.pointerId);
    dragRef.current = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      draft,
      offset,
      scale,
      screenToViewX: bounds?.width ? 760 / bounds.width : 1,
      screenToViewY: bounds?.height ? 520 / bounds.height : 1,
    };
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx =
      ((event.clientX - active.startX) * active.screenToViewX) /
      active.scale;
    const dy =
      ((event.clientY - active.startY) * active.screenToViewY) /
      active.scale;
    const start = active.draft;
    const applySnap = (value: number) =>
      snapStep === 0 ? value : snapMeasurement(value, snapStep);
    const mirrorFactor = mirror ? 2 : 1;
    const minWidth = start.cornerCut * 2 + start.seamAllowance * 2 + 2;
    const minHeight =
      start.cornerCut + start.seamAllowance + start.topTakeUp + 2;
    let next = start;

    if (active.handle === "left") {
      const delta = applySnap(dx);
      const cutWidth = clamp(
        applySnap(start.cutWidth - delta * mirrorFactor),
        minWidth,
        60,
      );
      const actualHandleDelta =
        (start.cutWidth - cutWidth) / mirrorFactor;
      next = {
        ...start,
        cutWidth,
      };
      setOffset({
        ...active.offset,
        x: mirror
          ? active.offset.x
          : active.offset.x + actualHandleDelta / 2,
      });
    }

    if (active.handle === "right") {
      const delta = applySnap(dx);
      const cutWidth = clamp(
        applySnap(start.cutWidth + delta * mirrorFactor),
        minWidth,
        60,
      );
      const actualHandleDelta =
        (cutWidth - start.cutWidth) / mirrorFactor;
      next = {
        ...start,
        cutWidth,
      };
      setOffset({
        ...active.offset,
        x: mirror
          ? active.offset.x
          : active.offset.x + actualHandleDelta / 2,
      });
    }

    if (active.handle === "top") {
      const delta = applySnap(dy);
      const cutHeight = clamp(
        applySnap(start.cutHeight - delta * mirrorFactor),
        minHeight,
        50,
      );
      const actualHandleDelta =
        (start.cutHeight - cutHeight) / mirrorFactor;
      next = {
        ...start,
        cutHeight,
      };
      setOffset({
        ...active.offset,
        y: mirror
          ? active.offset.y
          : active.offset.y + actualHandleDelta / 2,
      });
    }

    if (active.handle === "bottom") {
      const delta = applySnap(dy);
      const cutHeight = clamp(
        applySnap(start.cutHeight + delta * mirrorFactor),
        minHeight,
        50,
      );
      const actualHandleDelta =
        (cutHeight - start.cutHeight) / mirrorFactor;
      next = {
        ...start,
        cutHeight,
      };
      setOffset({
        ...active.offset,
        y: mirror
          ? active.offset.y
          : active.offset.y + actualHandleDelta / 2,
      });
    }

    if (active.handle === "corner") {
      const delta = applySnap((-dx - dy) / 2);
      const maxCorner = Math.min(
        start.cutWidth / 2 - start.seamAllowance - 1,
        start.cutHeight / 2 - 0.5,
      );
      next = {
        ...start,
        cornerCut: clamp(
          applySnap(start.cornerCut + delta),
          0.5,
          maxCorner,
        ),
      };
    }

    if (active.handle === "shape-left") {
      const value = clamp(
        applySnap(start.leftTopInset + dx),
        -3,
        start.cutWidth / 3,
      );
      next = {
        ...start,
        leftTopInset: value,
        rightTopInset: mirror ? value : start.rightTopInset,
      };
    }

    if (active.handle === "shape-right") {
      const value = clamp(
        applySnap(start.rightTopInset - dx),
        -3,
        start.cutWidth / 3,
      );
      next = {
        ...start,
        rightTopInset: value,
        leftTopInset: mirror ? value : start.leftTopInset,
      };
    }

    onUseCutBasis();
    onDraftChange(next);
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function nudge(handle: DragHandle, event: KeyboardEvent<SVGGElement>) {
    const step = snapStep || 0.125;
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
    if (!horizontal && !vertical) return;
    event.preventDefault();
    const xDirection = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const yDirection = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const factor = mirror ? 2 : 1;
    let next = draft;

    if (handle === "left" && horizontal) {
      next = { ...draft, cutWidth: Math.max(3, draft.cutWidth - xDirection * step * factor) };
    }
    if (handle === "right" && horizontal) {
      next = { ...draft, cutWidth: Math.max(3, draft.cutWidth + xDirection * step * factor) };
    }
    if (handle === "top" && vertical) {
      next = { ...draft, cutHeight: Math.max(3, draft.cutHeight - yDirection * step * factor) };
    }
    if (handle === "bottom" && vertical) {
      next = { ...draft, cutHeight: Math.max(3, draft.cutHeight + yDirection * step * factor) };
    }
    if (handle === "corner" && (horizontal || vertical)) {
      const direction = xDirection || yDirection;
      next = {
        ...draft,
        cornerCut: clamp(draft.cornerCut + direction * step, 0.5, draft.cutHeight / 2 - 0.5),
      };
    }
    if (handle === "shape-left" && horizontal) {
      const value = clamp(draft.leftTopInset + xDirection * step, -3, draft.cutWidth / 3);
      next = { ...draft, leftTopInset: value, rightTopInset: mirror ? value : draft.rightTopInset };
    }
    if (handle === "shape-right" && horizontal) {
      const value = clamp(draft.rightTopInset - xDirection * step, -3, draft.cutWidth / 3);
      next = { ...draft, rightTopInset: value, leftTopInset: mirror ? value : draft.leftTopInset };
    }

    onUseCutBasis();
    onDraftChange(next);
  }

  return (
    <div className={styles.canvasFrame}>
      <svg
        className={styles.patternCanvas}
        viewBox="0 0 760 520"
        role="img"
        aria-label={`Editable bag panel, ${formatInches(plan.cutWidth)} by ${formatInches(plan.cutHeight)}, with ${formatInches(plan.seamAllowance)} seam allowance, ${formatInches(plan.cornerCut)} boxed corner cutouts, and a ${composition.modeLabel.toLowerCase()} outer build${composition.design.contrastEnabled ? " with a contrast bottom" : ""}${closure === "open-tote" ? " plus measured handle marks" : ""}`}
        onPointerMove={pointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <pattern id="quarter-grid" width={scale / 4} height={scale / 4} patternUnits="userSpaceOnUse">
            <path d={`M ${scale / 4} 0 H 0 V ${scale / 4}`} className={styles.gridFine} />
          </pattern>
          <pattern id="inch-grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <rect width={scale} height={scale} fill="url(#quarter-grid)" />
            <path d={`M ${scale} 0 H 0 V ${scale}`} className={styles.gridInch} />
          </pattern>
          <clipPath id="panel-clip">
            <path d={outline} />
          </clipPath>
        </defs>

        <rect className={styles.canvasPaper} x="12" y="12" width="736" height="496" rx="18" />
        <rect x="12" y="12" width="736" height="496" rx="18" fill="url(#inch-grid)" />
        <line className={styles.centerGuide} x1={centerX} y1="38" x2={centerX} y2="486" />
        <line className={styles.centerGuide} x1="34" y1={centerY} x2="726" y2={centerY} />

        <path className={styles.panelShadow} d={outline} transform="translate(5 7)" />
        <path className={styles.panelFill} d={outline} />
        <g className={styles.compositionOverlay} clipPath="url(#panel-clip)" aria-hidden="true">
          {composition.contrastJoinY !== null ? (
            <rect
              className={styles.compositionContrast}
              x={blankLeft}
              y={compositionBottomY}
              width={blankRight - blankLeft}
              height={bottom - compositionBottomY}
            />
          ) : null}
          {composition.design.mode === "vertical-strips" || composition.design.mode === "block-grid"
            ? composition.columnSeams.map((seamX, index) => {
                const lineX = blankLeft + seamX * scale;
                return <line key={`column-${index}`} x1={lineX} y1={compositionTopY} x2={lineX} y2={compositionBottomY} />;
              })
            : null}
          {composition.design.mode === "horizontal-strips" || composition.design.mode === "block-grid"
            ? composition.rowSeams.map((seamY, index) => {
                const lineY = stitchY(seamY);
                return <line key={`row-${index}`} x1={blankLeft} y1={lineY} x2={blankRight} y2={lineY} />;
              })
            : null}
          {composition.contrastJoinY !== null ? (
            <line className={styles.compositionJoin} x1={blankLeft} y1={compositionBottomY} x2={blankRight} y2={compositionBottomY} />
          ) : null}
        </g>
        <path
          className={styles.allowanceBand}
          d={outline}
          clipPath="url(#panel-clip)"
          style={{ strokeWidth: seam * 2.1 }}
        />
        <path className={styles.cutLine} d={outline} />

        <path className={styles.stitchLines} d={stitchOutline} />

        {closure === "open-tote" ? (
          <g className={styles.handlePlacementMarks} clipPath="url(#panel-clip)" aria-hidden="true">
            {[handlePlan.rawLeftCenter, handlePlan.rawRightCenter].map((center, index) => (
              <g key={index}>
                <rect
                  x={stitchX(center - handlePlan.handleWidth / 2)}
                  y={stitchY(handlePlan.rawRimY)}
                  width={handlePlan.handleWidth * scale}
                  height={handlePlan.handleAttachmentDepth * scale}
                  rx="3"
                />
                <line
                  x1={stitchX(center)}
                  y1={top}
                  x2={stitchX(center)}
                  y2={stitchY(handlePlan.rawAttachmentEndY)}
                />
                <path
                  d={`M ${stitchX(center - handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.48)} L ${stitchX(center + handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.78)} M ${stitchX(center + handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.48)} L ${stitchX(center - handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.78)}`}
                />
              </g>
            ))}
            <text x={centerX} y={stitchY(handlePlan.rawAttachmentEndY) + 17}>
              HANDLE CENTERS · {formatInches(handlePlan.handleInset)} FROM FINISHED FRONT CORNERS · {formatInches(handlePlan.centerSpacing)} APART
            </text>
          </g>
        ) : null}

        <g className={styles.grainLine}>
          <line x1={centerX} y1={top + 58} x2={centerX} y2={bottom - 72} />
          <path d={`M ${centerX} ${top + 46} l -6 12 h 12 Z`} />
          <path d={`M ${centerX} ${bottom - 60} l -6 -12 h 12 Z`} />
          <text x={centerX + 12} y={centerY} transform={`rotate(-90 ${centerX + 12} ${centerY})`}>GRAIN / CENTER</text>
        </g>

        <g className={styles.dimensionLine}>
          <line x1={left} y1={top - 25} x2={right} y2={top - 25} />
          <path d={`M ${left} ${top - 25} l 8 -5 v 10 Z`} />
          <path d={`M ${right} ${top - 25} l -8 -5 v 10 Z`} />
          <text x={centerX} y={top - 34}>{formatInches(plan.cutWidth)} CUT WIDTH</text>

          <line x1={right + 30} y1={top} x2={right + 30} y2={bottom} />
          <path d={`M ${right + 30} ${top} l -5 8 h 10 Z`} />
          <path d={`M ${right + 30} ${bottom} l -5 -8 h 10 Z`} />
          <text x={right + 48} y={centerY} transform={`rotate(90 ${right + 48} ${centerY})`}>{formatInches(plan.cutHeight)} CUT HEIGHT</text>
        </g>

        <g className={styles.cornerMeasure}>
          <path d={`M ${right - cut} ${bottom - cut - 18} v 12 h ${cut} v -12`} />
          <text x={right - cut / 2} y={bottom - cut - 25}>{formatInches(plan.cornerCut)} RAW-EDGE SQUARE</text>
          <path d={`M ${right - cut + 9} ${bottom - cut} v 9 h -9`} />
          <text x={right - cut - 14} y={bottom - cut + 26}>90°</text>
        </g>

        <g className={styles.seamCallout}>
          <line x1={topLeft + 28} y1={top + seam} x2={topLeft + 68} y2={top + 42} />
          <rect x={topLeft + 58} y={top + 29} width="108" height="28" rx="6" />
          <text x={topLeft + 112} y={top + 48}>{formatInches(plan.seamAllowance)} ALLOWANCE</text>
        </g>

        <g className={styles.angleMarks}>
          <path d={`M ${topLeft + 28} ${top} Q ${topLeft + 9} ${top + 9} ${topLeft + 6} ${top + 30}`} />
          <text x={topLeft + 17} y={top + 49}>{Math.round(plan.leftTopAngle)}°</text>
          <path d={`M ${topRight - 28} ${top} Q ${topRight - 9} ${top + 9} ${topRight - 6} ${top + 30}`} />
          <text x={topRight - 17} y={top + 49}>{Math.round(plan.rightTopAngle)}°</text>
        </g>

        <g className={styles.panelLabel}>
          <text x={centerX} y={centerY - 14}>MAIN BODY PANEL</text>
          <text x={centerX} y={centerY + 14}>{composition.modeLabel.toUpperCase()} · {composition.design.mode === "solid" ? "BOTH FACES" : composition.scopeLabel.toUpperCase()}</text>
          <text x={centerX} y={centerY + 39}>SOLID = CUT · DASHED = STITCH</text>
        </g>

        {toolMode === "select" ? (
          <>
            <Handle x={left} y={centerY} label="Resize left edge" axis="horizontal" onPointerDown={(event) => beginDrag("left", event)} onKeyDown={(event) => nudge("left", event)} />
            <Handle x={right} y={centerY} label="Resize right edge" axis="horizontal" onPointerDown={(event) => beginDrag("right", event)} onKeyDown={(event) => nudge("right", event)} />
            <Handle x={centerX} y={top} label="Resize top edge" axis="vertical" onPointerDown={(event) => beginDrag("top", event)} onKeyDown={(event) => nudge("top", event)} />
            <Handle x={centerX} y={bottom} label="Resize bottom edge" axis="vertical" onPointerDown={(event) => beginDrag("bottom", event)} onKeyDown={(event) => nudge("bottom", event)} />
          </>
        ) : (
          <>
            <Handle x={topLeft} y={top} label="Shape top-left angle" kind="diamond" onPointerDown={(event) => beginDrag("shape-left", event)} onKeyDown={(event) => nudge("shape-left", event)} />
            <Handle x={topRight} y={top} label="Shape top-right angle" kind="diamond" onPointerDown={(event) => beginDrag("shape-right", event)} onKeyDown={(event) => nudge("shape-right", event)} />
            <Handle x={right - cut} y={bottom - cut} label="Resize both boxed corner squares" kind="corner" onPointerDown={(event) => beginDrag("corner", event)} onKeyDown={(event) => nudge("corner", event)} />
          </>
        )}
      </svg>

      <div className={styles.canvasLegend}>
        <span><i className={styles.legendCut} /> cut line</span>
        <span><i className={styles.legendStitch} /> stitch line</span>
        <span><i className={styles.legendAllowance} /> seam allowance</span>
        <span><i className={styles.legendGrain} /> grain / center</span>
        {composition.design.mode !== "solid" ? <span><i className={styles.legendPiecing} /> piecing seams</span> : null}
        {composition.design.contrastEnabled ? <span><i className={styles.legendContrast} /> contrast join</span> : null}
        {closure === "open-tote" ? <span><i className={styles.legendHandle} /> handle placement</span> : null}
      </div>
    </div>
  );
}

function FabricLayoutPanel({
  plan,
  composition,
  settings,
  onSettingsChange,
}: {
  plan: BagPatternPlan;
  composition: OuterPanelComposition;
  settings: BagStudioFabricSettings;
  onSettingsChange: (settings: BagStudioFabricSettings) => void;
}) {
  const {
    source,
    fatQuarterWidth,
    fatQuarterLength,
    allowFatQuarterRotation,
  } = settings;
  const layout = calculateBodyFabricLayout(plan);
  const customOuter =
    composition.design.mode !== "solid" ||
    composition.design.contrastEnabled;
  const fatQuarterPieceSpecs: Array<{
    material: "outer" | "contrast" | "lining";
    name: string;
    quantity: number;
    width: number;
    height: number;
  }> = [
    ...composition.cutPieces.map((piece) => ({
      material: piece.material,
      name: piece.name,
      quantity: piece.quantity,
      width: piece.width,
      height: piece.height,
    })),
    {
      material: "lining",
      name: "Lining body panel",
      quantity: 2,
      width: plan.boundingCutWidth,
      height: plan.cutHeight,
    },
  ];
  const fatQuarterRows = fatQuarterPieceSpecs.map((piece) => {
    const fit = calculateFatQuarterPieceLayout({
      usableWidth: fatQuarterWidth,
      usableLength: fatQuarterLength,
      pieceWidth: piece.width,
      pieceHeight: piece.height,
      quantity: piece.quantity,
      allowRotation: allowFatQuarterRotation,
    });
    const fitWithRotation = calculateFatQuarterPieceLayout({
      usableWidth: fatQuarterWidth,
      usableLength: fatQuarterLength,
      pieceWidth: piece.width,
      pieceHeight: piece.height,
      quantity: piece.quantity,
      allowRotation: true,
    });
    return {
      ...piece,
      fit,
      fitsOnlyRotated:
        !fit.fits &&
        !allowFatQuarterRotation &&
        fitWithRotation.fits &&
        fitWithRotation.rotated,
    };
  });
  const roleLabels = {
    outer: customOuter ? "Outer fabric groups" : "Outer fabric",
    contrast: "Contrast fabric",
    lining: "Lining fabric",
  } as const;
  const fatQuarterRoles = (["outer", "contrast", "lining"] as const)
    .map((material) => {
      const rows = fatQuarterRows.filter((row) => row.material === material);
      const fits = rows.every((row) => row.fit.fits);
      return {
        material,
        label: roleLabels[material],
        rows,
        fits,
        count: fits
          ? rows.reduce((total, row) => total + row.fit.fatQuartersNeeded, 0)
          : 0,
      };
    })
    .filter((role) => role.rows.length > 0);
  const allFatQuarterPiecesFit = fatQuarterRows.every((row) => row.fit.fits);
  const fatQuarterTotal = fatQuarterRoles.reduce(
    (total, role) => total + role.count,
    0,
  );
  const fatQuarterRoleSummary = fatQuarterRoles
    .map((role) => `${role.count} ${role.material === "outer" ? "outer" : role.material}`)
    .join(" + ");
  const tightFatQuarterRows = fatQuarterRows.filter(
    (row) =>
      row.fit.fits &&
      row.fit.quantity >= row.fit.piecesPerFatQuarter &&
      Math.min(row.fit.clearanceWidth, row.fit.clearanceLength) < 0.25,
  );
  const rotatedFatQuarterRows = fatQuarterRows.filter(
    (row) => row.fit.rotated,
  );
  const pieceStyle = {
    "--piece-ratio": `${Math.max(0.5, Math.min(2.2, plan.boundingCutWidth / plan.cutHeight))}`,
    "--piece-width": `${Math.min(96, Math.max(24, (plan.boundingCutWidth / Math.max(layout.usableWidth, 1)) * 100))}%`,
  } as CSSProperties;

  return (
    <section className={styles.fabricSection} aria-labelledby="fabric-layout-title">
      <header className={styles.sectionHeader}>
        <div>
          <p>02 / Fabric map</p>
          <h2 id="fabric-layout-title">
            {source === "bolt" ? "Start at the bolt" : "Start with fat quarters"}
          </h2>
        </div>
        <div className={styles.yardageReadout}>
          <span>
            {source === "bolt"
              ? customOuter ? "Lining panels" : "Body fabric"
              : "Separate fabric totals"}
          </span>
          <strong>
            {source === "bolt"
              ? layout.fits ? formatYards(layout.buyYards) : "too narrow"
              : allFatQuarterPiecesFit
                ? `${fatQuarterTotal} FQ${fatQuarterTotal === 1 ? "" : "s"} total`
                : "check fit"}
          </strong>
          {source === "fat-quarters" ? (
            <small>{allFatQuarterPiecesFit ? fatQuarterRoleSummary : "Follow the fit cards below"}</small>
          ) : null}
        </div>
      </header>

      <div className={styles.fabricSourceControls}>
        <div className={styles.fabricSourceToggle} role="group" aria-label="Fabric purchasing format">
          <button
            type="button"
            aria-pressed={source === "bolt"}
            onClick={() => onSettingsChange({ ...settings, source: "bolt" })}
          >
            <strong>Bolt yardage</strong>
            <small>continuous width of fabric</small>
          </button>
          <button
            type="button"
            aria-pressed={source === "fat-quarters"}
            onClick={() =>
              onSettingsChange({ ...settings, source: "fat-quarters" })
            }
          >
            <strong>Fat quarters</strong>
            <small>finite precut rectangles</small>
          </button>
        </div>

        {source === "fat-quarters" ? (
          <div className={styles.fatQuarterSettings}>
            <MeasurementField
              label="Usable width"
              hint="across the fat quarter"
              value={fatQuarterWidth}
              min={1}
              onChange={(value) =>
                onSettingsChange({
                  ...settings,
                  fatQuarterWidth: Math.max(1, value),
                })
              }
            />
            <MeasurementField
              label="Usable length"
              hint="along the lengthwise grain"
              value={fatQuarterLength}
              min={1}
              onChange={(value) =>
                onSettingsChange({
                  ...settings,
                  fatQuarterLength: Math.max(1, value),
                })
              }
            />
            <div className={styles.fatQuarterOrientation} role="group" aria-label="Fat-quarter piece orientation">
              <button
                type="button"
                aria-pressed={!allowFatQuarterRotation}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    allowFatQuarterRotation: false,
                  })
                }
              >
                Keep grain upright
              </button>
              <button
                type="button"
                aria-pressed={allowFatQuarterRotation}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    allowFatQuarterRotation: true,
                  })
                }
              >
                Rotation allowed
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {source === "bolt" ? (
        layout.fits ? (
          <div className={styles.fabricGrid}>
            {customOuter ? (
              <article className={styles.fabricRoll}>
                <div className={styles.fabricRollHead}>
                  <strong>Outer build recipe</strong>
                  <span>Cut by fabric group · quantities include selected faces</span>
                </div>
                <div className={styles.fabricRecipeRows}>
                  {composition.cutPieces.map((piece) => (
                    <div key={`${piece.material}-${piece.name}`}>
                      <span className={styles[`material_${piece.material}`]}>{piece.quantity}×</span>
                      <strong>{piece.name}</strong>
                      <b>{formatInches(piece.width)} × {formatInches(piece.height)}</b>
                    </div>
                  ))}
                </div>
                <footer>
                  <span>Assemble before shaping</span>
                  <strong>Trim to {formatInches(composition.targetWidth)} × {formatInches(composition.targetHeight)}</strong>
                </footer>
              </article>
            ) : (
              <article className={styles.fabricRoll}>
                <div className={styles.fabricRollHead}>
                  <strong>Outer fabric</strong>
                  <span>{formatInches(plan.fabricWidth)} bolt · {formatInches(layout.usableWidth)} usable</span>
                </div>
                <div className={`${styles.fabricBed} ${layout.piecesAcross === 2 ? styles.fabricAcross : styles.fabricStacked}`}>
                  <span className={styles.selvageLeft}>selvage</span>
                  <span className={styles.selvageRight}>selvage</span>
                  {[1, 2].map((piece) => (
                    <div className={styles.fabricPiece} style={pieceStyle} key={piece}>
                      <span>Panel {piece}</span>
                      <small>{formatInches(plan.boundingCutWidth)} × {formatInches(plan.cutHeight)}</small>
                      <i>grain ↑</i>
                    </div>
                  ))}
                  <span className={styles.offcutNote}>Closure pieces can usually nest in the offcuts; handles may require more length.</span>
                </div>
                <footer>
                  <span>{layout.piecesAcross === 2 ? "2 panels across" : "1 panel across · 2 rows"}</span>
                  <strong>{formatInches(layout.lengthInches)} minimum length</strong>
                </footer>
              </article>
            )}

            <article className={styles.fabricRoll}>
              <div className={styles.fabricRollHead}>
                <strong>Lining fabric</strong>
                <span>{formatInches(plan.fabricWidth)} bolt · {formatInches(layout.usableWidth)} usable</span>
              </div>
              <div className={`${styles.fabricBed} ${layout.piecesAcross === 2 ? styles.fabricAcross : styles.fabricStacked}`}>
                <span className={styles.selvageLeft}>selvage</span>
                <span className={styles.selvageRight}>selvage</span>
                {[1, 2].map((piece) => (
                  <div className={styles.fabricPiece} style={pieceStyle} key={piece}>
                    <span>Panel {piece}</span>
                    <small>{formatInches(plan.boundingCutWidth)} × {formatInches(plan.cutHeight)}</small>
                    <i>grain ↑</i>
                  </div>
                ))}
                <span className={styles.offcutNote}>Keep both lining panels on the same grain direction.</span>
              </div>
              <footer>
                <span>{layout.piecesAcross === 2 ? "2 panels across" : "1 panel across · 2 rows"}</span>
                <strong>{formatInches(layout.lengthInches)} minimum length</strong>
              </footer>
            </article>
          </div>
        ) : (
          <div className={styles.fabricWarning}>
            <strong>This panel is wider than the usable fabric.</strong>
            <p>Choose wider fabric, piece the panel, or rotate only if the print, nap, and grain allow it.</p>
          </div>
        )
      ) : (
        <>
          <div className={styles.fatQuarterIntro}>
            <span>Standard: 18″ × 22″ nominal · starts at about 18″ × 21″ usable</span>
            <strong>{formatInches(fatQuarterWidth)} wide × {formatInches(fatQuarterLength)} long usable</strong>
            <small>Measure after removing selvage, squaring, or prewashing. Grain is assumed to run along the usable length.</small>
          </div>
          <div className={styles.fatQuarterGrid}>
            {fatQuarterRoles.map((role) => (
              <article className={styles.fatQuarterCard} key={role.material}>
                <div className={styles.fabricRollHead}>
                  <strong>{role.label}</strong>
                  <span>{role.fits ? `${role.count} FQ${role.count === 1 ? "" : "s"}` : "check fit"}</span>
                </div>
                <div className={styles.fatQuarterRows}>
                  {role.rows.map((row) => (
                    <div key={`${row.material}-${row.name}`}>
                      <span className={styles[`material_${row.material}`]}>{row.quantity}×</span>
                      <div>
                        <strong>{row.name}</strong>
                        <small>{formatInches(row.width)} × {formatInches(row.height)} each</small>
                      </div>
                      <b>
                        {row.fit.fits
                          ? `${row.fit.piecesPerFatQuarter}/FQ · ${row.fit.fatQuartersNeeded} needed`
                          : "no single FQ fits"}
                      </b>
                      <em>
                        {row.fit.rotated
                          ? "turned 90°"
                          : row.fitsOnlyRotated
                            ? "fits only if rotation is allowed"
                            : row.fit.fits
                              ? `${row.fit.piecesAcross} across × ${row.fit.rows} row${row.fit.rows === 1 ? "" : "s"}`
                              : "use yardage or piece this section"}
                      </em>
                    </div>
                  ))}
                </div>
                <footer>
                  <span>{formatInches(fatQuarterWidth)} × {formatInches(fatQuarterLength)} usable</span>
                  <strong>{role.rows.length > 1 ? "Separate counts · offcuts not shared" : "Uniform-piece fit"}</strong>
                </footer>
              </article>
            ))}
          </div>

          {!allFatQuarterPiecesFit ? (
            <div className={styles.fabricWarning}>
              <strong>Some pieces do not fit one fat quarter.</strong>
              {fatQuarterRows.filter((row) => !row.fit.fits).map((row) => (
                <p key={`${row.material}-${row.name}`}>
                  {row.name}: {row.fitsOnlyRotated
                    ? "it fits only when turned 90°. Allow rotation only when sideways grain or motif placement is intentional."
                    : `the ${formatInches(row.width)} × ${formatInches(row.height)} cut needs yardage, a larger precut, or piecing.`}
                </p>
              ))}
            </div>
          ) : null}

          {rotatedFatQuarterRows.length || tightFatQuarterRows.length ? (
            <div className={styles.fabricAdvisory}>
              {rotatedFatQuarterRows.length ? <p><strong>Rotated pieces:</strong> check grain, nap, and directional motifs before cutting.</p> : null}
              {tightFatQuarterRows.length ? <p><strong>Tight fit:</strong> less than ¼″ remains in one direction, so measure the actual fat quarter before relying on the count.</p> : null}
            </div>
          ) : null}
        </>
      )}

      <p className={styles.fabricFinePrint}>
        {source === "bolt"
          ? customOuter
            ? "The yardage readout covers the two full lining panels. Outer piecing can use scraps, precuts, or several fabrics, so use the exact cut groups above rather than one misleading bolt total. "
            : "Conservative body-panel estimate, rounded up to the next ⅛ yard. "
          : `${customOuter ? "Bolt lining option" : "Bolt option for outer and lining separately"}: ${layout.fits ? formatYards(layout.buyYards) : "the current bolt is too narrow"}${customOuter ? "" : " each"}. Fat-quarter counts cover body pieces only; long handles and closure parts may require yardage or webbing. ${customOuter ? "Multiple outer cut groups are estimated separately without recombining their offcuts. " : ""}`}
        Directional prints, repeats, straps, matching, and shrinkage can require more.
      </p>
    </section>
  );
}

export function BagPatternStudio() {
  const { status, user } = useAuth();
  const [closure, setClosure] = useState<BagClosure>("open-tote");
  const [basis, setBasis] = useState<SizeBasis>("finished");
  const [draft, setDraft] = useState<BagPatternDraft>(defaultDraft);
  const [closureOptions, setClosureOptions] = useState<ClosureOptions>(defaultClosureOptions);
  const [outerDesign, setOuterDesign] = useState<OuterPanelDesign>(defaultOuterPanelDesign);
  const [mirror, setMirror] = useState(true);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [snapStep, setSnapStep] = useState<SnapStep>(0.25);
  const [fabricSettings, setFabricSettings] = useState<BagStudioFabricSettings>(
    defaultFabricSettings,
  );
  const [previewYaw, setPreviewYaw] = useState(
    defaultStudioSnapshot.previewYaw,
  );
  const [activeTab, setActiveTab] = useState<BagStudioTab>("studio");
  const [bagName, setBagName] = useState("");
  const [activeSavedBagId, setActiveSavedBagId] = useState<string | null>(null);
  const [savedBags, setSavedBags] = useState<SavedBagDesign[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [hydratedOwnerId, setHydratedOwnerId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saved" | "error" | "limit"
  >("idle");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const workspaceTabRefs = useRef<
    Partial<Record<BagStudioTab, HTMLButtonElement | null>>
  >({});

  const currentSnapshot = useMemo<BagStudioSnapshot>(
    () => ({
      closure,
      basis,
      draft,
      closureOptions,
      outerDesign,
      mirror,
      toolMode,
      snapStep,
      fabricSettings,
      previewYaw,
    }),
    [
      basis,
      closure,
      closureOptions,
      draft,
      fabricSettings,
      mirror,
      outerDesign,
      previewYaw,
      snapStep,
      toolMode,
    ],
  );

  const storedState = useMemo<BagStudioStoredState>(
    () => ({
      schemaVersion: BAG_STUDIO_SCHEMA_VERSION,
      workingCopy: {
        name: bagName,
        activeSavedBagId,
        activeTab,
        snapshot: currentSnapshot,
      },
      savedBags,
    }),
    [activeSavedBagId, activeTab, bagName, currentSnapshot, savedBags],
  );

  const activeSavedBag = useMemo(
    () => savedBags.find((saved) => saved.id === activeSavedBagId) ?? null,
    [activeSavedBagId, savedBags],
  );
  const workingDraftHasChanges =
    bagName.trim().length > 0 ||
    JSON.stringify(currentSnapshot) !== JSON.stringify(defaultStudioSnapshot);
  const hasUnsavedChanges = activeSavedBag
    ? activeSavedBag.name !== bagName.trim() ||
      JSON.stringify(activeSavedBag.snapshot) !== JSON.stringify(currentSnapshot)
    : workingDraftHasChanges;
  const filteredSavedBags = useMemo(() => {
    const query = savedSearch.trim().toLocaleLowerCase();
    return [...savedBags]
      .filter((saved) => !query || saved.name.toLocaleLowerCase().includes(query))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [savedBags, savedSearch]);

  useEffect(() => {
    if (status !== "signed_in" || !user?.uid) return;
    const ownerId = user.uid;
    const persisted = readBagStudioState(defaultStudioSnapshot, ownerId);

    startTransition(() => {
      const snapshot = persisted.workingCopy.snapshot;
      setClosure(snapshot.closure);
      setBasis(snapshot.basis);
      setDraft(snapshot.draft);
      setClosureOptions(snapshot.closureOptions);
      setOuterDesign(snapshot.outerDesign);
      setMirror(snapshot.mirror);
      setToolMode(snapshot.toolMode);
      setSnapStep(snapshot.snapStep);
      setFabricSettings(snapshot.fabricSettings);
      setPreviewYaw(snapshot.previewYaw);
      setBagName(persisted.workingCopy.name);
      setActiveSavedBagId(persisted.workingCopy.activeSavedBagId);
      setActiveTab(persisted.workingCopy.activeTab);
      setSavedBags(persisted.savedBags);
      setStorageReady(true);
      setHydratedOwnerId(ownerId);
    });
  }, [status, user?.uid]);

  useEffect(() => {
    if (
      !storageReady ||
      !user?.uid ||
      hydratedOwnerId !== user.uid
    ) {
      return;
    }
    const ownerId = user.uid;
    const timeout = window.setTimeout(() => {
      setSaveState(writeBagStudioState(storedState, ownerId) ? "saved" : "error");
    }, 240);
    return () => window.clearTimeout(timeout);
  }, [hydratedOwnerId, storageReady, storedState, user?.uid]);

  useEffect(() => {
    if (
      !storageReady ||
      !user?.uid ||
      hydratedOwnerId !== user.uid
    ) {
      return;
    }
    const ownerId = user.uid;
    const persistWorkingCopy = () => {
      writeBagStudioState(storedState, ownerId);
    };
    window.addEventListener("pagehide", persistWorkingCopy);
    return () => window.removeEventListener("pagehide", persistWorkingCopy);
  }, [hydratedOwnerId, storageReady, storedState, user?.uid]);

  const plan = useMemo(() => calculateBagPatternPlan(draft), [draft]);
  const composition = useMemo(
    () => calculateOuterPanelComposition(plan, outerDesign),
    [plan, outerDesign],
  );
  const handlePlan = useMemo(
    () => calculateToteHandlePlan(plan, closureOptions),
    [plan, closureOptions],
  );
  const pieces = useMemo(
    () => getCutPieces(plan, closure, closureOptions, composition, handlePlan),
    [plan, closure, closureOptions, composition, handlePlan],
  );
  const closureWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (
      closure === "side-zipper" &&
      closureOptions.sideZipperLength >
        Math.max(0, finishedSideSeamLength(plan) - 1)
    ) {
      warnings.push(
        "Shorten the side zipper so its stops stay clear of the top join and boxed-corner zone.",
      );
    }
    if (
      closure === "zipper-gusset" &&
      closureOptions.zipperGap >= plan.finishedDepth
    ) {
      warnings.push(
        "The zipper reveal must be smaller than the finished bag depth.",
      );
    }
    if (
      closure === "recessed-zipper" &&
      recessedPanelFinishedLength(
        plan,
        closureOptions.recessEndGap,
      ) < 1
    ) {
      warnings.push(
        "Leave at least 1 inch of usable recessed zipper panel after both end gaps.",
      );
    }
    if (
      closure !== "top-zipper" &&
      standingTopRimWidth(plan) <= 0
    ) {
      warnings.push(
        "This top shaping leaves no usable standing rim for this closure.",
      );
    }
    if (
      closure === "recessed-zipper" &&
      closureOptions.recessDepth >= plan.finishedHeight
    ) {
      warnings.push(
        "The zipper recess must be shallower than the finished bag height.",
      );
    }
    if (closure === "open-tote") {
      warnings.push(...handlePlan.warnings);
    }
    return warnings;
  }, [closure, closureOptions, handlePlan.warnings, plan]);
  const ready =
    plan.valid &&
    composition.valid &&
    closureWarnings.length === 0;
  const handleBuildAdvisories = useMemo(() => {
    if (closure !== "open-tote") return [];
    const advisories = [...handlePlan.advisories];
    if (
      composition.design.contrastEnabled &&
      closureOptions.handleAttachmentDepth >=
        plan.finishedHeight - composition.design.contrastRise
    ) {
      advisories.push(
        "The handle attachment crosses the contrast-bottom join. Reinforce that seam or shorten the attachment depth.",
      );
    }
    if (
      composition.design.mode === "vertical-strips" ||
      composition.design.mode === "block-grid"
    ) {
      const blankMinX = Math.min(0, plan.leftTopInset);
      const centers = [handlePlan.rawLeftCenter, handlePlan.rawRightCenter];
      const seamUnderHandle = composition.columnSeams
        .map((seamX) => blankMinX + seamX)
        .some((seamX) =>
        centers.some(
          (center) =>
            Math.abs(seamX - center) <= handlePlan.handleWidth / 2 + 0.125,
        ),
      );
      if (seamUnderHandle) {
        advisories.push(
          "A vertical piecing seam sits under a handle leg. Add backing behind the box-and-X or shift the handle inset slightly.",
        );
      }
    }
    if (
      composition.design.mode === "horizontal-strips" ||
      composition.design.mode === "block-grid"
    ) {
      const seamThroughHandle = composition.rowSeams.some(
        (seamY) =>
          seamY >= handlePlan.rawRimY &&
          seamY <= handlePlan.rawAttachmentEndY,
      );
      if (seamThroughHandle) {
        advisories.push(
          "A horizontal piecing seam crosses the handle attachment box. Reinforce the full area before stitching the handle.",
        );
      }
    }
    return advisories;
  }, [closure, closureOptions.handleAttachmentDepth, composition, handlePlan, plan]);

  function applySnapshot(snapshot: BagStudioSnapshot) {
    setClosure(snapshot.closure);
    setBasis(snapshot.basis);
    setDraft(snapshot.draft);
    setClosureOptions(snapshot.closureOptions);
    setOuterDesign(snapshot.outerDesign);
    setMirror(snapshot.mirror);
    setToolMode(snapshot.toolMode);
    setSnapStep(snapshot.snapStep);
    setFabricSettings(snapshot.fabricSettings);
    setPreviewYaw(snapshot.previewYaw);
    setCopyState("idle");
  }

  function saveCurrentBag(asNew = false) {
    const cleanName = bagName.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!cleanName) {
      setSaveState("error");
      return;
    }
    const now = new Date().toISOString();
    const existing = asNew
      ? null
      : savedBags.find((saved) => saved.id === activeSavedBagId) ?? null;

    if (existing) {
      setSavedBags((current) =>
        current.map((saved) =>
          saved.id === existing.id
            ? {
                ...saved,
                name: cleanName,
                updatedAt: now,
                snapshot: currentSnapshot,
              }
            : saved,
        ),
      );
      setBagName(cleanName);
      setSaveState("saved");
      return;
    }

    if (savedBags.length >= MAX_SAVED_BAGS) {
      setSaveState("limit");
      return;
    }
    const id = createSavedBagId();
    const next: SavedBagDesign = {
      id,
      name: cleanName,
      createdAt: now,
      updatedAt: now,
      snapshot: currentSnapshot,
    };
    setSavedBags((current) => [next, ...current]);
    setActiveSavedBagId(id);
    setBagName(cleanName);
    setSaveState("saved");
  }

  function saveCurrentAsCopy() {
    if (savedBags.length >= MAX_SAVED_BAGS) {
      setSaveState("limit");
      return;
    }
    const copyName = savedBagCopyName(bagName, savedBags);
    const now = new Date().toISOString();
    const id = createSavedBagId();
    const copy: SavedBagDesign = {
      id,
      name: copyName,
      createdAt: now,
      updatedAt: now,
      snapshot: currentSnapshot,
    };
    setSavedBags((current) => [copy, ...current]);
    setActiveSavedBagId(id);
    setBagName(copyName);
    setSaveState("saved");
  }

  function showWorkspaceTab(tab: BagStudioTab, focus = false) {
    setActiveTab(tab);
    if (focus) workspaceTabRefs.current[tab]?.focus();
  }

  function confirmReplaceWorkingCopy(action: string) {
    if (!hasUnsavedChanges) return true;
    return window.confirm(
      `Your current changes are not in a named save. ${action} will replace them. Continue?`,
    );
  }

  function loadSavedBag(saved: SavedBagDesign) {
    applySnapshot(saved.snapshot);
    setBagName(saved.name);
    setActiveSavedBagId(saved.id);
    showWorkspaceTab("studio", true);
    setSaveState("saved");
  }

  function openSavedBag(saved: SavedBagDesign) {
    if (!confirmReplaceWorkingCopy(`Opening “${saved.name}”`)) return;
    loadSavedBag(saved);
  }

  function duplicateSavedBag(saved: SavedBagDesign) {
    if (savedBags.length >= MAX_SAVED_BAGS) {
      setSaveState("limit");
      return;
    }
    if (!confirmReplaceWorkingCopy(`Duplicating “${saved.name}”`)) return;
    const now = new Date().toISOString();
    const copy: SavedBagDesign = {
      ...saved,
      id: createSavedBagId(),
      name: savedBagCopyName(saved.name, savedBags),
      createdAt: now,
      updatedAt: now,
    };
    setSavedBags((current) => [copy, ...current]);
    loadSavedBag(copy);
  }

  function removeSavedBag(saved: SavedBagDesign) {
    if (!window.confirm(`Remove “${saved.name}” from this browser?`)) return;
    setSavedBags((current) => current.filter((candidate) => candidate.id !== saved.id));
    if (activeSavedBagId === saved.id) {
      setActiveSavedBagId(null);
      setSaveState("idle");
    }
  }

  function updateDraft(next: BagPatternDraft) {
    setDraft(next);
    setCopyState("idle");
  }

  function updateFinished(
    key: "baseWidth" | "height" | "depth",
    value: number,
  ) {
    const nextValue = Math.max(0, cleanInput(value));
    const current = plan;

    if (key === "baseWidth") {
      updateDraft({
        ...draft,
        cutWidth:
          nextValue + current.finishedDepth + draft.seamAllowance * 2,
      });
    }
    if (key === "height") {
      updateDraft({
        ...draft,
        cutHeight:
          nextValue +
          draft.cornerCut +
          draft.seamAllowance +
          draft.topTakeUp,
      });
    }
    if (key === "depth") {
      const cornerCut = nextValue / 2;
      updateDraft({
        ...draft,
        cornerCut,
        cutWidth:
          current.finishedBaseWidth +
          nextValue +
          draft.seamAllowance * 2,
        cutHeight:
          current.finishedHeight +
          cornerCut +
          draft.seamAllowance +
          draft.topTakeUp,
      });
    }
  }

  function updateSeamAllowance(value: number) {
    const seamAllowance = clamp(cleanInput(value), 0.125, 1);
    updateDraft({
      ...draft,
      seamAllowance,
      topTakeUp: seamAllowance,
      cutWidth:
        plan.finishedBaseWidth +
        plan.finishedDepth +
        seamAllowance * 2,
      cutHeight:
        plan.finishedHeight +
        draft.cornerCut +
        seamAllowance * 2,
    });
  }

  function chooseCorner(value: number) {
    if (basis === "finished") {
      updateFinished("depth", value * 2);
    } else {
      updateDraft({ ...draft, cornerCut: value });
    }
  }

  function updateInset(side: "left" | "right", value: number) {
    const nextValue = clamp(cleanInput(value), -3, draft.cutWidth / 3);
    updateDraft({
      ...draft,
      leftTopInset:
        side === "left" || mirror ? nextValue : draft.leftTopInset,
      rightTopInset:
        side === "right" || mirror ? nextValue : draft.rightTopInset,
    });
  }

  function resetDraft() {
    if (!confirmReplaceWorkingCopy("Resetting the measurements")) return;
    applySnapshot(defaultStudioSnapshot);
    setSaveState("idle");
  }

  function startNewBag() {
    if (!confirmReplaceWorkingCopy("Starting a new bag")) return;
    applySnapshot(defaultStudioSnapshot);
    setBagName("");
    setActiveSavedBagId(null);
    showWorkspaceTab("studio", true);
    setSaveState("idle");
  }

  function navigateWorkspaceTabs(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: BagStudioTab,
  ) {
    const order: BagStudioTab[] = ["studio", "saved"];
    const currentIndex = order.indexOf(currentTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % order.length;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + order.length) % order.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = order.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    showWorkspaceTab(order[nextIndex], true);
  }

  function printPlan() {
    showWorkspaceTab("studio");
    window.requestAnimationFrame(() => window.print());
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(
        buildPlanText(
          plan,
          closure,
          closureOptions,
          pieces,
          composition,
          handlePlan,
        ),
      );
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  if (status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} aria-hidden="true" />
          Laying out the cutting table…
        </div>
      </main>
    );
  }

  if (status !== "signed_in") {
    return (
      <main className={styles.page}>
        <section className={styles.gateCard}>
          <span className={styles.gateMark} aria-hidden="true">MS / BAG</span>
          <p className={styles.eyebrow}>Private sewing studio</p>
          <h1>Sign in to open the pattern table.</h1>
          <p>The bag studio lives with your private Monosyth tools.</p>
          <Link href="/app" className={styles.primaryAction}>Go to studio sign-in →</Link>
        </section>
      </main>
    );
  }

  if (!storageReady || hydratedOwnerId !== user?.uid) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} aria-hidden="true" />
          Opening your last bag settings…
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <div className={styles.brandBlock}>
            <Link href="/app" aria-label="Back to Monosyth Studio" className={styles.brandMark}>MS</Link>
            <div>
              <p>Monosyth sewing studio</p>
              <h1>Modular Bag Studio <span>beta</span></h1>
            </div>
          </div>
          <div className={styles.topStatus}>
            <span><i /> live geometry</span>
            <b>inches</b>
          </div>
          <div className={styles.topActions}>
            <button type="button" onClick={startNewBag}>New bag</button>
            <button type="button" onClick={resetDraft}>Reset</button>
            <button type="button" onClick={printPlan}>Print plan</button>
            <button type="button" className={styles.downloadButton} disabled={!ready} onClick={() => downloadPatternSvg(plan, composition, closure, handlePlan)}>Body-panel SVG</button>
          </div>
        </header>

        <nav className={styles.workspaceNav} aria-label="Modular Bag Studio sections">
          <div role="tablist" aria-label="Workspace">
            <button
              ref={(node) => {
                workspaceTabRefs.current.studio = node;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === "studio"}
              aria-controls="bag-studio-workspace"
              id="bag-studio-tab"
              tabIndex={activeTab === "studio" ? 0 : -1}
              onClick={() => showWorkspaceTab("studio")}
              onKeyDown={(event) => navigateWorkspaceTabs(event, "studio")}
            >
              <strong>Design studio</strong>
              <small>pattern, 3D outcome + fabric</small>
            </button>
            <button
              ref={(node) => {
                workspaceTabRefs.current.saved = node;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === "saved"}
              aria-controls="saved-bags-workspace"
              id="saved-bags-tab"
              tabIndex={activeTab === "saved" ? 0 : -1}
              onClick={() => showWorkspaceTab("saved")}
              onKeyDown={(event) => navigateWorkspaceTabs(event, "saved")}
            >
              <strong>Saved bags</strong>
              <small>{savedBags.length} named design{savedBags.length === 1 ? "" : "s"}</small>
            </button>
          </div>
          <p>One core bag system · swap the size, shape, panels, handles, bottom, and closure.</p>
        </nav>

        <section className={styles.projectBar} aria-label="Current bag design">
          <label>
            <span>Current bag name</span>
            <input
              type="text"
              value={bagName}
              maxLength={80}
              placeholder="e.g. Patchwork market tote"
              onChange={(event) => {
                setBagName(event.target.value);
                setSaveState("idle");
              }}
            />
          </label>
          <div className={styles.projectSaveStatus} aria-live="polite">
            <span>{activeSavedBag ? "Named design" : "Working draft"}</span>
            <strong>
              {saveState === "limit"
                ? `The ${MAX_SAVED_BAGS}-bag local limit is full`
                : saveState === "error"
                ? bagName.trim()
                  ? "Could not save locally"
                  : "Add a name before saving"
                : activeSavedBag
                  ? hasUnsavedChanges
                    ? "Changes waiting to be updated"
                    : `Saved ${formatSavedBagTime(activeSavedBag.updatedAt)}`
                  : storageReady
                    ? "Last settings saved automatically"
                    : "Opening your last settings…"}
            </strong>
            <small>Private to this browser and your signed-in Monosyth profile.</small>
          </div>
          <div className={styles.projectActions}>
            <button
              type="button"
              className={styles.projectPrimaryAction}
              onClick={() => saveCurrentBag(false)}
            >
              {activeSavedBag ? "Update bag" : "Save named bag"}
            </button>
            {activeSavedBag ? (
              <button type="button" onClick={saveCurrentAsCopy}>Save as copy</button>
            ) : null}
          </div>
        </section>

        <div
          id="bag-studio-workspace"
          role="tabpanel"
          aria-labelledby="bag-studio-tab"
          hidden={activeTab !== "studio"}
        >
        <section className={styles.closureRail} aria-labelledby="closure-title">
          <div className={styles.railTitle}>
            <span>01</span>
            <div>
              <p id="closure-title">Choose the opening</p>
              <small>Body math stays visible while the closure kit changes.</small>
            </div>
          </div>
          <div className={styles.closureChoices}>
            {closureChoices.map((choice) => (
              <button
                type="button"
                key={choice.id}
                aria-pressed={closure === choice.id}
                className={closure === choice.id ? styles.closureActive : ""}
                onClick={() => setClosure(choice.id)}
              >
                <i aria-hidden="true"><span /></i>
                <strong>{choice.label}</strong>
                <small>{choice.description}</small>
                <b>{choice.short}</b>
              </button>
            ))}
          </div>
        </section>

        <div className={styles.workbench}>
          <aside className={styles.controlPanel}>
            <div className={styles.panelTitle}>
              <div>
                <p>Draft controls</p>
                <h2>Size + seam</h2>
              </div>
              <span className={styles.stepBadge}>¼″ grid</span>
            </div>

            <div className={styles.basisToggle} aria-label="Sizing direction">
              <button type="button" aria-pressed={basis === "finished"} onClick={() => setBasis("finished")}>
                <strong>Finished bag</strong>
                <small>size → pattern</small>
              </button>
              <button type="button" aria-pressed={basis === "cut"} onClick={() => setBasis("cut")}>
                <strong>Cut panel</strong>
                <small>pattern → size</small>
              </button>
            </div>

            <div className={styles.fieldStack}>
              {basis === "finished" ? (
                <>
                  <MeasurementField label="Bottom / base width" hint="finished front edge at the floor" value={plan.finishedBaseWidth} min={1} onChange={(value) => updateFinished("baseWidth", value)} />
                  <MeasurementField label="Standing height" hint="finished rim to bottom plane" value={plan.finishedHeight} min={1} onChange={(value) => updateFinished("height", value)} />
                  <MeasurementField label="Bag depth" hint="front-to-back boxed seam" value={plan.finishedDepth} min={1} onChange={(value) => updateFinished("depth", value)} />
                </>
              ) : (
                <>
                  <MeasurementField label="Panel cut width" hint="raw edge to raw edge" value={draft.cutWidth} min={3} onChange={(value) => updateDraft({ ...draft, cutWidth: Math.max(0, value) })} />
                  <MeasurementField label="Panel cut height" hint="raw top to raw bottom" value={draft.cutHeight} min={3} onChange={(value) => updateDraft({ ...draft, cutHeight: Math.max(0, value) })} />
                  <MeasurementField label="Corner square" hint="measure from both raw edges" value={draft.cornerCut} min={0.5} onChange={(value) => updateDraft({ ...draft, cornerCut: Math.max(0, value) })} />
                </>
              )}
            </div>

            <section className={styles.seamSection}>
              <div className={styles.subhead}>
                <div>
                  <span>Seam allowance</span>
                  <strong>{formatInches(draft.seamAllowance)}</strong>
                </div>
                <div className={styles.presetRow}>
                  {seamPresets.map((preset) => (
                    <button type="button" key={preset} aria-pressed={Math.abs(draft.seamAllowance - preset) < 0.001} onClick={() => updateSeamAllowance(preset)}>{formatInches(preset)}</button>
                  ))}
                </div>
              </div>
              <p>The cut line sits this far outside the stitch line. Side, bottom, and corner allowances stay locked together so the corner shortcut remains accurate.</p>
            </section>

            <section className={styles.cornerLab}>
              <div className={styles.subhead}>
                <div>
                  <span>Box-corner experiment</span>
                  <strong>{formatInches(draft.cornerCut)} square</strong>
                </div>
                <span className={styles.depthPill}>{formatInches(plan.finishedDepth)} deep</span>
              </div>
              <input
                className={styles.range}
                type="range"
                min="0.5"
                max={Math.max(0.5, Math.min(5, draft.cutHeight / 2 - 0.5))}
                step={snapStep === 0 ? 0.01 : snapStep}
                value={draft.cornerCut}
                aria-label="Corner square size"
                onChange={(event) => chooseCorner(event.target.valueAsNumber)}
              />
              <div className={styles.cornerPresets}>
                {cornerPresets.map((preset) => (
                  <button type="button" key={preset} aria-pressed={Math.abs(draft.cornerCut - preset) < 0.001} onClick={() => chooseCorner(preset)}>{formatInches(preset)}</button>
                ))}
              </div>
              <div className={styles.cornerEquation}>
                <span>{formatInches(draft.cornerCut)}</span>
                <i>× 2</i>
                <span>{formatInches(plan.finishedDepth)}</span>
                <small>raw square</small>
                <small />
                <small>finished depth</small>
              </div>
              <p>{basis === "finished" ? "Finished mode keeps your base width and height while the panel grows or shrinks." : "Cut-panel mode keeps the fabric fixed so you can see exactly what a larger corner steals."}</p>
            </section>

            <section className={styles.shapeSection}>
              <div className={styles.subhead}>
                <div>
                  <span>Side shaping</span>
                  <strong>Angle the top</strong>
                </div>
                <button type="button" className={styles.mirrorButton} aria-pressed={mirror} onClick={() => setMirror((current) => !current)}>
                  <i aria-hidden="true">↔</i> Mirror {mirror ? "on" : "off"}
                </button>
              </div>
              <div className={styles.insetFields}>
                <MeasurementField label="Left inset" hint={`${Math.round(plan.leftTopAngle)}° top angle`} value={draft.leftTopInset} min={-3} onChange={(value) => updateInset("left", value)} />
                <MeasurementField label="Right inset" hint={`${Math.round(plan.rightTopAngle)}° top angle`} value={draft.rightTopInset} min={-3} onChange={(value) => updateInset("right", value)} />
              </div>
              <p>Positive values narrow the top; negative values flare it. Mirror keeps both stitch-line angles identical.</p>
            </section>

            <section className={styles.closureOptions}>
              <div className={styles.subhead}>
                <div>
                  <span>{closureChoices.find((choice) => choice.id === closure)?.label}</span>
                  <strong>Closure details</strong>
                </div>
              </div>
              {closure === "open-tote" ? (
                <div className={styles.handleControls}>
                  <div className={styles.handleMaterialToggle} role="group" aria-label="Handle material">
                    <button type="button" aria-pressed={closureOptions.handleMaterial === "webbing"} onClick={() => setClosureOptions((current) => ({ ...current, handleMaterial: "webbing" }))}>Webbing</button>
                    <button type="button" aria-pressed={closureOptions.handleMaterial === "fabric"} onClick={() => setClosureOptions((current) => ({ ...current, handleMaterial: "fabric" }))}>Folded fabric</button>
                  </div>
                  <div className={styles.handleFieldGrid}>
                    <MeasurementField label="Handle width" hint="finished edge to edge" value={closureOptions.handleWidth} min={0.25} onChange={(value) => setClosureOptions((current) => ({ ...current, handleWidth: Math.max(0.25, value) }))} />
                    <MeasurementField label="Corner inset" hint="front corner to center" value={closureOptions.handleInset} min={0} onChange={(value) => setClosureOptions((current) => ({ ...current, handleInset: Math.max(0, value) }))} />
                    <MeasurementField label="Attachment depth" hint="rim to bottom of stitching" value={closureOptions.handleAttachmentDepth} min={0.5} onChange={(value) => setClosureOptions((current) => ({ ...current, handleAttachmentDepth: Math.max(0.5, value) }))} />
                    <MeasurementField label="Handle drop" hint="inside rim-to-apex clearance" value={closureOptions.handleDrop} min={1} onChange={(value) => setClosureOptions((current) => ({ ...current, handleDrop: Math.max(1, value) }))} />
                  </div>
                  <div className={styles.handleReadout}>
                    <span><small>Centers apart</small><strong>{formatInches(handlePlan.centerSpacing)}</strong></span>
                    <span><small>Cut each</small><strong>{formatInches(handlePlan.cutLength)} × {formatInches(handlePlan.cutWidth)}</strong></span>
                  </div>
                  <p className={styles.handlePlacementCopy}>Mark each handle center {formatInches(handlePlan.handleInset)} in from the finished front-corner fold, then secure it {formatInches(handlePlan.handleAttachmentDepth)} below the rim.</p>
                </div>
              ) : null}
              {closure === "side-zipper" ? (
                <div className={styles.sideZipperControls}>
                  <MeasurementField label="Opening length" hint="between zipper stops" value={closureOptions.sideZipperLength} min={3} onChange={(value) => setClosureOptions((current) => ({ ...current, sideZipperLength: Math.max(3, value) }))} />
                  <div className={styles.handleMaterialToggle} role="group" aria-label="Side zipper location">
                    <button type="button" aria-pressed={closureOptions.sideZipperSide === "left"} onClick={() => setClosureOptions((current) => ({ ...current, sideZipperSide: "left" }))}>Left side</button>
                    <button type="button" aria-pressed={closureOptions.sideZipperSide === "right"} onClick={() => setClosureOptions((current) => ({ ...current, sideZipperSide: "right" }))}>Right side</button>
                  </div>
                </div>
              ) : null}
              {closure === "zipper-gusset" ? (
                <MeasurementField label="Zipper reveal" hint="finished gap between folds" value={closureOptions.zipperGap} min={0} onChange={(value) => setClosureOptions((current) => ({ ...current, zipperGap: Math.max(0, value) }))} />
              ) : null}
              {closure === "recessed-zipper" ? (
                <>
                  <MeasurementField label="Recess depth" hint="strip depth below the rim" value={closureOptions.recessDepth} min={0.5} onChange={(value) => setClosureOptions((current) => ({ ...current, recessDepth: Math.max(0.5, value) }))} />
                  <MeasurementField label="End gap" hint="free space at each side seam" value={closureOptions.recessEndGap} min={0.25} onChange={(value) => setClosureOptions((current) => ({ ...current, recessEndGap: Math.max(0.25, value) }))} />
                </>
              ) : null}
              {closure === "top-zipper" ? <p className={styles.optionOnlyNote}>The zipper uses the full flat top seam; extra tape is added for handling and trimming.</p> : null}
              <p className={styles.closureTeaching}>{closureTeaching(closure)}</p>
            </section>

            <section className={styles.fabricInput}>
              <MeasurementField label="Fabric bolt width" hint="nominal width before selvages" value={draft.fabricWidth} min={20} step={1} onChange={(value) => updateDraft({ ...draft, fabricWidth: Math.max(20, value) })} />
            </section>
          </aside>

          <section className={styles.canvasColumn}>
            <div className={styles.canvasToolbar}>
              <div className={styles.toolButtons} aria-label="Vector tools">
                <button type="button" aria-pressed={toolMode === "select"} onClick={() => setToolMode("select")}><i aria-hidden="true">↖</i><span>Select</span><small>resize edges</small></button>
                <button type="button" aria-pressed={toolMode === "shape"} onClick={() => setToolMode("shape")}><i aria-hidden="true">⌁</i><span>Vector pen</span><small>angles + corners</small></button>
              </div>
              <div className={styles.snapControl}>
                <label htmlFor="snap-step">Snap</label>
                <select id="snap-step" value={snapStep} onChange={(event) => setSnapStep(Number(event.target.value) as SnapStep)}>
                  <option value={0.25}>¼ inch</option>
                  <option value={0.125}>⅛ inch</option>
                  <option value={0.5}>½ inch</option>
                  <option value={0}>Free</option>
                </select>
              </div>
              <div className={styles.toolbarHint}>
                <span>{mirror ? "Mirrored editing" : "Independent edges"}</span>
                <small>Drag the bright handles or focus one and use arrow keys.</small>
              </div>
            </div>

            <PatternCanvas
              draft={draft}
              plan={plan}
              composition={composition}
              closure={closure}
              handlePlan={handlePlan}
              mirror={mirror}
              snapStep={snapStep}
              toolMode={toolMode}
              onDraftChange={updateDraft}
              onUseCutBasis={() => setBasis("cut")}
            />

            <div className={styles.liveStrip}>
              <div>
                <span>Raw panel</span>
                <strong>{formatInches(plan.cutWidth)} × {formatInches(plan.cutHeight)}</strong>
              </div>
              <i>→</i>
              <div>
                <span>Flat width</span>
                <strong>{formatInches(plan.finishedFlatWidth)}</strong>
              </div>
              <i>→</i>
              <div className={styles.liveStripAccent}>
                <span>Finished footprint</span>
                <strong>{formatInches(plan.finishedBaseWidth)} × {formatInches(plan.finishedDepth)}</strong>
              </div>
            </div>

            <BagPanelComposer
              plan={plan}
              value={outerDesign}
              composition={composition}
              onChange={(value) => {
                setOuterDesign(value);
                setCopyState("idle");
              }}
            />

            <BagOutcomePreview
              plan={plan}
              closure={closure}
              options={closureOptions}
              composition={composition}
              yaw={previewYaw}
              onYawChange={setPreviewYaw}
            />

            <FabricLayoutPanel
              plan={plan}
              composition={composition}
              settings={fabricSettings}
              onSettingsChange={setFabricSettings}
            />
          </section>

          <aside className={styles.resultPanel}>
            <div className={styles.resultTitle}>
              <div>
                <p>Live outcome</p>
                <h2>What you will get</h2>
              </div>
              <span className={ready ? styles.validBadge : styles.invalidBadge}>{ready ? "READY" : "CHECK"}</span>
            </div>

            <section className={styles.finishedCard}>
              <p>Finished bag</p>
              <strong>{formatInches(plan.finishedBaseWidth)} W × {formatInches(plan.finishedHeight)} H × {formatInches(plan.finishedDepth)} D</strong>
              <div>
                <span><small>Bottom footprint</small><b>{formatInches(plan.finishedBaseWidth)} × {formatInches(plan.finishedDepth)}</b></span>
                <span><small>Flat top seam</small><b>{formatInches(plan.finishedTopOpening)}</b></span>
                <span><small>Approx. volume</small><b>{Math.round(plan.volumeCubicInches / 61)} L</b></span>
              </div>
            </section>

            <section className={styles.mathCard}>
              <header>
                <span>Why the ¼ inch does not add to the square</span>
                <b>BOX MATH</b>
              </header>
              <div className={styles.mathDiagram} aria-hidden="true">
                <span className={styles.mathCut} />
                <span className={styles.mathStitch} />
                <span className={styles.mathCorner}>C</span>
                <span className={styles.mathSeam}>¼″</span>
              </div>
              <p>Measure the corner square from the <strong>raw side and bottom edges</strong>. When the side, bottom, and boxed seams all use {formatInches(plan.seamAllowance)}, their offsets cancel in the fold.</p>
              <div className={styles.mathFormula}>
                <span>Depth</span>
                <b>=</b>
                <strong>2 × corner square</strong>
                <em>= {formatInches(plan.finishedDepth)}</em>
              </div>
              <small>If you pinch first instead, measure half the desired depth from the actual seam intersection—not from the raw fabric point.</small>
            </section>

            {!ready ? (
              <section className={styles.warningList}>
                {[...plan.warnings, ...composition.warnings, ...closureWarnings].map((warning) => <p key={warning}>{warning}</p>)}
              </section>
            ) : null}

            <section className={styles.cutList}>
              <header>
                <div>
                  <p>Cut list</p>
                  <h3>{closureChoices.find((choice) => choice.id === closure)?.label}</h3>
                </div>
                <span>{pieces.length} groups</span>
              </header>
              <div className={styles.cutRows}>
                {pieces.map((piece) => (
                  <article key={`${piece.material}-${piece.name}`}>
                    <span className={`${styles.materialDot} ${styles[`material_${piece.material}`]}`}>{piece.quantity}×</span>
                    <div>
                      <strong>{piece.name}</strong>
                      <b>{formatInches(piece.width)} × {formatInches(piece.height)}</b>
                      <small>{piece.note}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.notionCard}>
              <span>Hardware + construction</span>
              <strong>{zipperNote(plan, closure, closureOptions)}</strong>
              <p>Directional fabric: keep grain arrows parallel. Thick foam or vinyl: make a scrap corner because turn-of-cloth can reduce the inside size.</p>
              {handleBuildAdvisories.map((advisory) => <b key={advisory}>{advisory}</b>)}
              {closure !== "open-tote" ? <b>Before closing the shell, open the zipper at least halfway.</b> : null}
            </section>

            <div className={styles.resultActions}>
              <button type="button" onClick={() => void copyPlan()} disabled={!ready}>{copyState === "copied" ? "Copied ✓" : copyState === "error" ? "Copy failed" : "Copy cut plan"}</button>
              <button type="button" onClick={() => window.print()}>Print</button>
              <button type="button" className={styles.primaryAction} disabled={!ready} onClick={() => downloadPatternSvg(plan, composition, closure, handlePlan)}>Download body-panel SVG</button>
            </div>
          </aside>
        </div>
        </div>

        <section
          className={styles.savedLibrary}
          id="saved-bags-workspace"
          role="tabpanel"
          aria-labelledby="saved-bags-tab"
          hidden={activeTab !== "saved"}
        >
          <header className={styles.savedLibraryHeader}>
            <div>
              <p>Named patterns</p>
              <h2>Your saved bags</h2>
              <span>Open a design to continue from every saved measurement, panel choice, closure setting, fabric plan, and 3D angle.</span>
            </div>
            <button type="button" className={styles.projectPrimaryAction} onClick={startNewBag}>+ New bag</button>
          </header>

          {savedBags.length ? (
            <label className={styles.savedSearch}>
              <span>Find a saved bag</span>
              <input
                type="search"
                value={savedSearch}
                placeholder="Search by name"
                onChange={(event) => setSavedSearch(event.target.value)}
              />
            </label>
          ) : null}

          {filteredSavedBags.length ? (
            <div className={styles.savedBagGrid}>
              {filteredSavedBags.map((saved) => {
                const savedPlan = calculateBagPatternPlan(saved.snapshot.draft);
                const closureLabel = closureChoices.find(
                  (choice) => choice.id === saved.snapshot.closure,
                )?.label;
                return (
                  <article className={styles.savedBagCard} key={saved.id}>
                    <div className={styles.savedBagCardTop}>
                      <span>{closureLabel}</span>
                      {saved.id === activeSavedBagId ? <b>OPEN</b> : null}
                    </div>
                    <h3>{saved.name}</h3>
                    <strong>{formatInches(savedPlan.finishedBaseWidth)} W × {formatInches(savedPlan.finishedHeight)} H × {formatInches(savedPlan.finishedDepth)} D</strong>
                    <dl>
                      <div><dt>Outer</dt><dd>{saved.snapshot.outerDesign.mode.replaceAll("-", " ")}</dd></div>
                      <div><dt>Fabric</dt><dd>{saved.snapshot.fabricSettings.source === "fat-quarters" ? "fat quarters" : `${formatInches(saved.snapshot.draft.fabricWidth)} bolt`}</dd></div>
                      <div><dt>Updated</dt><dd>{formatSavedBagTime(saved.updatedAt)}</dd></div>
                    </dl>
                    <div className={styles.savedBagActions}>
                      <button type="button" className={styles.projectPrimaryAction} onClick={() => openSavedBag(saved)}>Open</button>
                      <button type="button" onClick={() => duplicateSavedBag(saved)}>Duplicate</button>
                      <button type="button" className={styles.savedBagRemove} onClick={() => removeSavedBag(saved)}>Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.savedEmptyState}>
              <span aria-hidden="true">◇</span>
              <h3>{savedBags.length ? "No names match that search." : "No named bags yet."}</h3>
              <p>Your latest working settings are already restored automatically. Give a design a name in the studio when you want to keep it as a reusable pattern.</p>
              <button type="button" onClick={() => showWorkspaceTab("studio", true)}>Return to design studio</button>
            </div>
          )}

          <p className={styles.savedLocalNote}>These early saves stay only in this browser, under your signed-in Monosyth profile. They are not published or shared.</p>
        </section>

        <footer className={styles.appFooter}>
          <span>Monosyth / Modular Bag Studio</span>
          <p>One bag grammar. Many useful constructions.</p>
          <Link href="/app">← Back to Studio</Link>
        </footer>
      </div>
    </main>
  );
}

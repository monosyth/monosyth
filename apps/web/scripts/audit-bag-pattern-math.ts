import assert from "node:assert/strict";

import {
  calculateBagPatternPlan,
  calculateFatQuarterPieceLayout,
  draftFromFinishedSize,
} from "../src/lib/sewing/bag-pattern";
import {
  calculateOuterPanelComposition,
  defaultOuterPanelDesign,
} from "../src/lib/sewing/panel-composition";
import { calculateToteHandlePlan } from "../src/lib/sewing/tote-handle";

let checks = 0;
const near = (actual: number, expected: number, message: string) => {
  assert.ok(Math.abs(actual - expected) < 0.0001, `${message}: ${actual}`);
  checks += 1;
};
const yes = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  checks += 1;
};

const plan = calculateBagPatternPlan(
  draftFromFinishedSize({
    baseWidth: 14,
    height: 12,
    depth: 4,
    seamAllowance: 0.25,
  }),
);

near(plan.cutWidth, 18.5, "14 × 12 × 4 tote cut width");
near(plan.cutHeight, 14.5, "14 × 12 × 4 tote cut height");
near(plan.finishedBaseWidth, 14, "finished width round trip");
near(plan.finishedHeight, 12, "finished height round trip");
near(plan.finishedDepth, 4, "finished depth round trip");

const fatQuarterPanels = calculateFatQuarterPieceLayout({
  usableWidth: 21,
  usableLength: 18,
  pieceWidth: plan.boundingCutWidth,
  pieceHeight: plan.cutHeight,
  quantity: 2,
});
yes(fatQuarterPanels.fits, "default body panel fits a conservative usable fat quarter");
yes(fatQuarterPanels.piecesPerFatQuarter === 1, "one default body panel fits per fat quarter");
yes(fatQuarterPanels.fatQuartersNeeded === 2, "two body panels need two fat quarters");
yes(!fatQuarterPanels.rotated, "default panel keeps its grain upright");
near(fatQuarterPanels.clearanceWidth, 2.5, "default panel fat-quarter width clearance");
near(fatQuarterPanels.clearanceLength, 3.5, "default panel fat-quarter length clearance");

const sidewaysFatQuarter = calculateFatQuarterPieceLayout({
  usableWidth: 21,
  usableLength: 18,
  pieceWidth: 17,
  pieceHeight: 20,
  quantity: 2,
  allowRotation: true,
});
yes(sidewaysFatQuarter.fits, "sideways-only piece fits when rotation is allowed");
yes(sidewaysFatQuarter.rotated, "sideways-only fit reports its rotation");
yes(sidewaysFatQuarter.fatQuartersNeeded === 2, "sideways-only panels retain the correct count");

const blockedFatQuarter = calculateFatQuarterPieceLayout({
  usableWidth: 21,
  usableLength: 18,
  pieceWidth: 17,
  pieceHeight: 20,
  quantity: 2,
});
yes(!blockedFatQuarter.fits, "directional mode blocks a sideways-only fit");

const smallFatQuarterPieces = calculateFatQuarterPieceLayout({
  usableWidth: 21,
  usableLength: 18,
  pieceWidth: 5,
  pieceHeight: 5,
  quantity: 20,
});
yes(smallFatQuarterPieces.piecesPerFatQuarter === 12, "fat-quarter grid capacity uses both dimensions");
yes(smallFatQuarterPieces.fatQuartersNeeded === 2, "fat-quarter grid rounds the purchase count up");

const grid = calculateOuterPanelComposition(plan, {
  ...defaultOuterPanelDesign,
  mode: "block-grid",
});
near(grid.blockCutSize, 5, "cut square remains five inches");
near(grid.blockFinishedSize, 4.5, "quarter-inch seams finish at 4.5 inches");
near(grid.sewnWidth, 23, "five-column sewn slab width");
near(grid.sewnHeight, 18.5, "four-row sewn slab height");
near(grid.trimWidth, 4.5, "centered horizontal trim total");
near(grid.trimHeight, 4, "centered vertical trim total");
yes(grid.columnSeams.length === 4, "all four visible column seams retained");
yes(grid.rowSeams.length === 3, "all three visible row seams retained");
grid.columnSeams.slice(1).forEach((seam, index) =>
  near(seam - grid.columnSeams[index], 4.5, "column seam spacing"),
);
grid.rowSeams.slice(1).forEach((seam, index) =>
  near(seam - grid.rowSeams[index], 4.5, "row seam spacing"),
);
yes(grid.cutPieces[0]?.quantity === 40, "two 4 × 5 faces need 40 squares");
yes(grid.valid, "default 4 × 5 grid covers the target panels");

const precutGrid = calculateOuterPanelComposition(plan, {
  ...defaultOuterPanelDesign,
  mode: "block-grid",
  rows: 7,
  columns: 7,
  blockSize: 2.5,
  blockSizeBasis: "cut",
});
near(precutGrid.blockCutSize, 2.5, "2.5-inch precut remains the physical cut size");
near(precutGrid.blockFinishedSize, 2, "quarter-inch seams finish a 2.5-inch precut at two inches");
near(precutGrid.sewnWidth, 14.5, "seven 2.5-inch precuts sew to a 14.5-inch grid");
near(precutGrid.sewnHeight, 14.5, "seven 2.5-inch precut rows sew to 14.5 inches");
yes(
  precutGrid.instructions[0]?.includes("becomes 2\u2033 × 2\u2033"),
  "precut instructions state the visible size after seams",
);

const finishedBlockGrid = calculateOuterPanelComposition(plan, {
  ...defaultOuterPanelDesign,
  mode: "block-grid",
  blockSize: 2.5,
  blockSizeBasis: "finished",
});
near(finishedBlockGrid.blockCutSize, 3, "2.5-inch finished block requires a three-inch cut");
near(finishedBlockGrid.blockFinishedSize, 2.5, "finished-size input remains visible after seams");

const contrast = calculateOuterPanelComposition(plan, {
  ...defaultOuterPanelDesign,
  contrastEnabled: true,
  contrastRise: 3,
});
near(contrast.contrastJoinY ?? -1, 9.25, "contrast join raw position");
near(contrast.upperCutHeight, 9.5, "upper panel includes join allowance");
near(contrast.contrastCutHeight, 5.5, "band wraps under base and includes allowance");
near(
  contrast.upperCutHeight + contrast.contrastCutHeight - 0.5,
  plan.cutHeight,
  "two quarter-inch join allowances resolve to final blank",
);
yes(contrast.cutPieces.some((piece) => piece.material === "contrast"), "contrast has its own cut row");

const frontOnly = calculateOuterPanelComposition(plan, {
  ...defaultOuterPanelDesign,
  mode: "vertical-strips",
  scope: "front",
  columns: 3,
});
yes(frontOnly.piecedPanelCount === 1, "front-only scope pieces one face");
yes(frontOnly.solidPanelCount === 1, "front-only scope leaves one solid face");
yes(frontOnly.columnSeams.length === 2, "three strips yield two seams");

const capped = calculateOuterPanelComposition(plan, {
  ...defaultOuterPanelDesign,
  mode: "block-grid",
  rows: 999,
  columns: 999,
});
yes(capped.design.rows === 24 && capped.design.columns === 24, "piece counts cap at 24 per direction");
yes(capped.cutPieces[0]?.quantity === 1152, "capped two-face grid produces bounded quantity");

const handle = calculateToteHandlePlan(plan, {
  handleMaterial: "webbing",
  handleDrop: 10,
  handleWidth: 1.5,
  handleInset: 3.5,
  handleAttachmentDepth: 3,
});
near(handle.standingRimWidth, 14, "standing rim width");
near(handle.centerSpacing, 7, "handle center spacing");
near(handle.rawLeftCenter, 5.75, "left raw placement mark");
near(handle.rawRightCenter, 12.75, "right raw placement mark");
near(handle.webbingCutLength, 31.5, "rounded webbing cut length");
yes(handle.valid, "default tote handle plan is valid");

const asymmetricPlan = calculateBagPatternPlan({
  ...draftFromFinishedSize({
    baseWidth: 14,
    height: 12,
    depth: 4,
    seamAllowance: 0.25,
  }),
  leftTopInset: -3,
  rightTopInset: -1.5,
});
const asymmetricHandle = calculateToteHandlePlan(asymmetricPlan, {
  handleMaterial: "webbing",
  handleDrop: 10,
  handleWidth: 1.5,
  handleInset: 1.5,
  handleAttachmentDepth: 4,
});
yes(
  asymmetricHandle.warnings.some((warning) =>
    warning.includes("tapered face"),
  ),
  "asymmetric flare catches a vertical leg beyond the true face edge",
);

const baseFoldHandle = calculateToteHandlePlan(plan, {
  handleMaterial: "webbing",
  handleDrop: 10,
  handleWidth: 1.5,
  handleInset: 3.5,
  handleAttachmentDepth: 11,
});
yes(
  baseFoldHandle.advisories.some((advisory) =>
    advisory.includes("boxed-base fold"),
  ),
  "deep attachment warns before the boxed-base fold",
);

for (const size of [
  { baseWidth: 8, height: 7, depth: 2 },
  { baseWidth: 14, height: 12, depth: 4 },
  { baseWidth: 22, height: 16, depth: 6 },
]) {
  const roundTrip = calculateBagPatternPlan(
    draftFromFinishedSize({ ...size, seamAllowance: 0.25 }),
  );
  near(roundTrip.finishedBaseWidth, size.baseWidth, "size-set width round trip");
  near(roundTrip.finishedHeight, size.height, "size-set height round trip");
  near(roundTrip.finishedDepth, size.depth, "size-set depth round trip");
}

process.stdout.write(`${checks} sewing-math checks passed\n`);

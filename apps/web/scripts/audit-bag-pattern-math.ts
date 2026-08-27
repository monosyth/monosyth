import assert from "node:assert/strict";

import {
  calculateBagPatternPlan,
  calculateFatQuarterPieceLayout,
  draftFromFinishedSize,
} from "../src/lib/sewing/bag-pattern";
import {
  calculateBoxyBagKit,
  calculateBoxyBagPlan,
  draftFromFinishedBoxyBag,
} from "../src/lib/sewing/boxy-bag";
import {
  calculateOuterPanelComposition,
  defaultOuterPanelDesign,
} from "../src/lib/sewing/panel-composition";
import { calculateRecessedZipperKit } from "../src/lib/sewing/recessed-zipper";
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

const boxedRecessedKit = calculateRecessedZipperKit(plan, {
  recessDepth: 1.5,
  recessEndGap: 0.5,
  recessEndStyle: "boxed",
  recessNotch: 0.75,
});
near(boxedRecessedKit.cutLength, 18.5, "boxed recessed panels use the raw top-edge width");
near(boxedRecessedKit.cutWidth, 2, "boxed recessed cut depth includes two seam allowances");
near(boxedRecessedKit.boxedEndWidth, 1.5, "boxed end width is twice the zipper-panel notch");
near(boxedRecessedKit.zipperSeamSpan, 17, "boxed zipper seam spans between both notches");
near(boxedRecessedKit.recommendedZipperLength, 20, "boxed zipper handling length rounds to an easy whole inch");

const openRecessedKit = calculateRecessedZipperKit(plan, {
  recessDepth: 1.5,
  recessEndGap: 0.5,
  recessEndStyle: "open",
  recessNotch: 0.75,
});
near(openRecessedKit.finishedLength, 13, "open recessed panel keeps both selected side gaps");
near(openRecessedKit.cutLength, 13.5, "open recessed panel adds two seam allowances to its finished length");
near(openRecessedKit.notch, 0, "open recessed panel never inherits boxed notches");

const largerNotchKit = calculateRecessedZipperKit(plan, {
  recessDepth: 1.5,
  recessEndGap: 0.5,
  recessEndStyle: "boxed",
  recessNotch: 1,
});
near(largerNotchKit.boxedEndWidth, 2, "larger zipper-panel square updates the boxed end width");
near(largerNotchKit.zipperSeamSpan, 16.5, "larger zipper-panel square shortens the zipper seam span at both ends");

const halfInchSeamPlan = calculateBagPatternPlan(
  draftFromFinishedSize({
    baseWidth: 14,
    height: 12,
    depth: 4,
    seamAllowance: 0.5,
  }),
);
const halfInchSeamKit = calculateRecessedZipperKit(halfInchSeamPlan, {
  recessDepth: 1.5,
  recessEndGap: 0.5,
  recessEndStyle: "boxed",
  recessNotch: 0.75,
});
near(halfInchSeamKit.cutWidth, 2.5, "recessed cut depth follows a changed construction seam");

const taperedTopPlan = calculateBagPatternPlan({
  ...plan,
  leftTopInset: 1,
  rightTopInset: 1.5,
});
const taperedTopKit = calculateRecessedZipperKit(taperedTopPlan, {
  recessDepth: 1.5,
  recessEndGap: 0.5,
  recessEndStyle: "boxed",
  recessNotch: 0.75,
});
near(taperedTopKit.cutLength, taperedTopPlan.topCutWidth, "boxed panel length follows a tapered raw top edge");

const overNotchedKit = calculateRecessedZipperKit(plan, {
  recessDepth: 1.5,
  recessEndGap: 0.5,
  recessEndStyle: "boxed",
  recessNotch: 20,
});
near(overNotchedKit.notchedZipperEdge, 0, "impossible zipper notches clamp the remaining edge to zero for validation");

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

const easyCutBoxy = calculateBoxyBagPlan({
  cutWidth: 14.5,
  cutHeight: 8.5,
  cornerCut: 2,
  seamAllowance: 0.25,
  topTakeUp: 0,
  leftTopInset: 0,
  rightTopInset: 0,
  fabricWidth: 44,
});
near(easyCutBoxy.finishedBaseWidth, 10, "easy-cut boxy length");
near(easyCutBoxy.finishedHeight, 4, "easy-cut boxy height");
near(easyCutBoxy.finishedDepth, 4, "easy-cut boxy width");
near(easyCutBoxy.finishedFlatWidth, 10.5, "easy-cut zipper sewing span");
yes(easyCutBoxy.valid, "easy-cut boxy draft is valid");

const tallNarrowBoxy = calculateBoxyBagPlan({
  ...easyCutBoxy,
  cutWidth: 11.5,
  cutHeight: 8.5,
  cornerCut: 2.75,
});
near(tallNarrowBoxy.finishedBaseWidth, 5.5, "large boxy corners leave the expected finished length");
near(tallNarrowBoxy.finishedHeight, 2.5, "large boxy corners leave the expected short height");
near(tallNarrowBoxy.finishedDepth, 5.5, "large boxy corners create twice their size in width");
near(tallNarrowBoxy.finishedFlatWidth, 6, "raw zipper edge remains one half inch longer than the finished zipper line");
yes(tallNarrowBoxy.valid, "a tall narrow boxy draft remains valid even when its proportions are unusual");

const halfInchBoxy = calculateBoxyBagPlan({
  ...easyCutBoxy,
  cutWidth: 12,
  cutHeight: 8,
  cornerCut: 2,
  seamAllowance: 0.5,
});
near(halfInchBoxy.finishedBaseWidth, 7, "half-inch-seam boxy length");
near(halfInchBoxy.finishedHeight, 3, "half-inch-seam boxy height");
near(halfInchBoxy.finishedDepth, 4, "boxy corner square controls finished width");

for (const size of [
  { length: 7, width: 3, height: 4 },
  { length: 10, width: 4, height: 4 },
  { length: 18, width: 7, height: 6 },
]) {
  const roundTrip = calculateBoxyBagPlan(
    draftFromFinishedBoxyBag({ ...size, seamAllowance: 0.25 }),
  );
  near(roundTrip.finishedBaseWidth, size.length, "boxy length round trip");
  near(roundTrip.finishedDepth, size.width, "boxy width round trip");
  near(roundTrip.finishedHeight, size.height, "boxy height round trip");
}

const boxyKit = calculateBoxyBagKit(easyCutBoxy);
near(boxyKit.installedZipperSeam, 10.5, "boxy zipper spans between upper notches");
near(boxyKit.recommendedZipperLength, 13, "boxy zipper adds handling room past both upper cutouts");
yes(boxyKit.cornerCutoutsPerPanel === 4, "each boxy panel has four corner cutouts");
yes(boxyKit.totalCornerCutouts === 16, "outer and lining panels have sixteen total cutouts");

const impossibleBoxy = calculateBoxyBagPlan({
  ...easyCutBoxy,
  cutHeight: 4.5,
});
yes(!impossibleBoxy.valid, "boxy draft rejects corners that consume the panel height");
yes(
  impossibleBoxy.warnings.some((warning) => warning.includes("height")),
  "invalid boxy height explains what must change",
);

const crampedBoxy = calculateBoxyBagPlan({
  ...easyCutBoxy,
  cornerCut: 0.25,
});
yes(!crampedBoxy.valid, "boxy draft rejects a corner square no larger than the seam allowance");
yes(
  crampedBoxy.warnings.some((warning) => warning.includes("larger than the seam allowance")),
  "cramped boxy corner explains the handling problem",
);

process.stdout.write(`${checks} sewing-math checks passed\n`);

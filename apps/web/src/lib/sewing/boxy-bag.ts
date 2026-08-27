import {
  formatInches,
  type BagPatternDraft,
  type BagPatternPlan,
} from "@/lib/sewing/bag-pattern";

export type FinishedBoxyBagSize = {
  length: number;
  width: number;
  height: number;
};

export type BoxyBagKit = {
  panelCutLength: number;
  panelCutWidth: number;
  cornerSquare: number;
  installedZipperSeam: number;
  recommendedZipperLength: number;
  cornerCutoutsPerPanel: 4;
  totalCornerCutouts: 16;
};

/**
 * Standard two-panel boxy zipper pouch geometry.
 *
 * Each outer and lining rectangle wraps from the zipper centerline, across one
 * side, and to the bottom centerline. Matching raw-edge squares are removed
 * from all four corners. With one seam allowance used throughout:
 *
 * length = panel length - 2 × corner - 2 × seam
 * width  = panel width  - 2 × corner - 2 × seam
 * height = 2 × corner
 */
export function calculateBoxyBagPlan(
  draft: BagPatternDraft,
): BagPatternPlan {
  const finishedHeight = Math.max(0, draft.cornerCut * 2);
  const finishedBaseWidth = Math.max(
    0,
    draft.cutWidth - finishedHeight - draft.seamAllowance * 2,
  );
  const finishedDepth = Math.max(
    0,
    draft.cutHeight - finishedHeight - draft.seamAllowance * 2,
  );
  const installedZipperSeam = Math.max(
    0,
    draft.cutWidth - draft.cornerCut * 2,
  );
  const warnings: string[] = [];

  if (draft.seamAllowance <= 0) {
    warnings.push("Choose a seam allowance greater than zero.");
  }
  if (draft.cornerCut <= 0) {
    warnings.push("The four corner squares must be greater than zero.");
  }
  if (
    draft.cornerCut > 0 &&
    draft.seamAllowance > 0 &&
    draft.cornerCut <= draft.seamAllowance
  ) {
    warnings.push(
      "Make each corner square larger than the seam allowance so there is room to align and sew the box seam.",
    );
  }
  if (finishedBaseWidth <= 0) {
    warnings.push("The corner squares consume the entire boxy-bag length.");
  }
  if (finishedDepth <= 0) {
    warnings.push("The corner squares consume the entire boxy-bag width.");
  }
  if (finishedBaseWidth > 0 && finishedBaseWidth < 2) {
    warnings.push("Leave at least 2 inches of finished boxy-bag length for a practical zipper opening.");
  }
  if (finishedDepth > 0 && finishedDepth < 1) {
    warnings.push("Leave at least 1 inch of finished boxy-bag width so the box seams can turn cleanly.");
  }
  if (installedZipperSeam > 0 && installedZipperSeam < 2.5) {
    warnings.push("Leave at least 2 1/2 inches between the upper corner squares for the zipper seam.");
  }
  if (draft.cornerCut * 2 + draft.seamAllowance * 2 >= draft.cutWidth) {
    warnings.push("Use a longer cut rectangle or smaller corner squares.");
  }
  if (draft.cornerCut * 2 + draft.seamAllowance * 2 >= draft.cutHeight) {
    warnings.push("Use a wider cut rectangle or smaller corner squares.");
  }

  return {
    ...draft,
    topTakeUp: 0,
    leftTopInset: 0,
    rightTopInset: 0,
    finishedDepth,
    finishedBaseWidth,
    finishedHeight,
    finishedFlatWidth: installedZipperSeam,
    finishedTopOpening: finishedBaseWidth,
    topCutWidth: draft.cutWidth,
    boundingCutWidth: draft.cutWidth,
    leftTopAngle: 90,
    rightTopAngle: 90,
    volumeCubicInches:
      finishedBaseWidth * finishedDepth * finishedHeight,
    valid: warnings.length === 0,
    warnings,
  };
}

export function draftFromFinishedBoxyBag({
  length,
  width,
  height,
  seamAllowance,
  fabricWidth = 44,
}: FinishedBoxyBagSize & {
  seamAllowance: number;
  fabricWidth?: number;
}): BagPatternDraft {
  const cornerCut = height / 2;
  return {
    cutWidth: length + height + seamAllowance * 2,
    cutHeight: width + height + seamAllowance * 2,
    cornerCut,
    seamAllowance,
    topTakeUp: 0,
    leftTopInset: 0,
    rightTopInset: 0,
    fabricWidth,
  };
}

export function calculateBoxyBagKit(plan: BagPatternPlan): BoxyBagKit {
  return {
    panelCutLength: plan.cutWidth,
    panelCutWidth: plan.cutHeight,
    cornerSquare: plan.cornerCut,
    installedZipperSeam: plan.finishedFlatWidth,
    recommendedZipperLength: Math.ceil(plan.finishedFlatWidth + 2),
    cornerCutoutsPerPanel: 4,
    totalCornerCutouts: 16,
  };
}

export function boxyBagFormulaText(plan: BagPatternPlan) {
  return [
    `Length: ${formatInches(plan.cutWidth)} cut − 2 × ${formatInches(plan.cornerCut)} corner − 2 × ${formatInches(plan.seamAllowance)} seam = ${formatInches(plan.finishedBaseWidth)}`,
    `Width: ${formatInches(plan.cutHeight)} cut − 2 × ${formatInches(plan.cornerCut)} corner − 2 × ${formatInches(plan.seamAllowance)} seam = ${formatInches(plan.finishedDepth)}`,
    `Height: 2 × ${formatInches(plan.cornerCut)} corner = ${formatInches(plan.finishedHeight)}`,
  ];
}

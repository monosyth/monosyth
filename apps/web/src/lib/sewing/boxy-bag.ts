export type BoxyBagDimensions = {
  length: number;
  height: number;
  cornerCut: number;
  seamAllowance: number;
};

export type BoxyBagPlan = {
  finishedDepth: number;
  finishedBaseLength: number;
  finishedHeight: number;
  panelLength: number;
  panelWidth: number;
  cornerCut: number;
  cornerStitchLine: number;
  recommendedZipper: number;
};

/**
 * Drafts a four-panel box pouch from two outer rectangles and two lining
 * rectangles. One outer/lining pair is sewn to each zipper tape. The paired
 * outer panels and paired lining panels are then flattened on opposite sides
 * of the zipper so the acrylic tool can cut four stacked raw corners.
 */
export function calculateBoxyBagPlan({
  length,
  height,
  cornerCut,
  seamAllowance,
}: BoxyBagDimensions): BoxyBagPlan {
  const finishedDepth = Math.max(0, (cornerCut - seamAllowance) * 2);
  const panelLength = length + finishedDepth + seamAllowance * 2;
  const panelWidth = height + finishedDepth + seamAllowance * 2;

  return {
    finishedDepth,
    finishedBaseLength: length,
    finishedHeight: height,
    panelLength,
    panelWidth,
    cornerCut,
    cornerStitchLine: finishedDepth,
    recommendedZipper: panelLength,
  };
}

export function calculateBoxyBagPlanFromPanels({
  panelLength,
  panelWidth,
  cornerCut,
  seamAllowance,
}: Omit<BoxyBagDimensions, "length" | "height"> & {
  panelLength: number;
  panelWidth: number;
}): BoxyBagPlan {
  const finishedDepth = Math.max(0, (cornerCut - seamAllowance) * 2);
  const length = Math.max(0, panelLength - finishedDepth - seamAllowance * 2);
  const height = Math.max(0, panelWidth - finishedDepth - seamAllowance * 2);
  const plan = calculateBoxyBagPlan({
    length,
    height,
    cornerCut,
    seamAllowance,
  });

  return {
    ...plan,
    panelLength,
    panelWidth,
  };
}

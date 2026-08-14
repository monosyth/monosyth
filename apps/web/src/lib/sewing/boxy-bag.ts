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
 * Drafts a clean-finish, no-bottom-seam box pouch from one outer rectangle
 * and one lining rectangle. Each rectangle wraps from one zipper edge, around
 * the pouch, and back to the other zipper edge. Corner squares are removed
 * only after the zipper tube is flattened and its two short ends are sewn.
 */
export function calculateBoxyBagPlan({
  length,
  height,
  cornerCut,
  seamAllowance,
}: BoxyBagDimensions): BoxyBagPlan {
  const finishedDepth = Math.max(0, (cornerCut - seamAllowance) * 2);
  const panelLength = length + finishedDepth + seamAllowance * 2;
  const panelWidth = (height + finishedDepth) * 2 + seamAllowance * 2;

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
  const height = Math.max(0, (panelWidth - seamAllowance * 2) / 2 - finishedDepth);
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

export type BoxyBagDimensions = {
  length: number;
  height: number;
  cornerCut: number;
  seamAllowance: number;
  zipperExtra: number;
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
 * Drafts a clean-finish, four-panel wraparound-zipper pouch. The selected
 * acrylic-template corner is the raw square removed from all four corners of
 * every panel. The seam allowance is taken from both sides of each cap seam.
 */
export function calculateBoxyBagPlan({
  length,
  height,
  cornerCut,
  seamAllowance,
  zipperExtra,
}: BoxyBagDimensions): BoxyBagPlan {
  const finishedDepth = Math.max(0, (cornerCut - seamAllowance) * 2);

  return {
    finishedDepth,
    finishedBaseLength: length,
    finishedHeight: height,
    panelLength: length + cornerCut * 2 + seamAllowance * 2,
    panelWidth: height + cornerCut * 2 + seamAllowance * 2,
    cornerCut,
    cornerStitchLine: finishedDepth,
    recommendedZipper: length + seamAllowance * 2 + zipperExtra,
  };
}

export function calculateBoxyBagPlanFromPanels({
  panelLength,
  panelWidth,
  cornerCut,
  seamAllowance,
  zipperExtra,
}: Omit<BoxyBagDimensions, "length" | "height"> & {
  panelLength: number;
  panelWidth: number;
}): BoxyBagPlan {
  const length = Math.max(0, panelLength - cornerCut * 2 - seamAllowance * 2);
  const height = Math.max(0, panelWidth - cornerCut * 2 - seamAllowance * 2);
  const plan = calculateBoxyBagPlan({
    length,
    height,
    cornerCut,
    seamAllowance,
    zipperExtra,
  });

  return {
    ...plan,
    panelLength,
    panelWidth,
  };
}

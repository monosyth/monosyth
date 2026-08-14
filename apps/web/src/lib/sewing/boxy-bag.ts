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
  panelLength: number;
  panelWidth: number;
  cornerCut: number;
  cornerStitchLine: number;
  recommendedZipper: number;
};

/**
 * Drafts a clean-finish, four-panel zipper pouch. The selected acrylic-template
 * corner is the raw square removed from both bottom corners of every panel.
 * The seam allowance is taken from both sides of each boxed-corner seam.
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
    finishedBaseLength: Math.max(0, length - finishedDepth),
    panelLength: length + seamAllowance * 2,
    panelWidth: height + cornerCut + seamAllowance,
    cornerCut,
    cornerStitchLine: finishedDepth,
    recommendedZipper: length + seamAllowance * 2 + zipperExtra,
  };
}

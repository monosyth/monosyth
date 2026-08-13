export type BoxyBagDimensions = {
  length: number;
  cornerCut: number;
  seamAllowance: number;
  zipperExtra: number;
};

export type BoxyBagPlan = {
  finishedEnd: number;
  panelLength: number;
  panelWidth: number;
  cornerCut: number;
  cornerStitchLine: number;
  recommendedZipper: number;
};

/**
 * Drafts a cut-first, four-panel boxy pouch with square end caps. The selected
 * acrylic-template corner is the raw square removed from all four corners of
 * every panel. The seam allowance is taken from both sides of the boxed seam.
 */
export function calculateBoxyBagPlan({
  length,
  cornerCut,
  seamAllowance,
  zipperExtra,
}: BoxyBagDimensions): BoxyBagPlan {
  const finishedEnd = Math.max(0, (cornerCut - seamAllowance) * 2);

  return {
    finishedEnd,
    panelLength: length + cornerCut * 2,
    panelWidth: cornerCut * 4 - seamAllowance * 2,
    cornerCut,
    cornerStitchLine: finishedEnd,
    recommendedZipper: length + finishedEnd + zipperExtra,
  };
}

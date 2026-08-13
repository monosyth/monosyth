export type BoxyBagDimensions = {
  length: number;
  width: number;
  height: number;
  seamAllowance: number;
  zipperExtra: number;
};

export type BoxyBagPlan = {
  panelLength: number;
  panelWidth: number;
  cornerMark: number;
  cornerStitchLine: number;
  recommendedZipper: number;
};

/**
 * Drafts a four-panel, fully lined boxy pouch. The zipper runs in the
 * finished-length direction and the height is the boxed-corner dimension.
 */
export function calculateBoxyBagPlan({
  length,
  width,
  height,
  seamAllowance,
  zipperExtra,
}: BoxyBagDimensions): BoxyBagPlan {
  return {
    panelLength: length + height + seamAllowance * 2,
    panelWidth: width + height + seamAllowance * 2,
    cornerMark: height / 2,
    cornerStitchLine: height,
    recommendedZipper: length + height + seamAllowance * 2 + zipperExtra,
  };
}

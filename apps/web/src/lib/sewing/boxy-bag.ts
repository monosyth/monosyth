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
  cornerTemplateGuide: number;
  rawCornerMark: number;
  cornerStitchLine: number;
  recommendedZipper: number;
};

/**
 * Drafts a four-panel, fully lined boxy pouch. The zipper runs in the
 * finished-length direction; width is the front-to-back boxed depth.
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
    cornerTemplateGuide: width / 2,
    rawCornerMark: width / 2 + seamAllowance,
    cornerStitchLine: width,
    recommendedZipper: length + height + zipperExtra,
  };
}

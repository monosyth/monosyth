import type { BagPatternPlan } from "@/lib/sewing/bag-pattern";
import type { RecessedZipperEndStyle } from "@/lib/sewing/bag-studio-storage";

export type RecessedZipperKitOptions = {
  recessDepth: number;
  recessEndGap: number;
  recessEndStyle: RecessedZipperEndStyle;
  recessNotch: number;
};

export type RecessedZipperKit = {
  endStyle: RecessedZipperEndStyle;
  cutLength: number;
  cutWidth: number;
  finishedLength: number;
  notch: number;
  boxedEndWidth: number;
  notchedZipperEdge: number;
  zipperSeamSpan: number;
  recommendedZipperLength: number;
};

function standingTopRimWidth(plan: BagPatternPlan) {
  return Math.max(0, plan.finishedTopOpening - plan.finishedDepth);
}

export function recessedPanelFinishedLength(
  plan: BagPatternPlan,
  endGap: number,
) {
  return Math.max(0, standingTopRimWidth(plan) - endGap * 2);
}

export function calculateRecessedZipperKit(
  plan: BagPatternPlan,
  options: RecessedZipperKitOptions,
): RecessedZipperKit {
  const boxed = options.recessEndStyle === "boxed";
  const finishedLength = boxed
    ? Math.max(0, plan.topCutWidth - plan.seamAllowance * 2)
    : recessedPanelFinishedLength(plan, options.recessEndGap);
  const cutLength = boxed
    ? plan.topCutWidth
    : finishedLength + plan.seamAllowance * 2;
  const cutWidth = options.recessDepth + plan.seamAllowance * 2;
  const notch = boxed ? options.recessNotch : 0;
  const notchedZipperEdge = Math.max(0, cutLength - notch * 2);

  return {
    endStyle: options.recessEndStyle,
    cutLength,
    cutWidth,
    finishedLength,
    notch,
    boxedEndWidth: notch * 2,
    notchedZipperEdge,
    zipperSeamSpan: boxed ? notchedZipperEdge : finishedLength,
    recommendedZipperLength: Math.ceil(cutLength + 1),
  };
}

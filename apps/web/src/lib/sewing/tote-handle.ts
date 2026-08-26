import {
  calculatePanelStitchGeometry,
  formatInches,
  type BagPatternPlan,
} from "@/lib/sewing/bag-pattern";

export type HandleMaterial = "webbing" | "fabric";

export type ToteHandleOptions = {
  handleMaterial: HandleMaterial;
  handleDrop: number;
  handleWidth: number;
  handleInset: number;
  handleAttachmentDepth: number;
};

export type ToteHandlePlan = ToteHandleOptions & {
  standingRimWidth: number;
  centerSpacing: number;
  outsideEdgeClearance: number;
  insideGap: number;
  rawLeftCenter: number;
  rawRightCenter: number;
  rawRimY: number;
  rawAttachmentEndY: number;
  freeArcLength: number;
  coreLength: number;
  webbingCutLength: number;
  fabricCutLength: number;
  fabricCutWidth: number;
  cutLength: number;
  cutWidth: number;
  valid: boolean;
  warnings: string[];
  advisories: string[];
};

function roundUpQuarter(value: number) {
  return Math.ceil(value * 4 - 0.0001) / 4;
}

export function standingTopRimWidth(plan: BagPatternPlan) {
  return Math.max(0, plan.finishedTopOpening - plan.finishedDepth);
}

export function calculateToteHandlePlan(
  plan: BagPatternPlan,
  options: ToteHandleOptions,
): ToteHandlePlan {
  const handleWidth = Math.max(0, options.handleWidth);
  const handleInset = Math.max(0, options.handleInset);
  const handleAttachmentDepth = Math.max(0, options.handleAttachmentDepth);
  const handleDrop = Math.max(0, options.handleDrop);
  const rimWidth = standingTopRimWidth(plan);
  const centerSpacing = rimWidth - handleInset * 2;
  const outsideEdgeClearance = handleInset - handleWidth / 2;
  const insideGap = centerSpacing - handleWidth;
  const geometry = calculatePanelStitchGeometry(plan);
  const frontCornerOffset = plan.finishedDepth / 2;
  const rawLeftCenter =
    geometry.topLeft.x + frontCornerOffset + handleInset;
  const rawRightCenter =
    geometry.topRight.x - frontCornerOffset - handleInset;
  const rawRimY = plan.topTakeUp;
  const rawAttachmentEndY = rawRimY + handleAttachmentDepth;
  const warnings: string[] = [];
  const advisories: string[] = [];

  const centerlineRise = handleDrop + handleWidth / 2;
  const ellipseA = Math.max(0, centerSpacing / 2);
  const ellipseB = Math.max(0, centerlineRise);
  const freeArcLength =
    ellipseA > 0 && ellipseB > 0
      ? (Math.PI / 2) *
        (3 * (ellipseA + ellipseB) -
          Math.sqrt(
            (3 * ellipseA + ellipseB) *
              (ellipseA + 3 * ellipseB),
          ))
      : 0;
  const coreLength = handleAttachmentDepth * 2 + freeArcLength;
  // Both estimates include 1/2 inch turned under at each end. Webbing adds
  // another 1/2 inch total for matching; fabric adds 1 inch for pressing.
  const webbingCutLength = roundUpQuarter(coreLength + 1.5);
  const fabricCutLength = roundUpQuarter(coreLength + 2);
  const fabricCutWidth = handleWidth * 4;

  if (handleWidth <= 0) {
    warnings.push("Choose a finished handle width greater than zero.");
  }
  if (handleDrop <= 0) {
    warnings.push("Choose a handle drop greater than zero.");
  }
  if (rimWidth <= 0) {
    warnings.push("The standing rim is too narrow to place tote handles.");
  }
  if (outsideEdgeClearance < 0) {
    warnings.push(
      "The handle extends past the finished front corner; increase the inset or reduce the handle width.",
    );
  }
  if (centerSpacing < handleWidth) {
    warnings.push(
      "The two handle attachment legs overlap; reduce the inset or handle width.",
    );
  }
  if (handleAttachmentDepth <= 0) {
    warnings.push("Choose an attachment depth greater than zero.");
  }
  if (handleAttachmentDepth >= plan.finishedHeight) {
    warnings.push(
      "The handle attachment reaches or extends beyond the finished base; shorten the attachment depth.",
    );
  }

  const attachmentProgress = Math.min(
    1,
    Math.max(
      0,
      (rawAttachmentEndY - rawRimY) /
        Math.max(plan.finishedHeight, 0.001),
    ),
  );
  const leftSideAtAttachmentEnd =
    geometry.topLeft.x +
    (geometry.leftSideBottom.x - geometry.topLeft.x) *
      attachmentProgress;
  const rightSideAtAttachmentEnd =
    geometry.topRight.x +
    (geometry.rightSideBottom.x - geometry.topRight.x) *
      attachmentProgress;
  const leftFrontEdgeAtAttachmentEnd =
    leftSideAtAttachmentEnd + plan.finishedDepth / 2;
  const rightFrontEdgeAtAttachmentEnd =
    rightSideAtAttachmentEnd - plan.finishedDepth / 2;
  const leftHandleEdge = rawLeftCenter - handleWidth / 2;
  const rightHandleEdge = rawRightCenter + handleWidth / 2;

  if (
    leftHandleEdge < leftFrontEdgeAtAttachmentEnd - 0.001 ||
    rightHandleEdge > rightFrontEdgeAtAttachmentEnd + 0.001
  ) {
    warnings.push(
      "A vertical handle leg runs beyond the tapered face near its lower attachment point.",
    );
  }

  if (outsideEdgeClearance >= 0 && outsideEdgeClearance < 0.5) {
    advisories.push(
      "The handle edge is less than 1/2 inch from the finished front corner and may roll toward the side.",
    );
  }
  if (insideGap >= 0 && insideGap < handleWidth) {
    advisories.push(
      "The attachment legs are closer than one handle width apart; check reinforcement clearance.",
    );
  }
  if (centerSpacing > 0 && centerSpacing < handleWidth * 2) {
    advisories.push(
      "Handle spacing is narrow relative to the strap width; check hand clearance.",
    );
  }
  if (
    handleAttachmentDepth > 0 &&
    handleAttachmentDepth < Math.max(handleWidth * 2, 1.5)
  ) {
    advisories.push(
      "The secured handle leg is short for this width; increase the depth or add an interior reinforcement patch.",
    );
  }
  if (
    handleAttachmentDepth < plan.finishedHeight &&
    handleAttachmentDepth >
      plan.finishedHeight - Math.max(handleWidth, 1)
  ) {
    advisories.push(
      "The handle attachment approaches the boxed-base fold. Shorten it or keep the reinforcement clear of the corner transition.",
    );
  }
  if (centerSpacing > 0 && handleDrop < centerSpacing / 4) {
    advisories.push(
      "This handle is shallow for its attachment spacing and may pull outward against the rim.",
    );
  }
  if (centerSpacing > 0 && handleDrop > centerSpacing * 3) {
    advisories.push(
      "This handle is long and narrow relative to its spacing and may twist more easily.",
    );
  }

  return {
    ...options,
    handleDrop,
    handleWidth,
    handleInset,
    handleAttachmentDepth,
    standingRimWidth: rimWidth,
    centerSpacing,
    outsideEdgeClearance,
    insideGap,
    rawLeftCenter,
    rawRightCenter,
    rawRimY,
    rawAttachmentEndY,
    freeArcLength,
    coreLength,
    webbingCutLength,
    fabricCutLength,
    fabricCutWidth,
    cutLength:
      options.handleMaterial === "webbing"
        ? webbingCutLength
        : fabricCutLength,
    cutWidth:
      options.handleMaterial === "webbing"
        ? handleWidth
        : fabricCutWidth,
    valid: warnings.length === 0,
    warnings,
    advisories,
  };
}

export function handlePlacementInstruction(plan: ToteHandlePlan) {
  return `From each finished front-corner fold, measure ${formatInches(plan.handleInset)} toward the panel center and draw a vertical handle centerline. Center the ${formatInches(plan.handleWidth)}-wide handle on each line from the finished rim down ${formatInches(plan.handleAttachmentDepth)}.`;
}

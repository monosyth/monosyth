export const QUARTER_INCH_SEAM = 0.25;
export const ENCLOSED_SEAM_LOSS = QUARTER_INCH_SEAM * 2;

export type HstMethod = "two" | "four" | "eight";

export type HstPlan = {
  method: HstMethod;
  yieldPerBatch: number;
  batches: number;
  totalYield: number;
  exactStart: number;
  trimFriendlyStart: number;
  trimTo: number;
  biasEdges: boolean;
};

export type FlyingGeesePlan = {
  finishedHeight: number;
  finishedWidth: number;
  trimToHeight: number;
  trimToWidth: number;
  largeSquare: number;
  smallSquares: number;
  yieldPerBatch: 4;
  batches: number;
  totalYield: number;
};

export type BackingPlan = {
  orientation: "vertical" | "horizontal";
  panels: number;
  panelLength: number;
  assembledWidth: number;
  yardage: number;
};

const FRACTIONS: Record<number, string> = {
  1: "⅛",
  2: "¼",
  3: "⅜",
  4: "½",
  5: "⅝",
  6: "¾",
  7: "⅞",
};

export function roundUpTo(value: number, increment = 0.125) {
  return Math.ceil((value - Number.EPSILON) / increment) * increment;
}

export function roundTo(value: number, increment = 0.125) {
  return Math.round(value / increment) * increment;
}

export function formatInches(value: number, denominator = 8) {
  if (!Number.isFinite(value)) return "—";

  const rounded = Math.round(value * denominator) / denominator;
  const sign = rounded < 0 ? "−" : "";
  const absolute = Math.abs(rounded);
  let whole = Math.floor(absolute + 1e-9);
  let numerator = Math.round((absolute - whole) * denominator);

  if (numerator === denominator) {
    whole += 1;
    numerator = 0;
  }

  const eighthNumerator =
    denominator === 8 ? numerator : Math.round((numerator / denominator) * 8);
  const fraction = FRACTIONS[eighthNumerator] ??
    (numerator ? `${numerator}/${denominator}` : "");

  if (!fraction) return `${sign}${whole}″`;
  if (!whole) return `${sign}${fraction}″`;
  return `${sign}${whole} ${fraction}″`;
}

export function formatYards(value: number) {
  return formatInches(value).replace("″", " yd");
}

export function finishedFromCut(cutSize: number) {
  return Math.max(0, cutSize - ENCLOSED_SEAM_LOSS);
}

export function unfinishedFromFinished(finishedSize: number) {
  return finishedSize + ENCLOSED_SEAM_LOSS;
}

export function plainPatchGridFinished(cutSize: number, count: number) {
  return Math.max(0, count) * finishedFromCut(cutSize);
}

export function hstPlan(
  finishedSize: number,
  quantity: number,
  method: HstMethod,
): HstPlan {
  const finished = Math.max(0.5, finishedSize);
  const requested = Math.max(1, Math.ceil(quantity));
  const trimTo = unfinishedFromFinished(finished);

  if (method === "eight") {
    const exactStart = 2 * (finished + 0.875);
    const trimFriendlyStart = roundUpTo(2 * (finished + 1), 0.25);
    const batches = Math.ceil(requested / 8);
    return {
      method,
      yieldPerBatch: 8,
      batches,
      totalYield: batches * 8,
      exactStart,
      trimFriendlyStart,
      trimTo,
      biasEdges: false,
    };
  }

  if (method === "four") {
    // The geometric lower bound is irrational. Round it upward to a cuttable
    // eighth so the displayed benchmark can never fall below the true minimum.
    const exactStart = roundUpTo(Math.SQRT2 * trimTo + 0.5, 0.125);
    const trimFriendlyStart = roundUpTo(
      Math.SQRT2 * (finished + 0.75) + 0.5,
      0.25,
    );
    const batches = Math.ceil(requested / 4);
    return {
      method,
      yieldPerBatch: 4,
      batches,
      totalYield: batches * 4,
      exactStart,
      trimFriendlyStart,
      trimTo,
      biasEdges: true,
    };
  }

  const exactStart = finished + 0.875;
  const trimFriendlyStart = roundUpTo(finished + 1, 0.25);
  const batches = Math.ceil(requested / 2);
  return {
    method,
    yieldPerBatch: 2,
    batches,
    totalYield: batches * 2,
    exactStart,
    trimFriendlyStart,
    trimTo,
    biasEdges: false,
  };
}

export function qstPlan(finishedSize: number, quantity: number) {
  const finished = Math.max(0.5, finishedSize);
  const batches = Math.ceil(Math.max(1, quantity) / 2);
  return {
    yieldPerBatch: 2 as const,
    batches,
    totalYield: batches * 2,
    exactStart: finished + 1.25,
    trimFriendlyStart: roundUpTo(finished + 1.5, 0.25),
    trimTo: unfinishedFromFinished(finished),
  };
}

export function flyingGeesePlan(
  finishedHeight: number,
  quantity: number,
): FlyingGeesePlan {
  const height = Math.max(0.5, finishedHeight);
  const width = height * 2;
  const batches = Math.ceil(Math.max(1, quantity) / 4);

  return {
    finishedHeight: height,
    finishedWidth: width,
    trimToHeight: height + 0.5,
    trimToWidth: width + 0.5,
    largeSquare: width + 1.25,
    smallSquares: height + 0.875,
    yieldPerBatch: 4,
    batches,
    totalYield: batches * 4,
  };
}

export function precutMixPlan(parentCut: number, childCut: number) {
  const countAcross = Math.round(parentCut / childCut);
  const parentFinished = finishedFromCut(parentCut);
  const childGridFinished = plainPatchGridFinished(childCut, countAcross);
  const internalSeams = Math.max(0, countAcross - 1);
  const sashingFinished = internalSeams
    ? (parentFinished - childGridFinished) / internalSeams
    : 0;

  return {
    countAcross,
    piecesPerParent: countAcross * countAcross,
    parentFinished,
    childGridFinished,
    difference: parentFinished - childGridFinished,
    sashingFinished,
    sashingCut: sashingFinished + ENCLOSED_SEAM_LOSS,
    trimParentCut: childGridFinished + ENCLOSED_SEAM_LOSS,
  };
}

export function quiltGridPlan({
  targetWidth,
  targetHeight,
  blockFinished,
  sashingFinished,
  borderFinished,
  fit = "over",
}: {
  targetWidth: number;
  targetHeight: number;
  blockFinished: number;
  sashingFinished: number;
  borderFinished: number;
  fit?: "under" | "over";
}) {
  const block = Math.max(0.5, blockFinished);
  const sashing = Math.max(0, sashingFinished);
  const border = Math.max(0, borderFinished);

  const solveCount = (target: number) => {
    const count =
      (Math.max(0, target - border * 2) + sashing) / (block + sashing);
    return Math.max(1, fit === "under" ? Math.floor(count) : Math.ceil(count));
  };

  const columns = solveCount(targetWidth);
  const rows = solveCount(targetHeight);
  const actualWidth =
    columns * block + Math.max(0, columns - 1) * sashing + border * 2;
  const actualHeight =
    rows * block + Math.max(0, rows - 1) * sashing + border * 2;

  return {
    columns,
    rows,
    blocks: columns * rows,
    actualWidth,
    actualHeight,
    overWidth: actualWidth - targetWidth,
    overHeight: actualHeight - targetHeight,
  };
}

export type FusibleGridPlan = {
  cutSquare: number;
  finishedCell: number;
  columns: number;
  rows: number;
  squares: number;
  layoutWidth: number;
  layoutLength: number;
  centerRawWidth: number;
  centerRawLength: number;
  centerFinishedWidth: number;
  centerFinishedLength: number;
  runnerFinishedWidth: number;
  runnerFinishedLength: number;
  targetRunnerLength: number;
  packs: number;
  spareSquares: number;
  firstDirectionSeams: number;
  secondDirectionSeams: number;
};

/**
 * Plans a straight-set fusible-grid panel made from equal squares.
 * The fused layout uses the full cut-square footprint. Every internal seam
 * consumes 1/2 inch; the outer 1/4-inch allowances remain until the center is
 * enclosed by borders or binding.
 */
export function fusibleGridPlan({
  tableLength,
  runnerWidth,
  endDrop,
  cutSquare,
  borderFinished,
  packCount,
}: {
  tableLength: number;
  runnerWidth: number;
  endDrop: number;
  cutSquare: number;
  borderFinished: number;
  packCount: number;
}): FusibleGridPlan {
  const table = Math.max(1, tableLength);
  const width = Math.max(1, runnerWidth);
  const drop = Math.max(0, endDrop);
  const square = Math.max(1, cutSquare);
  const border = Math.max(0, borderFinished);
  const bundle = Math.max(1, Math.ceil(packCount));
  const finishedCell = finishedFromCut(square);
  const targetRunnerLength = table + drop * 2;
  const targetCenterWidth = Math.max(finishedCell, width - border * 2);
  const targetCenterLength = Math.max(
    finishedCell,
    targetRunnerLength - border * 2,
  );
  const columns = Math.max(1, Math.ceil(targetCenterWidth / finishedCell));
  const rows = Math.max(1, Math.ceil(targetCenterLength / finishedCell));
  const centerFinishedWidth = columns * finishedCell;
  const centerFinishedLength = rows * finishedCell;
  const squares = columns * rows;
  const packs = Math.ceil(squares / bundle);

  return {
    cutSquare: square,
    finishedCell,
    columns,
    rows,
    squares,
    layoutWidth: columns * square,
    layoutLength: rows * square,
    centerRawWidth: centerFinishedWidth + ENCLOSED_SEAM_LOSS,
    centerRawLength: centerFinishedLength + ENCLOSED_SEAM_LOSS,
    centerFinishedWidth,
    centerFinishedLength,
    runnerFinishedWidth: centerFinishedWidth + border * 2,
    runnerFinishedLength: centerFinishedLength + border * 2,
    targetRunnerLength,
    packs,
    spareSquares: packs * bundle - squares,
    firstDirectionSeams: Math.max(0, columns - 1),
    secondDirectionSeams: Math.max(0, rows - 1),
  };
}

function requiredPanels(span: number, usableWidth: number, seamAllowance: number) {
  const netPanelWidth = usableWidth - seamAllowance * 2;
  return Math.max(
    1,
    Math.ceil((span - seamAllowance * 2) / netPanelWidth),
  );
}

function backingOption({
  orientation,
  span,
  panelLength,
  usableWidth,
  seamAllowance,
}: {
  orientation: BackingPlan["orientation"];
  span: number;
  panelLength: number;
  usableWidth: number;
  seamAllowance: number;
}): BackingPlan {
  const panels = requiredPanels(span, usableWidth, seamAllowance);
  const assembledWidth =
    panels * usableWidth - Math.max(0, panels - 1) * seamAllowance * 2;
  return {
    orientation,
    panels,
    panelLength,
    assembledWidth,
    yardage: roundUpTo((panels * panelLength) / 36, 0.125),
  };
}

export function backingPlans({
  quiltWidth,
  quiltHeight,
  usableWidth = 40,
  marginEachSide = 4,
  seamAllowance = 0.5,
}: {
  quiltWidth: number;
  quiltHeight: number;
  usableWidth?: number;
  marginEachSide?: number;
  seamAllowance?: number;
}) {
  const safeSeamAllowance = Math.max(0, seamAllowance);
  const safeUsableWidth = Math.max(
    safeSeamAllowance * 2 + 0.125,
    usableWidth,
  );
  const requiredWidth = quiltWidth + marginEachSide * 2;
  const requiredHeight = quiltHeight + marginEachSide * 2;
  const vertical = backingOption({
    orientation: "vertical",
    span: requiredWidth,
    panelLength: requiredHeight,
    usableWidth: safeUsableWidth,
    seamAllowance: safeSeamAllowance,
  });
  const horizontal = backingOption({
    orientation: "horizontal",
    span: requiredHeight,
    panelLength: requiredWidth,
    usableWidth: safeUsableWidth,
    seamAllowance: safeSeamAllowance,
  });

  return {
    requiredWidth,
    requiredHeight,
    vertical,
    horizontal,
    recommended: vertical.yardage <= horizontal.yardage ? vertical : horizontal,
  };
}

export function bindingPlan({
  quiltWidth,
  quiltHeight,
  stripWidth = 2.5,
  usableWidth = 40,
  overage = 20,
}: {
  quiltWidth: number;
  quiltHeight: number;
  stripWidth?: number;
  usableWidth?: number;
  overage?: number;
}) {
  const totalLength = quiltWidth * 2 + quiltHeight * 2 + overage;
  const safeStripWidth = Math.max(0.125, stripWidth);
  const safeUsableWidth = Math.max(safeStripWidth + 0.125, usableWidth);
  // A diagonal join consumes approximately one strip width of length. Solve
  // against the joined yield instead of dividing by full WOF and hoping the
  // general overage also covers every join.
  const effectiveLengthAfterJoin = safeUsableWidth - safeStripWidth;
  const strips = Math.max(
    1,
    Math.ceil((totalLength - safeStripWidth) / effectiveLengthAfterJoin),
  );
  const joinedYield =
    strips * safeUsableWidth - Math.max(0, strips - 1) * safeStripWidth;
  const inchesOfYardage = strips * safeStripWidth;
  return {
    totalLength,
    joinedYield,
    strips,
    stripWidth: safeStripWidth,
    yardage: roundUpTo(inchesOfYardage / 36, 0.125),
  };
}

export function yardageForPieces({
  pieceWidth,
  pieceHeight,
  quantity,
  usableWidth = 40,
}: {
  pieceWidth: number;
  pieceHeight: number;
  quantity: number;
  usableWidth?: number;
}) {
  const across = Math.max(1, Math.floor(usableWidth / pieceWidth));
  const rows = Math.ceil(quantity / across);
  const inches = rows * pieceHeight;
  return {
    across,
    rows,
    inches,
    yardage: roundUpTo(inches / 36, 0.125),
  };
}

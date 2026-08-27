export type BagClosure =
  | "open-tote"
  | "top-zipper"
  | "side-zipper"
  | "zipper-gusset"
  | "recessed-zipper";

export type BagBodyRecipe = "two-panel-tote" | "four-corner-boxy";

export type BagPatternDraft = {
  cutWidth: number;
  cutHeight: number;
  cornerCut: number;
  seamAllowance: number;
  topTakeUp: number;
  leftTopInset: number;
  rightTopInset: number;
  fabricWidth: number;
};

export type FinishedBagSize = {
  baseWidth: number;
  height: number;
  depth: number;
};

export type BagPatternPlan = BagPatternDraft & {
  finishedDepth: number;
  finishedBaseWidth: number;
  finishedHeight: number;
  finishedFlatWidth: number;
  finishedTopOpening: number;
  topCutWidth: number;
  boundingCutWidth: number;
  leftTopAngle: number;
  rightTopAngle: number;
  volumeCubicInches: number;
  valid: boolean;
  warnings: string[];
};

export type FabricLayout = {
  fabricWidth: number;
  usableWidth: number;
  pieceWidth: number;
  pieceHeight: number;
  piecesAcross: 0 | 1 | 2;
  rows: number;
  lengthInches: number;
  buyYards: number;
  fits: boolean;
};

export type FatQuarterPieceLayout = {
  usableWidth: number;
  usableLength: number;
  pieceWidth: number;
  pieceHeight: number;
  quantity: number;
  piecesAcross: number;
  rows: number;
  piecesPerFatQuarter: number;
  fatQuartersNeeded: number;
  rotated: boolean;
  clearanceWidth: number;
  clearanceLength: number;
  fits: boolean;
};

export type PatternPoint = {
  x: number;
  y: number;
};

export type PanelStitchGeometry = {
  topLeft: PatternPoint;
  topRight: PatternPoint;
  leftSideBottom: PatternPoint;
  rightSideBottom: PatternPoint;
  bottomLeft: PatternPoint;
  bottomRight: PatternPoint;
  boxLineY: number;
  leftBoxLineX: number;
  rightBoxLineX: number;
};

const EPSILON = 0.0001;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function snapMeasurement(value: number, step: number) {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

function topInteriorAngle(inset: number, verticalRun: number) {
  const run = Math.max(verticalRun, EPSILON);
  const radians = Math.acos(
    clamp(-inset / Math.hypot(inset, run), -1, 1),
  );
  return (radians * 180) / Math.PI;
}

function topStitchIntersection(
  side: "left" | "right",
  inset: number,
  cutWidth: number,
  verticalRun: number,
  sideAllowance: number,
  topTakeUp: number,
) {
  const run = Math.max(verticalRun, EPSILON);
  const length = Math.hypot(inset, run);
  const normalX = (run / length) * sideAllowance * (side === "left" ? 1 : -1);
  const normalY = (inset / length) * sideAllowance;
  const topX = side === "left" ? inset : cutWidth - inset;
  const horizontalTravel = side === "left" ? -inset : inset;
  const progress = (topTakeUp - normalY) / run;
  return topX + normalX + progress * horizontalTravel;
}

function offsetSideLine(
  side: "left" | "right",
  inset: number,
  cutWidth: number,
  verticalRun: number,
  allowance: number,
) {
  const start = {
    x: side === "left" ? inset : cutWidth - inset,
    y: 0,
  };
  const end = {
    x: side === "left" ? 0 : cutWidth,
    y: verticalRun,
  };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(Math.hypot(dx, dy), EPSILON);
  const direction = side === "left" ? 1 : -1;
  const normal = {
    x: (dy / length) * allowance * direction,
    y: (-dx / length) * allowance * direction,
  };
  return {
    start: { x: start.x + normal.x, y: start.y + normal.y },
    end: { x: end.x + normal.x, y: end.y + normal.y },
  };
}

function pointOnLineAtY(
  line: { start: PatternPoint; end: PatternPoint },
  y: number,
) {
  const run = line.end.y - line.start.y;
  const progress = Math.abs(run) < EPSILON ? 0 : (y - line.start.y) / run;
  return {
    x: line.start.x + (line.end.x - line.start.x) * progress,
    y,
  };
}

export function calculatePanelStitchGeometry(
  plan: BagPatternPlan,
): PanelStitchGeometry {
  const verticalRun = plan.cutHeight - plan.cornerCut;
  const boxLineY = verticalRun - plan.seamAllowance;
  const leftBoxLineX = plan.cornerCut + plan.seamAllowance;
  const rightBoxLineX =
    plan.cutWidth - plan.cornerCut - plan.seamAllowance;
  const leftLine = offsetSideLine(
    "left",
    plan.leftTopInset,
    plan.cutWidth,
    verticalRun,
    plan.seamAllowance,
  );
  const rightLine = offsetSideLine(
    "right",
    plan.rightTopInset,
    plan.cutWidth,
    verticalRun,
    plan.seamAllowance,
  );

  return {
    topLeft: pointOnLineAtY(leftLine, plan.topTakeUp),
    topRight: pointOnLineAtY(rightLine, plan.topTakeUp),
    leftSideBottom: pointOnLineAtY(leftLine, boxLineY),
    rightSideBottom: pointOnLineAtY(rightLine, boxLineY),
    bottomLeft: {
      x: leftBoxLineX,
      y: plan.cutHeight - plan.seamAllowance,
    },
    bottomRight: {
      x: rightBoxLineX,
      y: plan.cutHeight - plan.seamAllowance,
    },
    boxLineY,
    leftBoxLineX,
    rightBoxLineX,
  };
}

/**
 * Standard two-panel, cut-out boxed-corner geometry.
 *
 * The corner square is measured from the raw side and bottom edges. When the
 * side, bottom, and box-corner seam allowances match, those allowances cancel
 * through the folded geometry, so the finished depth is exactly 2 × cornerCut.
 */
export function calculateBagPatternPlan(
  draft: BagPatternDraft,
): BagPatternPlan {
  const finishedDepth = Math.max(0, draft.cornerCut * 2);
  const finishedFlatWidth = Math.max(
    0,
    draft.cutWidth - draft.seamAllowance * 2,
  );
  const finishedBaseWidth = Math.max(
    0,
    finishedFlatWidth - finishedDepth,
  );
  const finishedHeight = Math.max(
    0,
    draft.cutHeight -
      draft.cornerCut -
      draft.seamAllowance -
      draft.topTakeUp,
  );
  const topCutWidth = Math.max(
    0,
    draft.cutWidth - draft.leftTopInset - draft.rightTopInset,
  );
  const verticalRun = Math.max(0, draft.cutHeight - draft.cornerCut);
  const topStitchLeft = topStitchIntersection(
    "left",
    draft.leftTopInset,
    draft.cutWidth,
    verticalRun,
    draft.seamAllowance,
    draft.topTakeUp,
  );
  const topStitchRight = topStitchIntersection(
    "right",
    draft.rightTopInset,
    draft.cutWidth,
    verticalRun,
    draft.seamAllowance,
    draft.topTakeUp,
  );
  const finishedTopOpening = Math.max(0, topStitchRight - topStitchLeft);
  const topLeft = draft.leftTopInset;
  const topRight = draft.cutWidth - draft.rightTopInset;
  const boundingCutWidth =
    Math.max(draft.cutWidth, topRight) - Math.min(0, topLeft);
  const warnings: string[] = [];

  if (draft.seamAllowance <= 0) {
    warnings.push("Choose a seam allowance greater than zero.");
  }
  if (draft.cornerCut <= 0) {
    warnings.push("The corner square must be greater than zero.");
  }
  if (finishedBaseWidth <= 0) {
    warnings.push("The corner squares consume the entire bag base.");
  }
  if (finishedHeight <= 0) {
    warnings.push("The panel is too short for this corner and top finish.");
  }
  if (finishedTopOpening <= 0) {
    warnings.push("The top shaping leaves no usable opening.");
  }
  if (draft.cornerCut * 2 >= draft.cutHeight) {
    warnings.push("The corner square is too large for the panel height.");
  }

  return {
    ...draft,
    finishedDepth,
    finishedBaseWidth,
    finishedHeight,
    finishedFlatWidth,
    finishedTopOpening,
    topCutWidth,
    boundingCutWidth,
    leftTopAngle: topInteriorAngle(draft.leftTopInset, verticalRun),
    rightTopAngle: topInteriorAngle(draft.rightTopInset, verticalRun),
    volumeCubicInches:
      finishedBaseWidth * finishedDepth * finishedHeight,
    valid: warnings.length === 0,
    warnings,
  };
}

export function draftFromFinishedSize({
  baseWidth,
  height,
  depth,
  seamAllowance,
  topTakeUp = seamAllowance,
  leftTopInset = 0,
  rightTopInset = 0,
  fabricWidth = 44,
}: FinishedBagSize & {
  seamAllowance: number;
  topTakeUp?: number;
  leftTopInset?: number;
  rightTopInset?: number;
  fabricWidth?: number;
}): BagPatternDraft {
  const cornerCut = depth / 2;

  return {
    cutWidth: baseWidth + depth + seamAllowance * 2,
    cutHeight:
      height + cornerCut + seamAllowance + topTakeUp,
    cornerCut,
    seamAllowance,
    topTakeUp,
    leftTopInset,
    rightTopInset,
    fabricWidth,
  };
}

export function calculateBodyFabricLayout(
  plan: BagPatternPlan,
): FabricLayout {
  const selvageReserve = 2;
  const usableWidth = Math.max(0, plan.fabricWidth - selvageReserve);
  const pieceWidth = plan.boundingCutWidth;
  const pieceHeight = plan.cutHeight;
  const gap = 0.5;
  const edgeReserve = 1;

  if (pieceWidth > usableWidth) {
    return {
      fabricWidth: plan.fabricWidth,
      usableWidth,
      pieceWidth,
      pieceHeight,
      piecesAcross: 0,
      rows: 0,
      lengthInches: 0,
      buyYards: 0,
      fits: false,
    };
  }

  const piecesAcross =
    pieceWidth * 2 + gap <= usableWidth ? (2 as const) : (1 as const);
  const rows = piecesAcross === 2 ? 1 : 2;
  const lengthInches = rows * pieceHeight + (rows - 1) * gap + edgeReserve;
  const buyYards = Math.ceil(lengthInches / 4.5) / 8;

  return {
    fabricWidth: plan.fabricWidth,
    usableWidth,
    pieceWidth,
    pieceHeight,
    piecesAcross,
    rows,
    lengthInches,
    buyYards,
    fits: true,
  };
}

export function calculateFatQuarterPieceLayout({
  usableWidth,
  usableLength,
  pieceWidth,
  pieceHeight,
  quantity,
  allowRotation = false,
}: {
  usableWidth: number;
  usableLength: number;
  pieceWidth: number;
  pieceHeight: number;
  quantity: number;
  allowRotation?: boolean;
}): FatQuarterPieceLayout {
  const safeUsableWidth = Number.isFinite(usableWidth)
    ? Math.max(0, usableWidth)
    : 0;
  const safeUsableLength = Number.isFinite(usableLength)
    ? Math.max(0, usableLength)
    : 0;
  const safePieceWidth = Number.isFinite(pieceWidth)
    ? Math.max(0, pieceWidth)
    : 0;
  const safePieceHeight = Number.isFinite(pieceHeight)
    ? Math.max(0, pieceHeight)
    : 0;
  const safeQuantity = Number.isFinite(quantity)
    ? Math.max(0, Math.ceil(quantity))
    : 0;

  const orientation = (rotated: boolean) => {
    const width = rotated ? safePieceHeight : safePieceWidth;
    const height = rotated ? safePieceWidth : safePieceHeight;
    const piecesAcross = width > 0
      ? Math.floor((safeUsableWidth + EPSILON) / width)
      : 0;
    const rows = height > 0
      ? Math.floor((safeUsableLength + EPSILON) / height)
      : 0;
    return {
      rotated,
      width,
      height,
      piecesAcross,
      rows,
      capacity: piecesAcross * rows,
    };
  };

  const upright = orientation(false);
  const sideways = allowRotation ? orientation(true) : null;
  const chosen = sideways && sideways.capacity > upright.capacity
    ? sideways
    : upright;
  const fits = safeQuantity === 0 || chosen.capacity > 0;
  const fatQuartersNeeded = fits && safeQuantity > 0
    ? Math.ceil(safeQuantity / chosen.capacity)
    : 0;

  return {
    usableWidth: safeUsableWidth,
    usableLength: safeUsableLength,
    pieceWidth: safePieceWidth,
    pieceHeight: safePieceHeight,
    quantity: safeQuantity,
    piecesAcross: chosen.piecesAcross,
    rows: chosen.rows,
    piecesPerFatQuarter: chosen.capacity,
    fatQuartersNeeded,
    rotated: chosen.rotated,
    clearanceWidth: fits
      ? Math.max(0, safeUsableWidth - chosen.piecesAcross * chosen.width)
      : 0,
    clearanceLength: fits
      ? Math.max(0, safeUsableLength - chosen.rows * chosen.height)
      : 0,
    fits,
  };
}

export function formatDecimal(value: number, places = 2) {
  return Number(value.toFixed(places)).toString();
}

export function formatInches(value: number, denominator = 16) {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  const rounded = Math.round(Math.abs(value) * denominator);
  const whole = Math.floor(rounded / denominator);
  let numerator = rounded % denominator;

  if (numerator === 0) return `${sign}${whole}″`;

  let divisor = 1;
  for (let candidate = numerator; candidate > 1; candidate -= 1) {
    if (numerator % candidate === 0 && denominator % candidate === 0) {
      divisor = candidate;
      break;
    }
  }

  numerator /= divisor;
  const reducedDenominator = denominator / divisor;
  const fraction = `${numerator}/${reducedDenominator}`;
  return whole > 0
    ? `${sign}${whole} ${fraction}″`
    : `${sign}${fraction}″`;
}

export function formatYards(value: number) {
  const eighths = Math.round(value * 8);
  const whole = Math.floor(eighths / 8);
  const remainder = eighths % 8;

  if (remainder === 0) return `${whole} yd`;
  const labels: Record<number, string> = {
    1: "⅛",
    2: "¼",
    3: "⅜",
    4: "½",
    5: "⅝",
    6: "¾",
    7: "⅞",
  };
  return whole > 0
    ? `${whole} ${labels[remainder]} yd`
    : `${labels[remainder]} yd`;
}

export type PocketPlan = {
  style: "none" | "single-slip" | "divided-slip";
  finishedWidth: number;
  finishedHeight: number;
  cutWidth: number;
  cutHeight: number;
  valid: boolean;
  notes: string[];
};

export function calculatePocketPlan(
  plan: BagPatternPlan,
  style: "none" | "single-slip" | "divided-slip",
): PocketPlan {
  if (style === "none") {
    return {
      style: "none",
      finishedWidth: 0,
      finishedHeight: 0,
      cutWidth: 0,
      cutHeight: 0,
      valid: true,
      notes: [],
    };
  }

  const availableWidth = Math.max(0, plan.finishedBaseWidth);
  const availableHeight = Math.max(0, plan.finishedHeight);
  const targetFinishedWidth = snapMeasurement(
    clamp(availableWidth * 0.72, 4, Math.max(4, availableWidth - 2)),
    0.25,
  );
  const targetFinishedHeight = snapMeasurement(
    clamp(availableHeight * 0.52, 3.5, Math.max(3.5, availableHeight - 2)),
    0.25,
  );
  // Double-fold top hem (1/2" + 1/2" = 1") + 1/2" bottom turn-under
  const cutHeight = targetFinishedHeight + 1.5;
  // 1/2" side turn-under at each side = 1"
  const cutWidth = targetFinishedWidth + 1.0;
  const notes: string[] = [];

  if (targetFinishedWidth < 4 || targetFinishedHeight < 3) {
    notes.push("Compact pocket proportion sized for this bag.");
  }
  if (style === "divided-slip") {
    notes.push(
      `Sew a vertical stitch line down the center to create two ${formatInches(targetFinishedWidth / 2)} slots.`,
    );
  }

  return {
    style,
    finishedWidth: targetFinishedWidth,
    finishedHeight: targetFinishedHeight,
    cutWidth,
    cutHeight,
    valid: targetFinishedWidth > 0 && targetFinishedHeight > 0,
    notes,
  };
}

export type InterfacingPlan = {
  structure: "draped" | "woven-interfaced" | "fleece-padded" | "foam-standing";
  materialName: string;
  recommendation: string;
  bulkRelief: boolean;
  cutWidth: number;
  cutHeight: number;
  quantity: number;
};

export function calculateInterfacingPlan(
  plan: BagPatternPlan,
  structure: "draped" | "woven-interfaced" | "fleece-padded" | "foam-standing",
): InterfacingPlan {
  switch (structure) {
    case "draped":
      return {
        structure: "draped",
        materialName: "Uninterfaced / Self-fabric drape",
        recommendation: "Best for slouchy market totes, lightweight linen bags, or packable pouches.",
        bulkRelief: false,
        cutWidth: 0,
        cutHeight: 0,
        quantity: 0,
      };
    case "woven-interfaced":
      return {
        structure: "woven-interfaced",
        materialName: "Fusible woven interfacing (e.g. Pellon SF101)",
        recommendation: "Adds body and a smooth, wrinkle-resistant finish to cotton or linen without stiffness.",
        bulkRelief: false,
        cutWidth: plan.boundingCutWidth,
        cutHeight: plan.cutHeight,
        quantity: 2,
      };
    case "fleece-padded":
      return {
        structure: "fleece-padded",
        materialName: "Fusible fleece (e.g. Pellon 987F)",
        recommendation: "Adds soft padded structure and pillowy hand-feel; trimmed 1/2″ inside outer edges to keep seam allowances flat.",
        bulkRelief: true,
        cutWidth: Math.max(0, plan.boundingCutWidth - 1),
        cutHeight: Math.max(0, plan.cutHeight - 1),
        quantity: 2,
      };
    case "foam-standing":
      return {
        structure: "foam-standing",
        materialName: "Sew-in foam stabilizer (e.g. ByAnnie Soft and Stable)",
        recommendation: "Provides lightweight 3D stand-up structure that retains its shape even when empty; trimmed 1/2″ inside edges.",
        bulkRelief: true,
        cutWidth: Math.max(0, plan.boundingCutWidth - 1),
        cutHeight: Math.max(0, plan.cutHeight - 1),
        quantity: 2,
      };
  }
}

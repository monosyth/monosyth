import {
  formatInches,
  type BagPatternPlan,
} from "@/lib/sewing/bag-pattern";

export type OuterPiecingMode =
  | "solid"
  | "vertical-strips"
  | "horizontal-strips"
  | "block-grid";

export type OuterPanelScope = "both" | "front" | "back";
export type BlockSizeBasis = "cut" | "finished";

export type OuterPanelDesign = {
  mode: OuterPiecingMode;
  scope: OuterPanelScope;
  rows: number;
  columns: number;
  blockSize: number;
  blockSizeBasis: BlockSizeBasis;
  piecingAllowance: number;
  trimMargin: number;
  contrastEnabled: boolean;
  contrastRise: number;
};

export type CompositionCutPiece = {
  material: "outer" | "contrast";
  name: string;
  quantity: number;
  width: number;
  height: number;
  note: string;
};

export type OuterPanelComposition = {
  design: OuterPanelDesign;
  modeLabel: string;
  scopeLabel: string;
  targetWidth: number;
  targetHeight: number;
  upperCutHeight: number;
  contrastCutHeight: number;
  contrastJoinY: number | null;
  requiredPiecedWidth: number;
  requiredPiecedHeight: number;
  sewnWidth: number;
  sewnHeight: number;
  trimWidth: number;
  trimHeight: number;
  blockCutSize: number;
  blockFinishedSize: number;
  columnSeams: number[];
  rowSeams: number[];
  piecedPanelCount: number;
  solidPanelCount: number;
  cutPieces: CompositionCutPiece[];
  instructions: string[];
  warnings: string[];
  valid: boolean;
};

export const defaultOuterPanelDesign: OuterPanelDesign = {
  mode: "solid",
  scope: "both",
  rows: 4,
  columns: 5,
  blockSize: 5,
  blockSizeBasis: "cut",
  piecingAllowance: 0.25,
  trimMargin: 0.25,
  contrastEnabled: false,
  contrastRise: 3,
};

const modeLabels: Record<OuterPiecingMode, string> = {
  solid: "Solid panels",
  "vertical-strips": "Vertical strips",
  "horizontal-strips": "Horizontal strips",
  "block-grid": "Square-block grid",
};

const scopeLabels: Record<OuterPanelScope, string> = {
  both: "front + back",
  front: "front only",
  back: "back only",
};

const MAX_PIECE_COUNT = 24;

function positiveCount(value: number) {
  return Math.min(
    MAX_PIECE_COUNT,
    Math.max(1, Math.round(Number.isFinite(value) ? value : 1)),
  );
}

function addCutPiece(
  pieces: CompositionCutPiece[],
  piece: CompositionCutPiece,
) {
  if (piece.quantity > 0 && piece.width > 0 && piece.height > 0) {
    pieces.push(piece);
  }
}

export function calculateOuterPanelComposition(
  plan: BagPatternPlan,
  design: OuterPanelDesign,
): OuterPanelComposition {
  const rows = positiveCount(design.rows);
  const columns = positiveCount(design.columns);
  const piecingAllowance = Math.max(0, design.piecingAllowance);
  const trimMargin = design.mode === "solid"
    ? 0
    : Math.max(0, design.trimMargin);
  const targetWidth = plan.boundingCutWidth;
  const targetHeight = plan.cutHeight;
  const piecedPanelCount = design.mode === "solid"
    ? 0
    : design.scope === "both"
      ? 2
      : 1;
  const solidPanelCount = 2 - piecedPanelCount;
  const warnings: string[] = [];
  const cutPieces: CompositionCutPiece[] = [];
  const instructions: string[] = [];

  let contrastJoinY: number | null = null;
  let contrastCutHeight = 0;
  let upperCutHeight = targetHeight;

  if (design.contrastEnabled) {
    contrastJoinY =
      targetHeight -
      (design.contrastRise + plan.cornerCut + plan.seamAllowance);
    contrastCutHeight =
      design.contrastRise +
      plan.cornerCut +
      plan.seamAllowance +
      piecingAllowance;
    upperCutHeight = contrastJoinY + piecingAllowance;

    if (design.contrastRise < Math.max(0.5, piecingAllowance * 2)) {
      warnings.push(
        `Raise the contrast section to at least ${formatInches(Math.max(0.5, piecingAllowance * 2))} so the finished band is practical to sew.`,
      );
    }
    if (design.contrastRise >= plan.finishedHeight) {
      warnings.push(
        "The contrast rise must be shorter than the finished standing height.",
      );
    }
    if (upperCutHeight <= piecingAllowance * 2) {
      warnings.push("The contrast section leaves too little upper panel to sew.");
    }
  }

  const requiredPiecedWidth = targetWidth + trimMargin * 2;
  const requiredPiecedHeight = upperCutHeight + trimMargin * 2;
  let sewnWidth = requiredPiecedWidth;
  let sewnHeight = requiredPiecedHeight;
  let blockCutSize = Math.max(0, design.blockSize);
  let blockFinishedSize = Math.max(0, blockCutSize - piecingAllowance * 2);
  let columnSeams: number[] = [];
  let rowSeams: number[] = [];

  if (design.mode !== "solid" && piecingAllowance <= 0) {
    warnings.push("Choose a piecing allowance greater than zero.");
  }

  if (design.mode === "vertical-strips") {
    if (columns < 2) {
      warnings.push("Use at least two columns for a vertical-strip panel.");
    }

    const visibleStripWidth = targetWidth / columns;
    const edgeWidth = visibleStripWidth + piecingAllowance + trimMargin;
    const centerWidth = visibleStripWidth + piecingAllowance * 2;
    columnSeams = Array.from(
      { length: Math.max(0, columns - 1) },
      (_, index) => (targetWidth * (index + 1)) / columns,
    );

    addCutPiece(cutPieces, {
      material: "outer",
      name: "Outer edge strip",
      quantity: piecedPanelCount * Math.min(columns, 2),
      width: edgeWidth,
      height: requiredPiecedHeight,
      note: `Two edge strips per pieced face; the outer edge includes ${formatInches(trimMargin)} trim margin.`,
    });
    addCutPiece(cutPieces, {
      material: "outer",
      name: "Outer center strip",
      quantity: piecedPanelCount * Math.max(0, columns - 2),
      width: centerWidth,
      height: requiredPiecedHeight,
      note: `${formatInches(piecingAllowance)} piecing allowance is included on both long edges.`,
    });
    instructions.push(
      `Join ${columns} vertical strips for each selected face with ${formatInches(piecingAllowance)} seams.`,
    );
  }

  if (design.mode === "horizontal-strips") {
    if (rows < 2) {
      warnings.push("Use at least two rows for a horizontal-strip panel.");
    }

    const visibleStripHeight = upperCutHeight / rows;
    const edgeHeight = visibleStripHeight + piecingAllowance + trimMargin;
    const centerHeight = visibleStripHeight + piecingAllowance * 2;
    rowSeams = Array.from(
      { length: Math.max(0, rows - 1) },
      (_, index) => (upperCutHeight * (index + 1)) / rows,
    ).filter((seam) => seam < (contrastJoinY ?? targetHeight) - 0.001);

    addCutPiece(cutPieces, {
      material: "outer",
      name: "Outer top / bottom strip",
      quantity: piecedPanelCount * Math.min(rows, 2),
      width: requiredPiecedWidth,
      height: edgeHeight,
      note: `Two edge strips per pieced face; the outside edge includes ${formatInches(trimMargin)} trim margin.`,
    });
    addCutPiece(cutPieces, {
      material: "outer",
      name: "Outer center strip",
      quantity: piecedPanelCount * Math.max(0, rows - 2),
      width: requiredPiecedWidth,
      height: centerHeight,
      note: `${formatInches(piecingAllowance)} piecing allowance is included on both long edges.`,
    });
    instructions.push(
      `Join ${rows} horizontal strips for each selected face with ${formatInches(piecingAllowance)} seams.`,
    );
  }

  if (design.mode === "block-grid") {
    blockCutSize = design.blockSizeBasis === "finished"
      ? Math.max(0, design.blockSize) + piecingAllowance * 2
      : Math.max(0, design.blockSize);
    blockFinishedSize = Math.max(0, blockCutSize - piecingAllowance * 2);
    sewnWidth = columns * blockCutSize - piecingAllowance * 2 * (columns - 1);
    sewnHeight = rows * blockCutSize - piecingAllowance * 2 * (rows - 1);
    const cropLeft = (sewnWidth - targetWidth) / 2;
    const cropTop = (sewnHeight - upperCutHeight) / 2;
    columnSeams = Array.from(
      { length: Math.max(0, columns - 1) },
      (_, index) =>
        piecingAllowance +
        (index + 1) * blockFinishedSize -
        cropLeft,
    ).filter((seam) => seam > 0.001 && seam < targetWidth - 0.001);
    rowSeams = Array.from(
      { length: Math.max(0, rows - 1) },
      (_, index) =>
        piecingAllowance +
        (index + 1) * blockFinishedSize -
        cropTop,
    ).filter(
      (seam) =>
        seam > 0.001 &&
        seam < (contrastJoinY ?? targetHeight) - 0.001,
    );

    if (blockFinishedSize <= 0) {
      warnings.push(
        "The block size must be larger than twice the piecing allowance.",
      );
    }
    if (sewnWidth + 0.001 < requiredPiecedWidth) {
      warnings.push(
        `The block grid is ${formatInches(requiredPiecedWidth - sewnWidth)} too narrow. Add columns or use larger squares.`,
      );
    }
    if (sewnHeight + 0.001 < requiredPiecedHeight) {
      warnings.push(
        `The block grid is ${formatInches(requiredPiecedHeight - sewnHeight)} too short. Add rows or use larger squares.`,
      );
    }

    addCutPiece(cutPieces, {
      material: "outer",
      name: "Patchwork square",
      quantity: piecedPanelCount * rows * columns,
      width: blockCutSize,
      height: blockCutSize,
      note: `${rows} rows × ${columns} columns per selected face; each square finishes ${formatInches(blockFinishedSize)} in the grid.`,
    });
    instructions.push(
      `Arrange ${rows} labeled rows × ${columns} columns for each selected face. Join squares into rows, then join the rows with ${formatInches(piecingAllowance)} seams.`,
    );
  }

  if (design.mode === "solid") {
    addCutPiece(cutPieces, {
      material: "outer",
      name: design.contrastEnabled ? "Upper outer panel" : "Main body panel",
      quantity: 2,
      width: targetWidth,
      height: upperCutHeight,
      note: design.contrastEnabled
        ? "Join the contrast band before transferring shaping and corner marks."
        : "Transfer the body outline and boxed-corner marks to both panels.",
    });
  } else if (solidPanelCount > 0) {
    addCutPiece(cutPieces, {
      material: "outer",
      name: "Solid upper outer panel",
      quantity: solidPanelCount,
      width: targetWidth,
      height: upperCutHeight,
      note: `${scopeLabels[design.scope]} is pieced; this is the remaining solid face.`,
    });
  }

  if (design.mode !== "solid") {
    instructions.push(
      `Press the assembly seams, then center-trim each pieced slab to ${formatInches(targetWidth)} × ${formatInches(upperCutHeight)}.`,
    );
  }

  if (design.contrastEnabled) {
    addCutPiece(cutPieces, {
      material: "contrast",
      name: "Contrast bottom band",
      quantity: 2,
      width: targetWidth,
      height: contrastCutHeight,
      note: `Creates ${formatInches(design.contrastRise)} visible contrast above the finished base and wraps under the boxed bottom.`,
    });
    instructions.push(
      `Join one contrast band to each upper panel with a ${formatInches(piecingAllowance)} seam; press toward the contrast fabric.`,
      `Verify each joined outer panel measures ${formatInches(targetWidth)} × ${formatInches(targetHeight)} before shaping.`,
    );
  }

  instructions.push(
    "Apply interfacing or quilt the assembled outer panels, then square them again before using the body template.",
    "Transfer the side shaping and cut the boxed corner squares last, after all piecing and final trimming.",
  );

  return {
    design: {
      ...design,
      rows,
      columns,
      piecingAllowance,
      trimMargin,
    },
    modeLabel: modeLabels[design.mode],
    scopeLabel: scopeLabels[design.scope],
    targetWidth,
    targetHeight,
    upperCutHeight,
    contrastCutHeight,
    contrastJoinY,
    requiredPiecedWidth,
    requiredPiecedHeight,
    sewnWidth,
    sewnHeight,
    trimWidth: sewnWidth - targetWidth,
    trimHeight: sewnHeight - upperCutHeight,
    blockCutSize,
    blockFinishedSize,
    columnSeams,
    rowSeams,
    piecedPanelCount,
    solidPanelCount,
    cutPieces,
    instructions,
    warnings,
    valid: warnings.length === 0,
  };
}

export function minimumSquareForGrid(
  plan: BagPatternPlan,
  design: OuterPanelDesign,
) {
  const preview = calculateOuterPanelComposition(plan, {
    ...design,
    blockSize: Math.max(design.blockSize, 0.125),
  });
  const rows = positiveCount(design.rows);
  const columns = positiveCount(design.columns);
  const allowance = Math.max(0, design.piecingAllowance);
  const cutWidth =
    (preview.requiredPiecedWidth + allowance * 2 * (columns - 1)) /
    columns;
  const cutHeight =
    (preview.requiredPiecedHeight + allowance * 2 * (rows - 1)) /
    rows;
  const minimumCut = Math.max(cutWidth, cutHeight);
  const roundedCut = Math.ceil(minimumCut * 8) / 8;

  return design.blockSizeBasis === "finished"
    ? Math.max(0, roundedCut - allowance * 2)
    : roundedCut;
}

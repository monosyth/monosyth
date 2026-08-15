import { ENCLOSED_SEAM_LOSS, hstPlan, qstPlan } from "./math";

const EPSILON = 0.0001;

export type HstCorner = "nw" | "ne" | "se" | "sw";
export type BlockFabric = "feature" | "background" | "accent" | "secondary";

export type BlockCellToken =
  | { kind: "square"; fabric: BlockFabric }
  | { kind: "hst"; corner: HstCorner; feature?: BlockFabric }
  | { kind: "qst"; axis: "horizontal" | "vertical" }
  | { kind: "split"; direction: "horizontal" | "vertical"; reverse?: boolean }
  | { kind: "four-patch"; reverse?: boolean }
  | { kind: "stem" };

export type BlockCellMap = {
  rows: number;
  columns: number;
  cells: readonly BlockCellToken[];
};

type PieceAssembly = {
  kind: "piece";
  width: number;
  height: number;
  label: string;
};

type JoinedAssembly = {
  kind: "row" | "column";
  label: string;
  children: readonly Assembly[];
};

type GridAssembly = {
  kind: "grid";
  label: string;
  rows: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
};

type LogStep = {
  direction: "top" | "right" | "bottom" | "left";
  stripWidth: number;
  length: number;
};

type LogAssembly = {
  kind: "logs";
  label: string;
  center: number;
  steps: readonly LogStep[];
};

export type Assembly = PieceAssembly | JoinedAssembly | GridAssembly | LogAssembly;

type HstUnitCheck = {
  kind: "hst";
  method: "two" | "eight";
  finished: number;
  required: number;
  batches: number;
  startingSquare: number;
  trimTo: number;
  label?: string;
};

type QstUnitCheck = {
  kind: "qst";
  finished: number;
  required: number;
  batches: number;
  startingSquare: number;
  trimTo: number;
  label?: string;
};

type StitchFlipGeeseCheck = {
  kind: "stitch-flip-geese";
  finishedHeight: number;
  required: number;
  bodyCount: number;
  bodyWidth: number;
  bodyHeight: number;
  skyCount: number;
  skySize: number;
  label?: string;
};

export type UnitCheck = HstUnitCheck | QstUnitCheck | StitchFlipGeeseCheck;

export type BlockGeometrySpec = {
  slug: string;
  finished: number;
  unfinished: number;
  assembly: Assembly;
  unitChecks?: readonly UnitCheck[];
  cellMap?: BlockCellMap;
  note?: string;
};

type AuditableBlock = {
  slug: string;
  name: string;
  finishedSize: string;
  unfinishedSize: string;
  sources?: readonly { label: string; url: string }[];
};

export type GeometryAudit = {
  slug: string;
  name: string;
  status: "pass" | "fail";
  coverage: "boundary" | "structure" | "units" | "diagram + units";
  advertised: string;
  calculated: string;
  proofs: readonly string[];
  errors: readonly string[];
  note?: string;
};

const piece = (width: number, height: number, label: string): PieceAssembly => ({
  kind: "piece",
  width,
  height,
  label,
});

const row = (label: string, ...children: readonly Assembly[]): JoinedAssembly => ({
  kind: "row",
  label,
  children,
});

const column = (label: string, ...children: readonly Assembly[]): JoinedAssembly => ({
  kind: "column",
  label,
  children,
});

const grid = (
  rows: number,
  columns: number,
  cellWidth: number,
  cellHeight = cellWidth,
  label = `${rows} × ${columns} assembly`,
): GridAssembly => ({ kind: "grid", label, rows, columns, cellWidth, cellHeight });

const sq = (fabric: BlockFabric): BlockCellToken => ({ kind: "square", fabric });
const hst = (corner: HstCorner, feature?: BlockFabric): BlockCellToken => ({ kind: "hst", corner, feature });
const qst = (axis: "horizontal" | "vertical"): BlockCellToken => ({ kind: "qst", axis });
const split = (direction: "horizontal" | "vertical", reverse = false): BlockCellToken => ({ kind: "split", direction, reverse });
const fourPatch = (): BlockCellToken => ({ kind: "four-patch" });
const stem: BlockCellToken = { kind: "stem" };

const checkerboard = (size: number): BlockCellMap => ({
  rows: size,
  columns: size,
  cells: Array.from({ length: size * size }, (_, index) =>
    sq((Math.floor(index / size) + (index % size)) % 2 ? "background" : "feature"),
  ),
});

export const BLOCK_CELL_MAPS: Readonly<Record<string, BlockCellMap>> = {
  "four-patch": checkerboard(2),
  "nine-patch": checkerboard(3),
  "sixteen-patch": checkerboard(4),
  pinwheel: { rows: 2, columns: 2, cells: [hst("ne"), hst("se"), hst("nw"), hst("sw")] },
  "friendship-star": { rows: 3, columns: 3, cells: [sq("background"), hst("sw"), sq("background"), hst("se"), sq("feature"), hst("nw"), sq("background"), hst("ne"), sq("background")] },
  "shoo-fly": { rows: 3, columns: 3, cells: [hst("se"), sq("background"), hst("sw"), sq("background"), sq("feature"), sq("background"), hst("ne"), sq("background"), hst("nw")] },
  "hourglass-quartet": { rows: 2, columns: 2, cells: [qst("horizontal"), qst("vertical"), qst("vertical"), qst("horizontal")] },
  "ohio-star": { rows: 3, columns: 3, cells: [sq("background"), qst("vertical"), sq("background"), qst("horizontal"), sq("feature"), qst("horizontal"), sq("background"), qst("vertical"), sq("background")] },
  "churn-dash": { rows: 3, columns: 3, cells: [hst("se"), split("horizontal", true), hst("sw"), split("vertical", true), sq("background"), split("vertical"), hst("ne"), split("horizontal"), hst("nw")] },
  "jacobs-ladder": { rows: 3, columns: 3, cells: [fourPatch(), hst("sw"), fourPatch(), hst("se"), fourPatch(), hst("nw"), fourPatch(), hst("ne"), fourPatch()] },
  "maple-leaf": { rows: 3, columns: 3, cells: [sq("background"), hst("sw"), hst("sw"), hst("ne"), sq("feature"), sq("feature"), hst("ne"), sq("feature"), stem] },
  "modern-plus": { rows: 5, columns: 5, cells: Array.from({ length: 25 }, (_, index) => sq(Math.floor(index / 5) === 2 || index % 5 === 2 ? "feature" : "background")) },
  "hst-chevron": { rows: 4, columns: 4, cells: Array.from({ length: 16 }, (_, index) => { const r = Math.floor(index / 4); const c = index % 4; return hst(c % 2 === 0 ? (r % 2 === 0 ? "se" : "nw") : (r % 2 === 0 ? "sw" : "ne")); }) },
  "pinwheel-star": { rows: 4, columns: 4, cells: [sq("background"), hst("sw"), hst("se"), sq("background"), hst("ne"), hst("ne"), hst("se"), hst("nw"), hst("se"), hst("nw"), hst("sw"), hst("sw"), sq("background"), hst("nw"), hst("ne"), sq("background")] },
  "annies-choice": { rows: 4, columns: 4, cells: [hst("ne"), hst("ne"), hst("se"), hst("se"), hst("ne"), hst("sw"), hst("nw"), hst("se"), hst("nw"), hst("se"), hst("ne"), hst("sw"), hst("nw"), hst("nw"), hst("sw"), hst("sw")] },
};

const logCabin: LogAssembly = {
  kind: "logs",
  label: "center plus 12 sequential logs",
  center: 3.5,
  steps: [
    ["top", 2, 3.5], ["left", 2, 5], ["bottom", 2, 5], ["right", 2, 6.5],
    ["top", 2, 6.5], ["left", 2, 8], ["bottom", 2, 8], ["right", 2, 9.5],
    ["top", 2, 9.5], ["left", 2, 11], ["bottom", 2, 11], ["right", 2, 12.5],
  ].map(([direction, stripWidth, length]) => ({ direction, stripWidth, length }) as LogStep),
};

const offsetLogCabin: LogAssembly = {
  kind: "logs",
  label: "center plus alternating narrow and wide logs",
  center: 3.5,
  steps: [
    ["top", 1.5, 3.5], ["left", 1.5, 4.5], ["bottom", 2.5, 4.5], ["right", 2.5, 6.5],
    ["top", 1.5, 6.5], ["left", 1.5, 7.5], ["bottom", 2.5, 7.5], ["right", 2.5, 9.5],
    ["top", 1.5, 9.5], ["left", 1.5, 10.5], ["bottom", 2.5, 10.5], ["right", 2.5, 12.5],
  ].map(([direction, stripWidth, length]) => ({ direction, stripWidth, length }) as LogStep),
};

const hstCheck = (finished: number, required: number, batches: number, startingSquare: number, method: "two" | "eight" = "two", label?: string): HstUnitCheck => ({
  kind: "hst", method, finished, required, batches, startingSquare, trimTo: finished + ENCLOSED_SEAM_LOSS, label,
});

const qstCheck = (finished: number, required: number, batches: number, startingSquare: number, label?: string): QstUnitCheck => ({
  kind: "qst", finished, required, batches, startingSquare, trimTo: finished + ENCLOSED_SEAM_LOSS, label,
});

const geeseCheck = (finishedHeight: number, required: number, label?: string): StitchFlipGeeseCheck => ({
  kind: "stitch-flip-geese",
  finishedHeight,
  required,
  bodyCount: required,
  bodyWidth: finishedHeight * 2 + ENCLOSED_SEAM_LOSS,
  bodyHeight: finishedHeight + ENCLOSED_SEAM_LOSS,
  skyCount: required * 2,
  skySize: finishedHeight + ENCLOSED_SEAM_LOSS,
  label,
});

const courthouseCore = row("center with first side logs", piece(2.5, 4.5, "left log"), piece(4.5, 4.5, "center"), piece(2.5, 4.5, "right log"));
const courthouseMiddle = column("first top and bottom logs", piece(8.5, 2.5, "top log"), courthouseCore, piece(8.5, 2.5, "bottom log"));
const courthouseWide = row("second side logs", piece(2.5, 8.5, "left log"), courthouseMiddle, piece(2.5, 8.5, "right log"));

const specs: readonly BlockGeometrySpec[] = [
  { slug: "four-patch", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5), cellMap: BLOCK_CELL_MAPS["four-patch"] },
  { slug: "nine-patch", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), cellMap: BLOCK_CELL_MAPS["nine-patch"] },
  { slug: "sixteen-patch", finished: 12, unfinished: 12.5, assembly: grid(4, 4, 3.5), cellMap: BLOCK_CELL_MAPS["sixteen-patch"] },
  { slug: "rail-fence", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5) },
  { slug: "log-cabin", finished: 12, unfinished: 12.5, assembly: logCabin },
  { slug: "courthouse-steps", finished: 12, unfinished: 12.5, assembly: column("completed paired-log block", piece(12.5, 2.5, "top log"), courthouseWide, piece(12.5, 2.5, "bottom log")) },
  { slug: "pinwheel", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5), unitChecks: [hstCheck(6, 4, 2, 7)], cellMap: BLOCK_CELL_MAPS.pinwheel },
  { slug: "friendship-star", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), unitChecks: [hstCheck(4, 4, 2, 5)], cellMap: BLOCK_CELL_MAPS["friendship-star"] },
  { slug: "shoo-fly", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), unitChecks: [hstCheck(4, 4, 2, 5)], cellMap: BLOCK_CELL_MAPS["shoo-fly"] },
  { slug: "hourglass-quartet", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5), unitChecks: [qstCheck(6, 4, 2, 7.5)], cellMap: BLOCK_CELL_MAPS["hourglass-quartet"] },
  { slug: "ohio-star", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), unitChecks: [qstCheck(4, 4, 2, 5.5)], cellMap: BLOCK_CELL_MAPS["ohio-star"] },
  { slug: "churn-dash", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), unitChecks: [hstCheck(4, 4, 2, 5)], cellMap: BLOCK_CELL_MAPS["churn-dash"] },
  { slug: "sawtooth-star", finished: 12, unfinished: 12.5, assembly: column("three star rows", row("top row", piece(3.5, 3.5, "corner"), piece(6.5, 3.5, "goose"), piece(3.5, 3.5, "corner")), row("middle row", piece(3.5, 6.5, "goose"), piece(6.5, 6.5, "center"), piece(3.5, 6.5, "goose")), row("bottom row", piece(3.5, 3.5, "corner"), piece(6.5, 3.5, "goose"), piece(3.5, 3.5, "corner"))), unitChecks: [geeseCheck(3, 4)] },
  { slug: "dutchmans-puzzle", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5, 6.5, "four two-goose quadrants"), unitChecks: [geeseCheck(3, 8)] },
  { slug: "jacobs-ladder", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), unitChecks: [hstCheck(4, 4, 2, 5)], cellMap: BLOCK_CELL_MAPS["jacobs-ladder"] },
  { slug: "snowball", finished: 12, unfinished: 12.5, assembly: piece(12.5, 12.5, "corner-replaced square"), note: "Boundary proof only: stitch-and-flip corners preserve the starting square’s outside dimensions." },
  { slug: "bear-paw", finished: 12, unfinished: 12.5, assembly: column("two paw rows with center sash", row("top paw row", piece(5.75, 5.75, "paw"), piece(2, 5.75, "sash"), piece(5.75, 5.75, "paw")), row("center sash", piece(5.75, 2, "sash"), piece(2, 2, "center"), piece(5.75, 2, "sash")), row("bottom paw row", piece(5.75, 5.75, "paw"), piece(2, 5.75, "sash"), piece(5.75, 5.75, "paw"))), unitChecks: [hstCheck(1.75, 16, 8, 3, "two", "paw claws")] },
  { slug: "disappearing-nine-patch", finished: 13, unfinished: 13.5, assembly: grid(2, 2, 7, 7, "four rearranged quarters"), note: "A 14-inch raw Nine Patch is cut into four 7-inch quarters; three new joining seams reduce the recombined square to 13½ inches." },
  { slug: "modern-plus", finished: 10, unfinished: 10.5, assembly: grid(5, 5, 2.5), cellMap: BLOCK_CELL_MAPS["modern-plus"] },
  { slug: "hst-chevron", finished: 12, unfinished: 12.5, assembly: grid(4, 4, 3.5), unitChecks: [hstCheck(3, 16, 8, 4)], cellMap: BLOCK_CELL_MAPS["hst-chevron"] },
  { slug: "wonky-star", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), note: "Structural proof only: improvised star-point units must be trimmed to the same 4½-inch raw cell before assembly." },
  { slug: "offset-log-cabin", finished: 12, unfinished: 12.5, assembly: offsetLogCabin },
  { slug: "stacked-coins", finished: 12, unfinished: 12.5, assembly: row("two coin columns with three sashes", piece(1.5, 12.5, "outer sash"), column("left coins", ...Array.from({ length: 4 }, (_, index) => piece(4.5, 3.5, `left coin ${index + 1}`))), piece(2.5, 12.5, "center sash"), column("right coins", ...Array.from({ length: 4 }, (_, index) => piece(4.5, 3.5, `right coin ${index + 1}`))), piece(1.5, 12.5, "outer sash")) },
  { slug: "minimalist-cross", finished: 12, unfinished: 12.5, assembly: column("three cross rows", row("top row", piece(5.5, 5.5, "background"), piece(2.5, 5.5, "vertical arm"), piece(5.5, 5.5, "background")), row("middle row", piece(5.5, 2.5, "horizontal arm"), piece(2.5, 2.5, "center"), piece(5.5, 2.5, "horizontal arm")), row("bottom row", piece(5.5, 5.5, "background"), piece(2.5, 5.5, "vertical arm"), piece(5.5, 5.5, "background"))) },
  { slug: "improv-mosaic", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5), note: "Structural proof only: each improvised quadrant must be trimmed to 6½ inches before the final Four Patch assembly." },
  { slug: "economy-block", finished: 12, unfinished: 12.5, assembly: piece(12.5, 12.5, "square-in-square unit"), note: "Boundary proof only: the two triangle rounds are intentionally oversized and the complete unit is centered and trimmed to 12½ inches." },
  { slug: "maple-leaf", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), unitChecks: [hstCheck(4, 4, 2, 5)], cellMap: BLOCK_CELL_MAPS["maple-leaf"] },
  { slug: "maple-star", finished: 12, unfinished: 12.5, assembly: grid(3, 3, 4.5), unitChecks: [geeseCheck(2, 4, "side-unit geese")] },
  { slug: "turnstile", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5, 6.5, "four rotated goose quadrants"), unitChecks: [geeseCheck(3, 4)] },
  { slug: "bow-tie", finished: 12, unfinished: 12.5, assembly: grid(2, 2, 6.5), note: "Stitch-and-flip knot corners preserve each 6½-inch parent square’s outside dimensions." },
  { slug: "pinwheel-star", finished: 12, unfinished: 12.5, assembly: grid(4, 4, 3.5), unitChecks: [hstCheck(3, 8, 1, 8.25, "eight", "eight-at-a-time group"), hstCheck(3, 4, 2, 4, "two", "two-at-a-time group")], cellMap: BLOCK_CELL_MAPS["pinwheel-star"] },
  { slug: "basket", finished: 12, unfinished: 12.5, assembly: row("main basket and handle column", piece(9.5, 12.5, "four-row main section"), piece(3.5, 12.5, "right side column")), unitChecks: [hstCheck(3, 6, 3, 4)] },
  { slug: "heart", finished: 12, unfinished: 12.5, assembly: row("two mirrored heart halves", piece(6.5, 12.5, "left half"), piece(6.5, 12.5, "right half")), note: "Stitch-and-flip corners preserve each half’s 6½ × 12½-inch outer boundary before the center seam." },
  { slug: "annies-choice", finished: 12, unfinished: 12.5, assembly: grid(4, 4, 3.5), unitChecks: [hstCheck(3, 16, 2, 8, "eight", "two eight-at-a-time groups")], cellMap: BLOCK_CELL_MAPS["annies-choice"] },
  { slug: "butterfly-cross", finished: 12, unfinished: 12.5, assembly: column("corner rows and center crossbar", row("top row", piece(5.5, 5.5, "corner unit"), piece(2.5, 5.5, "cross bar"), piece(5.5, 5.5, "corner unit")), row("center row", piece(5.5, 2.5, "cross bar"), piece(2.5, 2.5, "center"), piece(5.5, 2.5, "cross bar")), row("bottom row", piece(5.5, 5.5, "corner unit"), piece(2.5, 5.5, "cross bar"), piece(5.5, 5.5, "corner unit"))), unitChecks: [hstCheck(2.5, 8, 4, 3.5)] },
];

export const BLOCK_GEOMETRY_SPECS: Readonly<Record<string, BlockGeometrySpec>> = Object.fromEntries(
  specs.map((spec) => [spec.slug, spec]),
);

function nearlyEqual(left: number, right: number) {
  return Math.abs(left - right) < EPSILON;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".5", "½").replace(".25", "¼").replace(".75", "¾");
}

function dimensions(width: number, height: number) {
  return `${formatNumber(width)}″ × ${formatNumber(height)}″`;
}

function measureAssembly(assembly: Assembly, errors: string[]): { width: number; height: number } {
  if (assembly.kind === "piece") return { width: assembly.width, height: assembly.height };
  if (assembly.kind === "grid") {
    return {
      width: assembly.columns * assembly.cellWidth - (assembly.columns - 1) * ENCLOSED_SEAM_LOSS,
      height: assembly.rows * assembly.cellHeight - (assembly.rows - 1) * ENCLOSED_SEAM_LOSS,
    };
  }
  if (assembly.kind === "logs") {
    let width = assembly.center;
    let height = assembly.center;
    assembly.steps.forEach((step, index) => {
      const expectedLength = step.direction === "top" || step.direction === "bottom" ? width : height;
      if (!nearlyEqual(step.length, expectedLength)) {
        errors.push(`${assembly.label}: log ${index + 1} is ${formatNumber(step.length)}″ long but the receiving edge is ${formatNumber(expectedLength)}″.`);
      }
      if (step.direction === "top" || step.direction === "bottom") height += step.stripWidth - ENCLOSED_SEAM_LOSS;
      else width += step.stripWidth - ENCLOSED_SEAM_LOSS;
    });
    return { width, height };
  }

  const children = assembly.children.map((child) => measureAssembly(child, errors));
  if (!children.length) {
    errors.push(`${assembly.label}: assembly has no children.`);
    return { width: 0, height: 0 };
  }
  if (assembly.kind === "row") {
    const expectedHeight = children[0].height;
    children.slice(1).forEach((child, index) => {
      if (!nearlyEqual(child.height, expectedHeight)) errors.push(`${assembly.label}: row part ${index + 2} is ${formatNumber(child.height)}″ high; expected ${formatNumber(expectedHeight)}″.`);
    });
    return { width: children.reduce((sum, child) => sum + child.width, 0) - (children.length - 1) * ENCLOSED_SEAM_LOSS, height: expectedHeight };
  }
  const expectedWidth = children[0].width;
  children.slice(1).forEach((child, index) => {
    if (!nearlyEqual(child.width, expectedWidth)) errors.push(`${assembly.label}: column part ${index + 2} is ${formatNumber(child.width)}″ wide; expected ${formatNumber(expectedWidth)}″.`);
  });
  return { width: expectedWidth, height: children.reduce((sum, child) => sum + child.height, 0) - (children.length - 1) * ENCLOSED_SEAM_LOSS };
}

function parseInches(value: string) {
  const fractions: Record<string, number> = { "⅛": 0.125, "¼": 0.25, "⅜": 0.375, "½": 0.5, "⅝": 0.625, "¾": 0.75, "⅞": 0.875 };
  const whole = Number(value.match(/\d+/)?.[0] ?? 0);
  const fraction = Object.entries(fractions).find(([symbol]) => value.includes(symbol))?.[1] ?? 0;
  return whole + fraction;
}

function validateUnit(check: UnitCheck, errors: string[], proofs: string[]) {
  const label = check.label ? `${check.label}: ` : "";
  if (check.kind === "hst") {
    const plan = hstPlan(check.finished, check.required, check.method);
    if (check.batches * plan.yieldPerBatch < check.required) errors.push(`${label}${check.batches} HST batch(es) yield too few units.`);
    if (check.startingSquare + EPSILON < plan.exactStart) errors.push(`${label}${formatNumber(check.startingSquare)}″ HST start is smaller than the ${formatNumber(plan.exactStart)}″ minimum.`);
    if (!nearlyEqual(check.trimTo, plan.trimTo)) errors.push(`${label}HST trim target should be ${formatNumber(plan.trimTo)}″, not ${formatNumber(check.trimTo)}″.`);
    proofs.push(`${label}${check.batches} × ${check.method}-at-a-time HST batch(es) yield ${check.batches * plan.yieldPerBatch}; ${check.required} required.`);
    return;
  }
  if (check.kind === "qst") {
    const plan = qstPlan(check.finished, check.required);
    if (check.batches * plan.yieldPerBatch < check.required) errors.push(`${label}${check.batches} QST batch(es) yield too few units.`);
    if (check.startingSquare + EPSILON < plan.exactStart) errors.push(`${label}${formatNumber(check.startingSquare)}″ QST start is smaller than the ${formatNumber(plan.exactStart)}″ minimum.`);
    if (!nearlyEqual(check.trimTo, plan.trimTo)) errors.push(`${label}QST trim target should be ${formatNumber(plan.trimTo)}″, not ${formatNumber(check.trimTo)}″.`);
    proofs.push(`${label}${check.batches} QST batch(es) yield ${check.batches * plan.yieldPerBatch}; ${check.required} required.`);
    return;
  }
  const expectedHeight = check.finishedHeight + ENCLOSED_SEAM_LOSS;
  const expectedWidth = check.finishedHeight * 2 + ENCLOSED_SEAM_LOSS;
  if (!nearlyEqual(check.bodyHeight, expectedHeight) || !nearlyEqual(check.bodyWidth, expectedWidth)) errors.push(`${label}goose body must be ${dimensions(expectedWidth, expectedHeight)} raw.`);
  if (!nearlyEqual(check.skySize, expectedHeight)) errors.push(`${label}sky squares must be ${formatNumber(expectedHeight)}″.`);
  if (check.bodyCount < check.required || check.skyCount < check.required * 2) errors.push(`${label}stitch-and-flip geese require one body and two sky squares per unit.`);
  proofs.push(`${label}${check.bodyCount} bodies + ${check.skyCount} sky squares yield ${check.required} stitch-and-flip geese.`);
}

function countMapUnits(map: BlockCellMap, kind: BlockCellToken["kind"]) {
  return map.cells.filter((cell) => cell.kind === kind).length;
}

export function auditBlockLibrary(blocks: readonly AuditableBlock[]): GeometryAudit[] {
  const audits = blocks.map((block) => {
    const spec = BLOCK_GEOMETRY_SPECS[block.slug];
    const errors: string[] = [];
    const proofs: string[] = [];
    if (!spec) {
      return { slug: block.slug, name: block.name, status: "fail" as const, coverage: "boundary" as const, advertised: `${block.unfinishedSize} raw`, calculated: "No specification", proofs, errors: ["No machine-readable geometry specification exists."] };
    }
    const measured = measureAssembly(spec.assembly, errors);
    const advertisedFinished = parseInches(block.finishedSize);
    const advertisedRaw = parseInches(block.unfinishedSize);
    if (!nearlyEqual(spec.finished + ENCLOSED_SEAM_LOSS, spec.unfinished)) errors.push(`Spec finished ${formatNumber(spec.finished)}″ and raw ${formatNumber(spec.unfinished)}″ do not differ by ½″.`);
    if (!nearlyEqual(advertisedFinished, spec.finished) || !nearlyEqual(advertisedRaw, spec.unfinished)) errors.push("Displayed sizes do not match the geometry specification.");
    if (!nearlyEqual(measured.width, spec.unfinished) || !nearlyEqual(measured.height, spec.unfinished)) errors.push(`${spec.assembly.label} calculates to ${dimensions(measured.width, measured.height)}, not ${formatNumber(spec.unfinished)}″ square.`);
    proofs.push(`${spec.assembly.label}: ${dimensions(measured.width, measured.height)} raw.`);
    spec.unitChecks?.forEach((check) => validateUnit(check, errors, proofs));
    if (spec.cellMap) {
      if (spec.cellMap.cells.length !== spec.cellMap.rows * spec.cellMap.columns) errors.push(`Diagram map has ${spec.cellMap.cells.length} cells; ${spec.cellMap.rows * spec.cellMap.columns} required.`);
      if (spec.assembly.kind === "grid" && (spec.cellMap.rows !== spec.assembly.rows || spec.cellMap.columns !== spec.assembly.columns)) errors.push("Diagram rows or columns do not match the assembly grid.");
      const expectedHst = spec.unitChecks?.filter((check): check is HstUnitCheck => check.kind === "hst").reduce((sum, check) => sum + check.required, 0) ?? 0;
      const expectedQst = spec.unitChecks?.filter((check): check is QstUnitCheck => check.kind === "qst").reduce((sum, check) => sum + check.required, 0) ?? 0;
      if (expectedHst && countMapUnits(spec.cellMap, "hst") !== expectedHst) errors.push(`Diagram contains ${countMapUnits(spec.cellMap, "hst")} HSTs; recipe requires ${expectedHst}.`);
      if (expectedQst && countMapUnits(spec.cellMap, "qst") !== expectedQst) errors.push(`Diagram contains ${countMapUnits(spec.cellMap, "qst")} QSTs; recipe requires ${expectedQst}.`);
      proofs.push(`Shared diagram map: ${spec.cellMap.rows} rows × ${spec.cellMap.columns} columns; unit counts checked.`);
    }
    if (!block.sources?.length) errors.push("No supporting construction source is attached to this block.");
    const coverage: GeometryAudit["coverage"] = spec.cellMap && spec.unitChecks?.length ? "diagram + units" : spec.unitChecks?.length ? "units" : spec.assembly.kind === "piece" ? "boundary" : "structure";
    return { slug: block.slug, name: block.name, status: errors.length ? "fail" as const : "pass" as const, coverage, advertised: `${block.finishedSize} finished / ${block.unfinishedSize} raw`, calculated: `${dimensions(measured.width, measured.height)} raw`, proofs, errors, note: spec.note };
  });

  const knownSlugs = new Set(blocks.map((block) => block.slug));
  Object.keys(BLOCK_GEOMETRY_SPECS).filter((slug) => !knownSlugs.has(slug)).forEach((slug) => audits.push({ slug, name: slug, status: "fail", coverage: "boundary", advertised: "No library entry", calculated: "Specification only", proofs: [], errors: ["Geometry specification has no matching block page."] }));
  return audits;
}

export function assertBlockLibraryGeometry(blocks: readonly AuditableBlock[]) {
  const failures = auditBlockLibrary(blocks).filter((audit) => audit.status === "fail");
  if (failures.length) {
    throw new Error(`Quilt geometry audit failed:\n${failures.map((failure) => `- ${failure.name}: ${failure.errors.join(" ")}`).join("\n")}`);
  }
}

export function getBlockCellMap(slug: string) {
  return BLOCK_CELL_MAPS[slug];
}

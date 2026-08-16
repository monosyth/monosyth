export type RulerProfile = {
  id: "stripology-mini" | "creative-grids-612" | "fiskars-624" | "stripology-xl" | "stripology-squared" | "stripology-quarters-mini" | "custom-slotted";
  name: string;
  model: string;
  owned: boolean;
  kind: "slotted" | "standard";
  planningSpan: number;
  slotInterval: number | null;
  offsetIncrement: number | null;
  maxSquare: number | null;
  detail: string;
  sourceUrl: string | null;
};

export type RulerCutPlan = {
  directSlots: boolean;
  firstSetupPieces: number;
  fits: boolean;
  lastSetupPieces: number;
  piecesPerSetup: number;
  requested: number;
  setups: number;
  slots: number[];
  standard: boolean;
  supportedOffset: boolean;
  valid: boolean;
  width: number;
};

export const RULER_PROFILES: readonly RulerProfile[] = [
  {
    id: "stripology-mini",
    name: "Stripology® Squared Mini",
    model: "CGRGE3",
    owned: true,
    kind: "slotted",
    planningSpan: 6.5,
    slotInterval: 0.5,
    offsetIncrement: 0.125,
    maxSquare: 6.5,
    detail: "Your small-batch ruler · ½″ slots · quarter/eighth offset guides · squares through 6½″",
    sourceUrl: "https://www.creativegridsusa.com/products/CGRGE3",
  },
  {
    id: "creative-grids-612",
    name: "Creative Grids® rectangle",
    model: "CGR612 · 6½″ × 12½″",
    owned: true,
    kind: "standard",
    planningSpan: 6.5,
    slotInterval: null,
    offsetIncrement: null,
    maxSquare: 6.5,
    detail: "Your compact straight ruler · ⅛″ and ¼″ increments · 45°/30°/60° guides",
    sourceUrl: "https://www.creativegridsusa.com/products/CGR612",
  },
  {
    id: "fiskars-624",
    name: "Fiskars® sewing ruler",
    model: "1066148 · 6″ × 24″",
    owned: true,
    kind: "standard",
    planningSpan: 6,
    slotInterval: null,
    offsetIncrement: null,
    maxSquare: 6,
    detail: "Your long straightedge · long WOF cuts, borders, and first reference edges",
    sourceUrl: "https://www.amazon.com/dp/B0C8BMVL93",
  },
  {
    id: "stripology-xl",
    name: "Stripology® XL",
    model: "CGRGE1XL",
    owned: false,
    kind: "slotted",
    planningSpan: 20,
    slotInterval: 0.5,
    offsetIncrement: 0.25,
    maxSquare: 12.5,
    detail: "Large batch ruler · ½″ slots · 45°/60° guides · squares through 12½″",
    sourceUrl: "https://www.creativegridsusa.com/products/CGRGE1XL",
  },
  {
    id: "stripology-squared",
    name: "Stripology® Squared",
    model: "CGRGE2",
    owned: false,
    kind: "slotted",
    planningSpan: 12.5,
    slotInterval: 0.5,
    offsetIncrement: 0.25,
    maxSquare: 12.5,
    detail: "Medium slotted ruler · ½″ slots · squares through 12½″",
    sourceUrl: "https://www.creativegridsusa.com/products/CGRGE2",
  },
  {
    id: "stripology-quarters-mini",
    name: "Stripology® Quarters Mini",
    model: "CGRGE4",
    owned: false,
    kind: "slotted",
    planningSpan: 6.25,
    slotInterval: 0.25,
    offsetIncrement: 0.125,
    maxSquare: 6.25,
    detail: "Small-unit ruler · true ¼″ slots · squares through 6¼″",
    sourceUrl: "https://www.creativegridsusa.com/products/CGRGE4",
  },
  {
    id: "custom-slotted",
    name: "Other slotted ruler",
    model: "Enter its usable span",
    owned: false,
    kind: "slotted",
    planningSpan: 12,
    slotInterval: 0.5,
    offsetIncrement: null,
    maxSquare: null,
    detail: "Generic profile · confirm slot spacing and usable numbered span from the ruler instructions",
    sourceUrl: null,
  },
] as const;

export function getRulerProfile(id: RulerProfile["id"]) {
  return RULER_PROFILES.find((ruler) => ruler.id === id) ?? RULER_PROFILES[0];
}

const nearlyWhole = (value: number) => Math.abs(value - Math.round(value)) < 1e-8;

export function rulerCutPlan({
  ruler,
  pieceWidth,
  quantity,
  planningSpan = ruler.planningSpan,
  slotInterval = ruler.slotInterval,
}: {
  ruler: RulerProfile;
  pieceWidth: number;
  quantity: number;
  planningSpan?: number;
  slotInterval?: number | null;
}): RulerCutPlan {
  const width = Math.max(0.125, pieceWidth);
  const usableSpan = Math.max(0.25, planningSpan);
  const requested = Math.max(1, Math.ceil(quantity));
  const fits = width <= usableSpan + 1e-8;
  const standard = ruler.kind === "standard";
  const directSlots = Boolean(
    !standard && slotInterval && nearlyWhole(width / slotInterval),
  );
  const supportedOffset = Boolean(
    !standard &&
      !directSlots &&
      ruler.offsetIncrement &&
      nearlyWhole(width / ruler.offsetIncrement),
  );
  const unsupportedSpacing = !standard && !directSlots && !supportedOffset;
  const valid = fits && !unsupportedSpacing;
  const piecesPerSetup = !valid
    ? 0
    : directSlots
      ? Math.max(1, Math.floor((usableSpan + 1e-8) / width))
      : 1;
  const firstSetupPieces = valid ? Math.min(requested, piecesPerSetup) : 0;
  const slots = directSlots
    ? Array.from(
        { length: firstSetupPieces + 1 },
        (_, index) => index * width,
      )
    : [];
  const setups = valid ? Math.ceil(requested / piecesPerSetup) : 0;
  const lastSetupPieces = valid
    ? requested - piecesPerSetup * Math.max(0, setups - 1)
    : 0;

  return {
    directSlots,
    firstSetupPieces,
    fits,
    lastSetupPieces,
    piecesPerSetup,
    requested,
    setups,
    slots,
    standard,
    supportedOffset,
    valid,
    width,
  };
}

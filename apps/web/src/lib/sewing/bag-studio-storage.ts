import type {
  BagBodyRecipe,
  BagClosure,
  BagPatternDraft,
} from "@/lib/sewing/bag-pattern";
import type { OuterPanelDesign } from "@/lib/sewing/panel-composition";
import type { HandleMaterial } from "@/lib/sewing/tote-handle";

export type BagStudioSizeBasis = "finished" | "cut";
export type BagStudioFabricSource = "bolt" | "fat-quarters";
export type BagStudioToolMode = "select" | "shape";
export type BagStudioSnapStep = 0 | 0.125 | 0.25 | 0.5 | 1;
export type BagStudioTab = "studio" | "saved";
export type SideZipperSide = "left" | "right";
export type RecessedZipperEndStyle = "boxed" | "open";
export type BagStructureFeel =
  | "draped"
  | "woven-interfaced"
  | "fleece-padded"
  | "foam-standing";
export type BagPocketStyle = "none" | "single-slip" | "divided-slip";

export type BagStudioClosureOptions = {
  handleMaterial: HandleMaterial;
  handleDrop: number;
  handleWidth: number;
  handleInset: number;
  handleAttachmentDepth: number;
  sideZipperLength: number;
  sideZipperSide: SideZipperSide;
  zipperGap: number;
  recessDepth: number;
  recessEndGap: number;
  recessEndStyle: RecessedZipperEndStyle;
  recessNotch: number;
};

export type BagStudioFabricSettings = {
  source: BagStudioFabricSource;
  fatQuarterWidth: number;
  fatQuarterLength: number;
  allowFatQuarterRotation: boolean;
};

export type BagStudioSnapshot = {
  bodyRecipe: BagBodyRecipe;
  closure: BagClosure;
  basis: BagStudioSizeBasis;
  draft: BagPatternDraft;
  boxyDraft: BagPatternDraft;
  closureOptions: BagStudioClosureOptions;
  outerDesign: OuterPanelDesign;
  structureFeel?: BagStructureFeel;
  pocketStyle?: BagPocketStyle;
  pullTabs?: boolean;
  mirror: boolean;
  toolMode: BagStudioToolMode;
  snapStep: BagStudioSnapStep;
  fabricSettings: BagStudioFabricSettings;
  previewYaw: number;
};

export type SavedBagDesign = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  snapshot: BagStudioSnapshot;
};

export type BagStudioStoredState = {
  schemaVersion: 2;
  workingCopy: {
    name: string;
    activeSavedBagId: string | null;
    activeTab: BagStudioTab;
    snapshot: BagStudioSnapshot;
  };
  savedBags: SavedBagDesign[];
};

export const BAG_STUDIO_STORAGE_KEY = "monosyth:bag-pattern-studio:v1";
export const BAG_STUDIO_SCHEMA_VERSION = 2;
export const MAX_SAVED_BAGS = 60;

const closures: BagClosure[] = [
  "open-tote",
  "top-zipper",
  "side-zipper",
  "zipper-gusset",
  "recessed-zipper",
];
const bodyRecipes: BagBodyRecipe[] = ["two-panel-tote", "four-corner-boxy"];
const sizeBases: BagStudioSizeBasis[] = ["finished", "cut"];
const fabricSources: BagStudioFabricSource[] = ["bolt", "fat-quarters"];
const toolModes: BagStudioToolMode[] = ["select", "shape"];
const snapSteps: BagStudioSnapStep[] = [0, 0.125, 0.25, 0.5, 1];
const tabs: BagStudioTab[] = ["studio", "saved"];
const handleMaterials: HandleMaterial[] = ["webbing", "fabric"];
const zipperSides: SideZipperSide[] = ["left", "right"];
const recessedZipperEndStyles: RecessedZipperEndStyle[] = ["boxed", "open"];
const piecingModes: OuterPanelDesign["mode"][] = [
  "solid",
  "vertical-strips",
  "horizontal-strips",
  "block-grid",
];
const panelScopes: OuterPanelDesign["scope"][] = ["both", "front", "back"];
const blockSizeBases: OuterPanelDesign["blockSizeBasis"][] = ["cut", "finished"];
const structureFeels: BagStructureFeel[] = [
  "draped",
  "woven-interfaced",
  "fleece-padded",
  "foam-standing",
];
const pocketStyles: BagPocketStyle[] = ["none", "single-slip", "divided-slip"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function enumValue<T extends string | number>(
  value: unknown,
  options: readonly T[],
  fallback: T,
) {
  return options.includes(value as T) ? (value as T) : fallback;
}

function shortText(value: unknown, fallback = "", maxLength = 80) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : fallback;
}

function timestamp(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

export function normalizePreviewYaw(value: number) {
  const finite = Number.isFinite(value) ? value : 0;
  return ((finite % 360) + 360) % 360;
}

export function normalizeBagStudioSnapshot(
  value: unknown,
  fallback: BagStudioSnapshot,
): BagStudioSnapshot {
  const input = isRecord(value) ? value : {};
  const draft = isRecord(input.draft) ? input.draft : {};
  const boxyDraft = isRecord(input.boxyDraft) ? input.boxyDraft : {};
  const closureOptions = isRecord(input.closureOptions)
    ? input.closureOptions
    : {};
  const outerDesign = isRecord(input.outerDesign) ? input.outerDesign : {};
  const fabricSettings = isRecord(input.fabricSettings)
    ? input.fabricSettings
    : {};
  const bodyRecipe = enumValue(
    input.bodyRecipe,
    bodyRecipes,
    fallback.bodyRecipe,
  );
  const requestedClosure = enumValue(
    input.closure,
    closures,
    fallback.closure,
  );
  const normalizedClosure = bodyRecipe === "four-corner-boxy"
    ? "top-zipper"
    : requestedClosure;

  return {
    bodyRecipe,
    closure: normalizedClosure,
    basis: enumValue(input.basis, sizeBases, fallback.basis),
    draft: {
      cutWidth: finiteNumber(draft.cutWidth, fallback.draft.cutWidth),
      cutHeight: finiteNumber(draft.cutHeight, fallback.draft.cutHeight),
      cornerCut: finiteNumber(draft.cornerCut, fallback.draft.cornerCut),
      seamAllowance: finiteNumber(
        draft.seamAllowance,
        fallback.draft.seamAllowance,
      ),
      topTakeUp: finiteNumber(draft.topTakeUp, fallback.draft.topTakeUp),
      leftTopInset: finiteNumber(
        draft.leftTopInset,
        fallback.draft.leftTopInset,
      ),
      rightTopInset: finiteNumber(
        draft.rightTopInset,
        fallback.draft.rightTopInset,
      ),
      fabricWidth: finiteNumber(draft.fabricWidth, fallback.draft.fabricWidth),
    },
    boxyDraft: {
      cutWidth: finiteNumber(
        boxyDraft.cutWidth,
        fallback.boxyDraft.cutWidth,
      ),
      cutHeight: finiteNumber(
        boxyDraft.cutHeight,
        fallback.boxyDraft.cutHeight,
      ),
      cornerCut: finiteNumber(
        boxyDraft.cornerCut,
        fallback.boxyDraft.cornerCut,
      ),
      seamAllowance: finiteNumber(
        boxyDraft.seamAllowance,
        fallback.boxyDraft.seamAllowance,
      ),
      topTakeUp: 0,
      leftTopInset: 0,
      rightTopInset: 0,
      fabricWidth: finiteNumber(
        boxyDraft.fabricWidth,
        fallback.boxyDraft.fabricWidth,
      ),
    },
    closureOptions: {
      handleMaterial: enumValue(
        closureOptions.handleMaterial,
        handleMaterials,
        fallback.closureOptions.handleMaterial,
      ),
      handleDrop: finiteNumber(
        closureOptions.handleDrop,
        fallback.closureOptions.handleDrop,
      ),
      handleWidth: finiteNumber(
        closureOptions.handleWidth,
        fallback.closureOptions.handleWidth,
      ),
      handleInset: finiteNumber(
        closureOptions.handleInset,
        fallback.closureOptions.handleInset,
      ),
      handleAttachmentDepth: finiteNumber(
        closureOptions.handleAttachmentDepth,
        fallback.closureOptions.handleAttachmentDepth,
      ),
      sideZipperLength: finiteNumber(
        closureOptions.sideZipperLength,
        fallback.closureOptions.sideZipperLength,
      ),
      sideZipperSide: enumValue(
        closureOptions.sideZipperSide,
        zipperSides,
        fallback.closureOptions.sideZipperSide,
      ),
      zipperGap: finiteNumber(
        closureOptions.zipperGap,
        fallback.closureOptions.zipperGap,
      ),
      recessDepth: finiteNumber(
        closureOptions.recessDepth,
        fallback.closureOptions.recessDepth,
      ),
      recessEndGap: finiteNumber(
        closureOptions.recessEndGap,
        fallback.closureOptions.recessEndGap,
      ),
      recessEndStyle:
        closureOptions.recessEndStyle === undefined
          ? normalizedClosure === "recessed-zipper"
            ? "open"
            : fallback.closureOptions.recessEndStyle
          : enumValue(
              closureOptions.recessEndStyle,
              recessedZipperEndStyles,
              fallback.closureOptions.recessEndStyle,
            ),
      recessNotch: finiteNumber(
        closureOptions.recessNotch,
        fallback.closureOptions.recessNotch,
      ),
    },
    outerDesign: {
      mode: enumValue(
        outerDesign.mode,
        piecingModes,
        fallback.outerDesign.mode,
      ),
      scope: enumValue(
        outerDesign.scope,
        panelScopes,
        fallback.outerDesign.scope,
      ),
      rows: finiteNumber(outerDesign.rows, fallback.outerDesign.rows),
      columns: finiteNumber(
        outerDesign.columns,
        fallback.outerDesign.columns,
      ),
      blockSize: finiteNumber(
        outerDesign.blockSize,
        fallback.outerDesign.blockSize,
      ),
      blockSizeBasis: enumValue(
        outerDesign.blockSizeBasis,
        blockSizeBases,
        fallback.outerDesign.blockSizeBasis,
      ),
      piecingAllowance: finiteNumber(
        outerDesign.piecingAllowance,
        fallback.outerDesign.piecingAllowance,
      ),
      trimMargin: finiteNumber(
        outerDesign.trimMargin,
        fallback.outerDesign.trimMargin,
      ),
      contrastEnabled: booleanValue(
        outerDesign.contrastEnabled,
        fallback.outerDesign.contrastEnabled,
      ),
      contrastRise: finiteNumber(
        outerDesign.contrastRise,
        fallback.outerDesign.contrastRise,
      ),
    },
    structureFeel: enumValue(
      input.structureFeel,
      structureFeels,
      fallback.structureFeel ?? "woven-interfaced",
    ),
    pocketStyle: enumValue(
      input.pocketStyle,
      pocketStyles,
      fallback.pocketStyle ?? "none",
    ),
    pullTabs: booleanValue(input.pullTabs, fallback.pullTabs ?? true),
    mirror: booleanValue(input.mirror, fallback.mirror),
    toolMode: enumValue(input.toolMode, toolModes, fallback.toolMode),
    snapStep: enumValue(input.snapStep, snapSteps, fallback.snapStep),
    fabricSettings: {
      source: enumValue(
        fabricSettings.source,
        fabricSources,
        fallback.fabricSettings.source,
      ),
      fatQuarterWidth: finiteNumber(
        fabricSettings.fatQuarterWidth,
        fallback.fabricSettings.fatQuarterWidth,
      ),
      fatQuarterLength: finiteNumber(
        fabricSettings.fatQuarterLength,
        fallback.fabricSettings.fatQuarterLength,
      ),
      allowFatQuarterRotation: booleanValue(
        fabricSettings.allowFatQuarterRotation,
        fallback.fabricSettings.allowFatQuarterRotation,
      ),
    },
    previewYaw: normalizePreviewYaw(
      finiteNumber(input.previewYaw, fallback.previewYaw),
    ),
  };
}

export function createDefaultBagStudioState(
  fallback: BagStudioSnapshot,
): BagStudioStoredState {
  return {
    schemaVersion: BAG_STUDIO_SCHEMA_VERSION,
    workingCopy: {
      name: "",
      activeSavedBagId: null,
      activeTab: "studio",
      snapshot: fallback,
    },
    savedBags: [],
  };
}

export function parseBagStudioState(
  raw: string | null,
  fallback: BagStudioSnapshot,
): BagStudioStoredState {
  if (!raw) return createDefaultBagStudioState(fallback);

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createDefaultBagStudioState(fallback);
    const workingCopy = isRecord(parsed.workingCopy) ? parsed.workingCopy : {};
    const now = new Date().toISOString();
    const savedBags = Array.isArray(parsed.savedBags)
      ? parsed.savedBags
          .filter(isRecord)
          .map((saved, index): SavedBagDesign => {
            const createdAt = timestamp(saved.createdAt, now);
            return {
              id: shortText(saved.id, `recovered-${index}-${Date.now()}`, 120),
              name: shortText(saved.name, `Recovered bag ${index + 1}`),
              createdAt,
              updatedAt: timestamp(saved.updatedAt, createdAt),
              snapshot: normalizeBagStudioSnapshot(saved.snapshot, fallback),
            };
          })
          .filter((saved, index, all) =>
            saved.id.length > 0 &&
            all.findIndex((candidate) => candidate.id === saved.id) === index
          )
          .slice(0, MAX_SAVED_BAGS)
      : [];
    const requestedActiveId = shortText(
      workingCopy.activeSavedBagId,
      "",
      120,
    );
    const activeSavedBagId = savedBags.some(
      (saved) => saved.id === requestedActiveId,
    )
      ? requestedActiveId
      : null;

    return {
      schemaVersion: BAG_STUDIO_SCHEMA_VERSION,
      workingCopy: {
        name: shortText(workingCopy.name),
        activeSavedBagId,
        activeTab: enumValue(workingCopy.activeTab, tabs, "studio"),
        snapshot: normalizeBagStudioSnapshot(workingCopy.snapshot, fallback),
      },
      savedBags,
    };
  } catch {
    return createDefaultBagStudioState(fallback);
  }
}

export function bagStudioStorageKey(ownerId?: string | null) {
  const safeOwner = typeof ownerId === "string"
    ? ownerId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128)
    : "";
  return safeOwner ? `${BAG_STUDIO_STORAGE_KEY}:${safeOwner}` : BAG_STUDIO_STORAGE_KEY;
}

export function readBagStudioState(
  fallback: BagStudioSnapshot,
  ownerId?: string | null,
) {
  if (typeof window === "undefined") {
    return createDefaultBagStudioState(fallback);
  }
  try {
    return parseBagStudioState(
      window.localStorage.getItem(bagStudioStorageKey(ownerId)),
      fallback,
    );
  } catch {
    return createDefaultBagStudioState(fallback);
  }
}

export function writeBagStudioState(
  state: BagStudioStoredState,
  ownerId?: string | null,
) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      bagStudioStorageKey(ownerId),
      JSON.stringify(state),
    );
    return true;
  } catch {
    return false;
  }
}

export function createSavedBagId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `bag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

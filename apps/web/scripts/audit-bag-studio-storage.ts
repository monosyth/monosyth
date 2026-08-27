import assert from "node:assert/strict";

import {
  BAG_STUDIO_SCHEMA_VERSION,
  bagStudioStorageKey,
  createDefaultBagStudioState,
  normalizeBagStudioSnapshot,
  normalizePreviewYaw,
  parseBagStudioState,
  readBagStudioState,
  writeBagStudioState,
  type BagStudioSnapshot,
} from "../src/lib/sewing/bag-studio-storage";
import { draftFromFinishedSize } from "../src/lib/sewing/bag-pattern";
import { defaultOuterPanelDesign } from "../src/lib/sewing/panel-composition";

let checks = 0;
const same = (actual: unknown, expected: unknown, message: string) => {
  assert.deepEqual(actual, expected, message);
  checks += 1;
};
const yes = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  checks += 1;
};

const fallback: BagStudioSnapshot = {
  closure: "open-tote",
  basis: "finished",
  draft: draftFromFinishedSize({
    baseWidth: 14,
    height: 12,
    depth: 4,
    seamAllowance: 0.25,
    fabricWidth: 44,
  }),
  closureOptions: {
    handleMaterial: "webbing",
    handleDrop: 11,
    handleWidth: 1.5,
    handleInset: 3.5,
    handleAttachmentDepth: 4,
    sideZipperLength: 8,
    sideZipperSide: "right",
    zipperGap: 0.25,
    recessDepth: 1.5,
    recessEndGap: 0.5,
    recessEndStyle: "boxed",
    recessNotch: 0.75,
  },
  outerDesign: defaultOuterPanelDesign,
  mirror: true,
  toolMode: "select",
  snapStep: 0.25,
  fabricSettings: {
    source: "bolt",
    fatQuarterWidth: 21,
    fatQuarterLength: 18,
    allowFatQuarterRotation: false,
  },
  previewYaw: 90,
};

const empty = createDefaultBagStudioState(fallback);
same(empty.schemaVersion, BAG_STUDIO_SCHEMA_VERSION, "default state has the current schema");
same(empty.workingCopy.snapshot, fallback, "default state preserves the supplied snapshot");
same(empty.savedBags, [], "default state starts with no named bags");

const custom: BagStudioSnapshot = {
  ...fallback,
  closure: "side-zipper",
  basis: "cut",
  draft: { ...fallback.draft, cutWidth: 22.5, cornerCut: 2.5 },
  closureOptions: {
    ...fallback.closureOptions,
    sideZipperSide: "left",
    sideZipperLength: 10,
    recessEndStyle: "boxed",
    recessNotch: 1,
  },
  outerDesign: {
    ...fallback.outerDesign,
    mode: "block-grid",
    rows: 7,
    columns: 7,
    blockSize: 2.5,
    blockSizeBasis: "cut",
    contrastEnabled: true,
  },
  snapStep: 1,
  fabricSettings: {
    source: "fat-quarters",
    fatQuarterWidth: 22,
    fatQuarterLength: 18,
    allowFatQuarterRotation: true,
  },
  previewYaw: 350,
};
const savedAt = "2026-08-26T18:00:00.000Z";
const serialized = JSON.stringify({
  schemaVersion: BAG_STUDIO_SCHEMA_VERSION,
  workingCopy: {
    name: "  Patchwork   market tote  ",
    activeSavedBagId: "bag-1",
    activeTab: "saved",
    snapshot: custom,
  },
  savedBags: [
    {
      id: "bag-1",
      name: "Patchwork market tote",
      createdAt: savedAt,
      updatedAt: savedAt,
      snapshot: custom,
    },
  ],
});
const restored = parseBagStudioState(serialized, fallback);
same(restored.workingCopy.name, "Patchwork market tote", "working name is normalized");
same(restored.workingCopy.activeTab, "saved", "active tab is restored");
same(restored.workingCopy.activeSavedBagId, "bag-1", "active named bag is restored");
same(restored.workingCopy.snapshot, custom, "every canonical draft setting round-trips");
same(restored.savedBags.length, 1, "named bag collection round-trips");
same(restored.savedBags[0]?.snapshot.closureOptions.sideZipperSide, "left", "side zipper side survives a save");
same(restored.savedBags[0]?.snapshot.closureOptions.recessEndStyle, "boxed", "recessed zipper end style survives a save");
same(restored.savedBags[0]?.snapshot.closureOptions.recessNotch, 1, "recessed zipper notch survives a save");
same(restored.savedBags[0]?.snapshot.fabricSettings.source, "fat-quarters", "fat-quarter mode survives a save");
same(restored.savedBags[0]?.snapshot.outerDesign.blockSizeBasis, "cut", "cut-square interpretation survives a save");
same(restored.savedBags[0]?.snapshot.previewYaw, 350, "3D orbit position survives a save");
same(restored.savedBags[0]?.snapshot.snapStep, 1, "whole-inch cutting grid survives a save");

const repaired = normalizeBagStudioSnapshot(
  {
    closure: "not-a-closure",
    previewYaw: -10,
    closureOptions: { sideZipperSide: "middle" },
    fabricSettings: { fatQuarterWidth: Number.NaN },
  },
  fallback,
);
same(repaired.closure, fallback.closure, "unknown closure falls back safely");
same(repaired.closureOptions.sideZipperSide, "right", "unknown zipper side falls back safely");
same(repaired.fabricSettings.fatQuarterWidth, 21, "non-finite fabric size falls back safely");
same(repaired.previewYaw, 350, "negative orbit values normalize around the bag");
same(normalizePreviewYaw(720), 0, "full rotations normalize to the front");

const legacyRecessed = normalizeBagStudioSnapshot(
  {
    ...fallback,
    closure: "recessed-zipper",
    closureOptions: {
      ...fallback.closureOptions,
      recessEndStyle: undefined,
    },
  },
  fallback,
);
same(legacyRecessed.closureOptions.recessEndStyle, "open", "saved recessed designs from before boxed ends keep the original open-end construction");

const legacyNonRecessed = normalizeBagStudioSnapshot(
  {
    ...fallback,
    closure: "open-tote",
    closureOptions: {
      ...fallback.closureOptions,
      recessEndStyle: undefined,
    },
  },
  fallback,
);
same(legacyNonRecessed.closureOptions.recessEndStyle, "boxed", "older non-recessed bags receive the new boxed default when recessed zipper is selected later");

const duplicateIds = parseBagStudioState(
  JSON.stringify({
    workingCopy: { snapshot: fallback },
    savedBags: [
      { id: "same", name: "First", createdAt: savedAt, updatedAt: savedAt, snapshot: fallback },
      { id: "same", name: "Second", createdAt: savedAt, updatedAt: savedAt, snapshot: fallback },
    ],
  }),
  fallback,
);
same(duplicateIds.savedBags.length, 1, "duplicate stored IDs are removed");
same(parseBagStudioState("broken json", fallback), empty, "corrupt storage recovers to a usable draft");
yes(bagStudioStorageKey("user! 42") !== bagStudioStorageKey("other"), "browser storage is separated by signed-in owner");

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    },
  },
});
yes(writeBagStudioState(restored, "owner-1"), "browser write reports success");
same(readBagStudioState(fallback, "owner-1"), restored, "browser read restores the last working copy and named bags");
same(readBagStudioState(fallback, "owner-2"), empty, "another owner does not receive the first owner’s saves");

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem() {
        throw new Error("storage blocked");
      },
      setItem() {
        throw new Error("storage blocked");
      },
    },
  },
});
same(readBagStudioState(fallback, "owner-1"), empty, "blocked browser reads recover without crashing hydration");
same(writeBagStudioState(restored, "owner-1"), false, "blocked browser writes report failure without crashing");

process.stdout.write(`${checks} bag-studio storage checks passed\n`);

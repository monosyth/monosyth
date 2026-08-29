import { draftFromFinishedSize, type BagBodyRecipe, type BagClosure  } from "@/lib/sewing/bag-pattern";
import { BagStructureFeel, BagPocketStyle, BagBoxyHandleStyle, BagBoxyBoxingMethod, BagStudioSizeBasis, BagStudioToolMode, BagStudioSnapStep, BagStudioClosureOptions, BagStudioFabricSettings, BagStudioSnapshot } from "@/lib/sewing/bag-studio-storage";
import { ToteHandleOptions } from "@/lib/sewing/tote-handle";

export const closureChoices: ReadonlyArray<{
      id: BagClosure;
      label: string;
      short: string;
      description: string;
    }> = [
      {
        id: "open-tote",
        label: "Open tote",
        short: "TOTE",
        description: "Lined rim + handles",
      },
      {
        id: "top-zipper",
        label: "Top zipper",
        short: "TOP ZIP",
        description: "Zipper in the top seam",
      },
      {
        id: "side-zipper",
        label: "Side zipper",
        short: "SIDE ZIP",
        description: "Opening in one side seam",
      },
      {
        id: "zipper-gusset",
        label: "Zipper gusset",
        short: "GUSSET",
        description: "Four-strip zipper panel",
      },
      {
        id: "recessed-zipper",
        label: "Recessed zipper",
        short: "RECESSED",
        description: "Boxed or open inset panel",
      },
    ] as const;
export const bodyRecipeChoices: ReadonlyArray<{
      id: BodyRecipe;
      label: string;
      short: string;
      description: string;
    }> = [
      {
        id: "two-panel-tote",
        label: "Tote body",
        short: "2 LOWER CORNERS",
        description: "Front + back panels with boxed bottom corners",
      },
      {
        id: "four-corner-boxy",
        label: "Boxy zipper bag",
        short: "4 CORNERS / PANEL",
        description: "Rectangular pouch with a centered structural zipper",
      },
    ] as const;
export const seamPresets = [0.25, 0.375, 0.5] as const;
export const cornerPresets = [1, 1.5, 2, 2.5, 3] as const;
export const sizePresets: ReadonlyArray<BagSizePreset> = [
      // Boxy bag presets
      {
        id: "boxy-pencil",
        label: "Pencil & Tool Case",
        dimensions: "8″ × 2½″ × 2½″",
        description: "Slim zippered organizer for pens, rotary cutters, and tools",
        bodyRecipe: "four-corner-boxy",
        baseWidth: 8,
        depth: 2.5,
        height: 2.5,
      },
      {
        id: "boxy-dopp",
        label: "Classic Dopp Kit",
        dimensions: "9″ × 4½″ × 4½″",
        description: "Standard boxed toiletry and travel pouch",
        bodyRecipe: "four-corner-boxy",
        baseWidth: 9,
        depth: 4.5,
        height: 4.5,
      },
      {
        id: "boxy-makeup",
        label: "Boxy Makeup Bag",
        dimensions: "12″ × 9″ cut",
        description: "Shannon's 12 Days of Summer Sewing Day 7 — starts with 12″ × 9″ cut rectangles with pinch-and-sew French corner seams",
        bodyRecipe: "four-corner-boxy",
        baseWidth: 8,
        depth: 3.5,
        height: 5,
      },
      {
        id: "boxy-caddy",
        label: "Large Travel Caddy",
        dimensions: "11″ × 6″ × 5″",
        description: "Spacious boxy organizer for electronics, toiletries, or sewing projects",
        bodyRecipe: "four-corner-boxy",
        baseWidth: 11,
        depth: 6,
        height: 5,
      },
      // Tote presets
      {
        id: "tote-book",
        label: "Book & Craft Tote",
        dimensions: "11″ × 13″ × 3″",
        description: "Upright daily tote sized for notebooks, tablets, and small crafts",
        bodyRecipe: "two-panel-tote",
        baseWidth: 11,
        height: 13,
        depth: 3,
      },
      {
        id: "tote-market",
        label: "Everyday Market Tote",
        dimensions: "14″ × 12″ × 4″",
        description: "Classic grocery and carry-all tote with balanced base and rim",
        bodyRecipe: "two-panel-tote",
        baseWidth: 14,
        height: 12,
        depth: 4,
      },
      {
        id: "tote-weekender",
        label: "Weekender Tote",
        dimensions: "18″ × 15″ × 6″",
        description: "Generous travel tote with deep boxed bottom",
        bodyRecipe: "two-panel-tote",
        baseWidth: 18,
        height: 15,
        depth: 6,
      },
    ];
export const structureChoices: ReadonlyArray<{
      id: BagStructureFeel;
      label: string;
      material: string;
      description: string;
    }> = [
      {
        id: "draped",
        label: "Soft & Draped",
        material: "Uninterfaced",
        description: "Flexible, packable feel for market totes or lightweight pouches",
      },
      {
        id: "woven-interfaced",
        label: "Light Structure",
        material: "Fusible woven (SF101)",
        description: "Standard body for cotton or linen without stiffness",
      },
      {
        id: "fleece-padded",
        label: "Padded Fleece",
        material: "Fusible fleece (987F)",
        description: "Pillowy protection; auto-trimmed 1/2″ inside edges to keep seams flat",
      },
      {
        id: "foam-standing",
        label: "Stand-Up Foam",
        material: "Sew-in foam (Soft & Stable)",
        description: "Lightweight 3D structure that holds its shape even when empty",
      },
    ];
export const pocketChoices: ReadonlyArray<{
      id: BagPocketStyle;
      label: string;
      description: string;
    }> = [
      {
        id: "none",
        label: "No pocket",
        description: "Clean, simple single-cavity interior",
      },
      {
        id: "single-slip",
        label: "Single slip pocket",
        description: "Wide interior patch pocket for phone, keys, or notebook",
      },
      {
        id: "divided-slip",
        label: "Divided slip pocket",
        description: "Dual-compartment patch pocket with center divider stitch line",
      },
    ];
export const boxyHandleChoices: ReadonlyArray<{
      id: BagBoxyHandleStyle;
      label: string;
      detail: string;
      description: string;
    }> = [
      {
        id: "side-handle",
        label: "Side carry loop",
        detail: "1× 3″ × 9″ strip",
        description: "Sturdy carry loop across one boxed end (like Shannon's Makeup Bag)",
      },
      {
        id: "grab-tabs",
        label: "2× Pinch tabs",
        detail: "2× 2″ × 2½″ tabs",
        description: "Compact pull tabs at both zipper ends for easy opening and closing",
      },
      {
        id: "both",
        label: "Strap + Tab",
        detail: "1 loop + 1 tab",
        description: "Side carry loop on one end, pinch pull tab on the other",
      },
      {
        id: "none",
        label: "Clean ends",
        detail: "No tabs",
        description: "Plain minimalist boxed corners with no external tabs",
      },
    ];
export const boxyBoxingChoices: ReadonlyArray<{
      id: BagBoxyBoxingMethod;
      label: string;
      detail: string;
      description: string;
    }> = [
      {
        id: "pinch-french-seam",
        label: "Pinch & French Seam",
        detail: "Shannon's method (no cutouts)",
        description: "Sew full rectangles, pinch 3″ corner triangles outside, trim, and enclose raw edges in French seams",
      },
      {
        id: "four-corner-cut",
        label: "Pre-cut 4 Corner Squares",
        detail: "Flat-pack cutouts",
        description: "Mark and remove corner squares before assembly for classic boxed corners",
      },
    ];
export const studioSteps: ReadonlyArray<{
      id: StudioStep;
      number: string;
      label: string;
      description: string;
    }> = [
      {
        id: "cuts",
        number: "1",
        label: "Easy cuts",
        description: "Choose simple starting rectangles, seams, corners, and shape.",
      },
      {
        id: "build",
        number: "2",
        label: "Panels + opening",
        description: "Build the outer panels, place handles, and choose the closure.",
      },
      {
        id: "plan",
        number: "3",
        label: "Fabric + cut plan",
        description: "Lay pieces on yardage or fat quarters, then print the plan.",
      },
    ] as const;
export const defaultDraft = draftFromFinishedSize({
      baseWidth: 14,
      height: 12,
      depth: 4,
      seamAllowance: 0.25,
      fabricWidth: 44,
    });
export const defaultBoxyDraft = draftFromFinishedBoxyBag({
      length: 8,
      width: 3.5,
      height: 5,
      seamAllowance: 0.25,
      fabricWidth: 44,
    });
export const defaultClosureOptions: ClosureOptions = {
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
    };
export const defaultFabricSettings: BagStudioFabricSettings = {
      source: "bolt",
      fatQuarterWidth: 21,
      fatQuarterLength: 18,
      allowFatQuarterRotation: false,
    };
export const defaultStudioSnapshot: BagStudioSnapshot = {
      bodyRecipe: "two-panel-tote",
      closure: "open-tote",
      basis: "cut",
      draft: defaultDraft,
      boxyDraft: defaultBoxyDraft,
      closureOptions: defaultClosureOptions,
      outerDesign: defaultOuterPanelDesign,
      structureFeel: "woven-interfaced",
      pocketStyle: "none",
      pullTabs: true,
      mirror: true,
      toolMode: "select",
      snapStep: 0.5,
      fabricSettings: defaultFabricSettings,
      previewYaw: 30,
    };

export type SizeBasis = BagStudioSizeBasis;
export type BodyRecipe = BagBodyRecipe;
export type ToolMode = BagStudioToolMode;
export type SnapStep = BagStudioSnapStep;
export type StudioStep = "cuts" | "build" | "plan";
export type DragHandle = | "left"
      | "right"
      | "top"
      | "bottom"
      | "corner"
      | "shape-left"
      | "shape-right";
export type ClosureOptions = BagStudioClosureOptions & ToteHandleOptions;
export type CutPiece = {
      material: "outer" | "contrast" | "lining" | "interfacing" | "handle";
      name: string;
      quantity: number;
      width: number;
      height: number;
      note: string;
    };
import { draftFromFinishedBoxyBag } from '@/lib/sewing/boxy-bag';
export type BagSizePreset = {
  id: string;
  label: string;
  dimensions: string;
  description: string;
  bodyRecipe: BodyRecipe;
  baseWidth: number;
  height: number;
  depth: number;
};
import { defaultOuterPanelDesign } from '@/lib/sewing/panel-composition';

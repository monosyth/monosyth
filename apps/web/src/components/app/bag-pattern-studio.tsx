"use client";

import Link from "next/link";
import {
  memo,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import styles from "@/app/app/bag-studio/bag-studio.module.css";
import { BagOutcomePreview } from "@/components/app/bag-outcome-preview";
import { BagPanelComposer } from "@/components/app/bag-panel-composer";
import { useAuth } from "@/components/auth/auth-provider";
import {
  calculateBagPatternPlan,
  calculateBodyFabricLayout,
  calculateFatQuarterPieceLayout,
  calculateInterfacingPlan,
  calculatePanelStitchGeometry,
  calculatePocketPlan,
  clamp,
  draftFromFinishedSize,
  formatDecimal,
  formatInches,
  formatYards,
  snapMeasurement,
  type BagBodyRecipe,
  type BagClosure,
  type BagPatternDraft,
  type BagPatternPlan,
  type InterfacingPlan,
  type PocketPlan,
} from "@/lib/sewing/bag-pattern";
import {
  boxyBagFormulaText,
  calculateBoxyBagKit,
  calculateBoxyBagPlan,
  draftFromFinishedBoxyBag,
} from "@/lib/sewing/boxy-bag";
import {
  calculateOuterPanelComposition,
  defaultOuterPanelDesign,
  type OuterPanelComposition,
  type OuterPanelDesign,
} from "@/lib/sewing/panel-composition";
import {
  calculateToteHandlePlan,
  handlePlacementInstruction,
  type ToteHandleOptions,
  type ToteHandlePlan,
} from "@/lib/sewing/tote-handle";
import {
  BAG_STUDIO_SCHEMA_VERSION,
  MAX_SAVED_BAGS,
  createSavedBagId,
  decodeBagStudioShare,
  encodeBagStudioShare,
  readBagStudioState,
  writeBagStudioState,
  type BagBoxyBoxingMethod,
  type BagBoxyHandleStyle,
  type BagPocketStyle,
  type BagStructureFeel,
  type BagStudioClosureOptions,
  type BagStudioFabricSettings,
  type BagStudioSizeBasis,
  type BagStudioSnapshot,
  type BagStudioSnapStep,
  type BagStudioStoredState,
  type BagStudioTab,
  type BagStudioToolMode,
  type SavedBagDesign,
} from "@/lib/sewing/bag-studio-storage";
import {
  calculateRecessedZipperKit,
  recessedPanelFinishedLength,
} from "@/lib/sewing/recessed-zipper";
import { calculateFrenchCornerPlan } from "@/lib/sewing/corner-construction";

type SizeBasis = BagStudioSizeBasis;
type BodyRecipe = BagBodyRecipe;
type ToolMode = BagStudioToolMode;
type SnapStep = BagStudioSnapStep;
type StudioStep = "cuts" | "build" | "plan";
type DragHandle =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "corner"
  | "shape-left"
  | "shape-right";

type ClosureOptions = BagStudioClosureOptions & ToteHandleOptions;

type CutPiece = {
  material: "outer" | "contrast" | "lining" | "interfacing" | "handle";
  name: string;
  quantity: number;
  width: number;
  height: number;
  note: string;
};

const closureChoices: ReadonlyArray<{
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

const bodyRecipeChoices: ReadonlyArray<{
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

const seamPresets = [0.25, 0.375, 0.5] as const;
const cornerPresets = [1, 1.5, 2, 2.5, 3] as const;

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

const sizePresets: ReadonlyArray<BagSizePreset> = [
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
    dimensions: "14″ × 11″ cut",
    description: "Shannon's 12 Days of Summer Sewing Day 7 — starts with 14″ × 11″ cut rectangles with pinch-and-sew French corner seams",
    bodyRecipe: "four-corner-boxy",
    baseWidth: 9,
    depth: 4.5,
    height: 6,
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

const structureChoices: ReadonlyArray<{
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

const pocketChoices: ReadonlyArray<{
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

const boxyHandleChoices: ReadonlyArray<{
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

const boxyBoxingChoices: ReadonlyArray<{
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

const studioSteps: ReadonlyArray<{
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

const defaultDraft = draftFromFinishedSize({
  baseWidth: 14,
  height: 12,
  depth: 4,
  seamAllowance: 0.25,
  fabricWidth: 44,
});

const defaultBoxyDraft = draftFromFinishedBoxyBag({
  length: 9,
  width: 4.5,
  height: 6,
  seamAllowance: 0.25,
  fabricWidth: 44,
});

const defaultClosureOptions: ClosureOptions = {
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

const defaultFabricSettings: BagStudioFabricSettings = {
  source: "bolt",
  fatQuarterWidth: 21,
  fatQuarterLength: 18,
  allowFatQuarterRotation: false,
};

const defaultStudioSnapshot: BagStudioSnapshot = {
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

function outerDesignForBody(
  bodyRecipe: BodyRecipe,
  design: OuterPanelDesign,
): OuterPanelDesign {
  return bodyRecipe === "four-corner-boxy"
    ? { ...design, contrastEnabled: false }
    : design;
}

function cleanInput(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function savedBagCopyName(name: string, savedBags: SavedBagDesign[]) {
  const base = `${name.trim() || "Untitled bag"} copy`;
  const existing = new Set(savedBags.map((saved) => saved.name.toLocaleLowerCase()));
  if (!existing.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  while (existing.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
  return `${base} ${suffix}`;
}

function formatSavedBagTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function standingTopRimWidth(plan: BagPatternPlan) {
  return Math.max(0, plan.finishedTopOpening - plan.finishedDepth);
}

function finishedSideSeamLength(plan: BagPatternPlan) {
  return Math.hypot(
    plan.finishedHeight,
    (standingTopRimWidth(plan) - plan.finishedBaseWidth) / 2,
  );
}

function getCutPieces(
  plan: BagPatternPlan,
  bodyRecipe: BodyRecipe,
  closure: BagClosure,
  options: ClosureOptions,
  composition: OuterPanelComposition,
  handlePlan: ToteHandlePlan,
  structureFeel: BagStructureFeel = "woven-interfaced",
  pocketStyle: BagPocketStyle = "none",
  pullTabs = true,
  boxyHandleStyle: BagBoxyHandleStyle = "side-handle",
  boxyBoxingMethod: BagBoxyBoxingMethod = "pinch-french-seam",
): CutPiece[] {
  const interfacing = calculateInterfacingPlan(plan, structureFeel);
  const pocket = calculatePocketPlan(plan, pocketStyle);
  const isFrenchSeam = bodyRecipe === "four-corner-boxy" && boxyBoxingMethod === "pinch-french-seam";
  const pieces: CutPiece[] = [
    ...composition.cutPieces,
    {
      material: "lining",
      name: bodyRecipe === "four-corner-boxy"
        ? "Boxy lining panel"
        : "Main lining panel",
      quantity: 2,
      width: plan.boundingCutWidth,
      height: plan.cutHeight,
      note: bodyRecipe === "four-corner-boxy"
        ? isFrenchSeam
          ? "Cut full matching rectangles (do NOT pre-cut corners). Corners are pinched and French-seamed after tube assembly."
          : `Mark and remove a ${formatInches(plan.cornerCut)} square from all four corners of each panel.`
        : "Use the same corner and shaping marks as the outer.",
    },
  ];

  if (interfacing.quantity > 0) {
    pieces.push({
      material: "interfacing",
      name: `Interfacing (${interfacing.materialName.split(" (")[0]})`,
      quantity: interfacing.quantity,
      width: interfacing.cutWidth,
      height: interfacing.cutHeight,
      note: interfacing.bulkRelief
        ? `${interfacing.recommendation} Cut 1/2″ inside outer edges to keep seam allowances flat.`
        : interfacing.recommendation,
    });
  }

  if (pocket.style !== "none") {
    pieces.push({
      material: "lining",
      name: pocket.style === "divided-slip" ? "Divided slip pocket" : "Interior slip pocket",
      quantity: 1,
      width: pocket.cutWidth,
      height: pocket.cutHeight,
      note: `Finishes ${formatInches(pocket.finishedWidth)} wide × ${formatInches(pocket.finishedHeight)} high. Top edge includes 1″ double-fold hem; bottom and sides include 1/2″ turn-under.`,
    });
  }

  if (bodyRecipe === "four-corner-boxy") {
    const kit = calculateBoxyBagKit(plan);
    const style = boxyHandleStyle ?? (pullTabs ? "grab-tabs" : "none");
    if (isFrenchSeam) {
      pieces.push({
        material: "outer",
        name: "Zipper end tab (3″ × 3″)",
        quantity: 2,
        width: 3,
        height: 3,
        note: "Fold in half over zipper tape ends and topstitch before assembling tube ends (Shannon's method).",
      });
      if (style === "side-handle" || style === "both") {
        pieces.push({
          material: "outer",
          name: "Side carry loop strap",
          quantity: 1,
          width: 4,
          height: 9,
          note: "Fold in fourths lengthwise to 1″ wide. Edgestitch both edges and baste across one boxed end seam.",
        });
      }
    } else {
      if (style === "grab-tabs" || style === "both") {
        pieces.push({
          material: "outer",
          name: "Zipper grab tab",
          quantity: style === "both" ? 1 : kit.pullTabQuantity,
          width: kit.pullTabCutWidth,
          height: kit.pullTabCutLength,
          note: "Fold in half lengthwise to make 1″ × 2″ grab tabs. Baste over zipper tape ends before boxing.",
        });
      }
      if (style === "side-handle" || style === "both") {
        pieces.push({
          material: "outer",
          name: "Side carry loop strap",
          quantity: kit.sideHandleQuantity,
          width: kit.sideHandleCutWidth,
          height: kit.sideHandleCutLength,
          note: "Fold in fourths lengthwise to 3/4″ wide. Baste into carry loop across one boxed end seam.",
        });
      }
    }
  }

  if (closure === "open-tote") {
    pieces.push({
      material: options.handleMaterial === "webbing" ? "handle" : "outer",
      name: options.handleMaterial === "webbing" ? "Webbing handle" : "Quarter-fold fabric handle",
      quantity: 2,
      width: handlePlan.cutWidth,
      height: handlePlan.cutLength,
      note: options.handleMaterial === "webbing"
        ? `Finished ${formatInches(options.handleWidth)} wide; includes 1/2 inch turned under at each end and 1/2 inch total matching allowance.`
        : `Quarter-fold to ${formatInches(options.handleWidth)} finished width; includes end turns and pressing allowance.`,
    });
  }

  if (bodyRecipe === "two-panel-tote" && closure === "top-zipper") {
    pieces.push({
      material: "outer",
      name: "Zipper tab square",
      quantity: 2,
      width: 2.5,
      height: 2.5,
      note: "Fold around the zipper ends, then trim to the tape width.",
    });
  }

  if (closure === "zipper-gusset") {
    const stripWidth =
      Math.max(0, plan.finishedDepth - options.zipperGap) / 2 +
      plan.seamAllowance * 2;
    const stripLength = standingTopRimWidth(plan) + 1;
    pieces.push(
      {
        material: "outer",
        name: "Zipper-gusset strip",
        quantity: 2,
        width: stripLength,
        height: stripWidth,
        note: "Make slightly long, assemble around the zipper, then trim to the standing rim span between side seams.",
      },
      {
        material: "lining",
        name: "Zipper-gusset lining",
        quantity: 2,
        width: stripLength,
        height: stripWidth,
        note: "Pairs with the outer strips around the zipper tape.",
      },
    );
  }

  if (closure === "recessed-zipper") {
    const kit = calculateRecessedZipperKit(plan, options);
    pieces.push(
      {
        material: "outer",
        name: kit.endStyle === "boxed"
          ? "Boxed zipper outer panel"
          : "Open-end zipper outer strip",
        quantity: 2,
        width: kit.cutLength,
        height: kit.cutWidth,
        note: kit.endStyle === "boxed"
          ? `From the zipper-edge corners, remove two ${formatInches(kit.notch)} squares from each panel.`
          : "Free ends finish short of the side seams by the chosen end gap.",
      },
      {
        material: "lining",
        name: kit.endStyle === "boxed"
          ? "Boxed zipper lining panel"
          : "Open-end zipper lining strip",
        quantity: 2,
        width: kit.cutLength,
        height: kit.cutWidth,
        note: kit.endStyle === "boxed"
          ? `Cut to match the outer panels, including two ${formatInches(kit.notch)} zipper-edge notches per panel.`
          : "Cut to match the two exterior zipper strips.",
      },
    );
  }

  return pieces;
}

function zipperNote(
  plan: BagPatternPlan,
  bodyRecipe: BodyRecipe,
  closure: BagClosure,
  options: ClosureOptions,
) {
  if (bodyRecipe === "four-corner-boxy") {
    const kit = calculateBoxyBagKit(plan);
    return `Centered structural zipper: the raw sewing span between the two upper corner squares is ${formatInches(kit.installedZipperSeam)}. Start with ${formatInches(kit.recommendedZipperLength)} or longer nylon coil zipper tape so roughly 1 inch extends past each upper cutout for handling. Keep metal stops outside every stitch and trim line, and trim only after the ends are secured.`;
  }
  switch (closure) {
    case "open-tote": {
      const handlePlan = calculateToteHandlePlan(plan, options);
      return `Handles: cut 2 ${options.handleMaterial === "webbing" ? "webbing lengths" : "fabric strips"} at ${formatInches(handlePlan.cutLength)} × ${formatInches(handlePlan.cutWidth)}. Place centers ${formatInches(options.handleInset)} from each finished front corner, ${formatInches(handlePlan.centerSpacing)} apart; secure ${formatInches(options.handleAttachmentDepth)} below the rim for a ${formatInches(options.handleDrop)} inside drop.`;
    }
    case "top-zipper":
      return `Flat-top zipper: use ${formatInches(plan.finishedTopOpening + 2)} or longer and trim after the tabs are added.`;
    case "side-zipper":
      return `${options.sideZipperSide === "left" ? "Left" : "Right"} side-seam zipper opening: ${formatInches(options.sideZipperLength)}. Keep both stops clear of the boxed-corner zone.`;
    case "zipper-gusset":
      return `Zipper: ${formatInches(standingTopRimWidth(plan) + 2)} or longer. Finished reveal between folds: ${formatInches(options.zipperGap)}.`;
    case "recessed-zipper":
      if (options.recessEndStyle === "boxed") {
        const kit = calculateRecessedZipperKit(plan, options);
        return `Boxed zipper boat: the zipper seam spans ${formatInches(kit.zipperSeamSpan)} between the notches. Start with ${formatInches(kit.recommendedZipperLength)} or longer nylon coil zipper tape so there is handling room at both ends, then trim after boxing. Keep metal stops outside every stitch and trim line. Each of the four panels gets two ${formatInches(kit.notch)} zipper-edge notches (8 notches total), producing an approximately ${formatInches(kit.boxedEndWidth)} boxed end with matching seam allowances.`;
      }
      return `Open-end inset panel: ${formatInches(recessedPanelFinishedLength(plan, options.recessEndGap))} finished length with ${formatInches(options.recessEndGap)} free at each end.`;
  }
}

function closureTeaching(
  bodyRecipe: BodyRecipe,
  closure: BagClosure,
  options: ClosureOptions,
) {
  if (bodyRecipe === "four-corner-boxy") {
    return "The zipper is the center seam of the full top face. The two upper squares form the zipper ends, the two lower squares form the bottom corners, and all four stay the same size for a true rectangular box.";
  }
  switch (closure) {
    case "open-tote":
      return "The top take-up is one matching seam allowance for a lined rim. Center each handle on the marks and reinforce the full box-and-X area from behind; a double-fold hem needs its own larger top allowance.";
    case "top-zipper":
      return "The two flat top stitch lines meet at the zipper, collapsing the opening into a ridge. Zipper length means the teeth/stop span, not the loose tape beyond it.";
    case "side-zipper":
      return "A zipper replacing part of a side seam changes sewing order, not the shell dimensions. A welt pocket is a separate pattern system.";
    case "zipper-gusset":
      return "The two symmetric strips are sized from the finished gusset width, zipper reveal, zipper seam, and outer attachment seam.";
    case "recessed-zipper":
      return options.recessEndStyle === "boxed"
        ? "Boxed ends make an enclosed zipper boat. The little zipper-panel notches are separate from the large body corner squares; cut them only after all four zipper panels are labeled."
        : "Open ends make a floating zipper panel. The end gap and strip depth stay editable because they control side access and the recess.";
  }
}

function boxyBagSewingSteps(
  plan: BagPatternPlan,
  structureFeel: BagStructureFeel = "woven-interfaced",
  pocketStyle: BagPocketStyle = "none",
  pullTabs = true,
  boxyHandleStyle: BagBoxyHandleStyle = "side-handle",
  boxyBoxingMethod: BagBoxyBoxingMethod = "pinch-french-seam",
) {
  if (boxyBoxingMethod === "pinch-french-seam") {
    return [
      "1. Fuse fleece & quilt outer: Fuse 11″ × 14″ fusible fleece to the wrong side of both outer fabric rectangles. Use a fabric pen to mark quilting lines and quilt as desired (e.g. 1″ vertical channel lines). If using a brand label, stitch it centered 1.5″ below the top zipper edge now.",
      "2. Tape & layer zipper: Apply double-sided wash-away fabric tape along the top raw edge of Outer A. Separate your 16″ nylon zipper; stick one half teeth face-down on the tape. Apply another strip of fabric tape over the zipper tape, place Lining A face-down on top, and sew across using the fabric edge as a guide (ensures an even margin of zipper tape).",
      "3. Press & topstitch: Press both pieces nice and flat along the seam line, then topstitch along the zipper. Press lining down. Repeat the exact same taping and sewing steps for Outer B and Lining B.",
      "4. Zipper slider & end tabs: Re-thread the zipper slider onto both halves to zip the two panels together. Fold the 3″ × 3″ fabric tabs over both zipper ends, sew across, and trim excess zipper ends flush with the fabric edges.",
      "5. Outer & lining bottom seams: Fold outer panels right sides together, clip, and sew the bottom seam all the way across. Fold lining panels right sides together, clip, and sew across the bottom seam leaving a 4″ space in the center for turning.",
      "6. Tube fold & end seams (CRITICAL): OPEN YOUR ZIPPER AT LEAST HALFWAY NOW! Flatten the bag tube so the outer and lining bottom seams align directly with the center zipper line. Clip both short ends and sew all the way across both ends through all layers.",
      "7. Clip corners & turn: Clip the 4 outer corner points at 45° (do not cut thread stitches) and trim excess seam allowance. Pull the bag right-side out through the lining turning hole. Fold the raw edges of the opening inward and sew the lining opening closed.",
      `8. The "Pinch & Measure" triangles: Turn right-side out, smooth out the lining, and poke all corners out completely. From the outside, pinch each of the 4 corners into an isosceles triangle with the seam centered down the middle. Use an acrylic ruler to measure and mark a 3″ line straight across the triangle base on all four corners. Check for wrinkles, then sew across all four marked lines.`,
      "9. Trim & attach carry handle: Trim the excess triangle fabric super close to the stitching line (approx. 1/8″, do not cut your threads!). Fold the 4″ × 9″ handle piece lengthwise in fourths to create a 1″ wide strap, edgestitch both sides, and baste it looped across one boxed end seam.",
      "10. Enclosed French seams & final turn: Turn the bag wrong-side out again through the open zipper and push the four corners out. Sew a second enclosing seam (approx. 1/4″ to 3/8″ inside the fold) on all four corners to completely encase the raw edges. Turn right-side out — all four boxed corners are cleanly enclosed with zero exposed raw edges!",
    ];
  }

  const steps = [
    structureFeel === "draped"
      ? "Label every panel and its zipper edge."
      : "Label every panel and its zipper edge. Fuse or baste interfacing/stabilizer to the two unnotched outer rectangles first.",
    `After piecing, quilting, and final trimming, remove a ${formatInches(plan.cornerCut)} square from all four corners of every panel.`,
  ];

  if (pocketStyle !== "none") {
    steps.push(
      `Prepare pocket: press top hem under 1/2″ twice and topstitch. Turn under remaining 3 raw edges 1/2″, center on Lining A panel 1.5″ above lower corner notches, and topstitch sides and bottom${pocketStyle === "divided-slip" ? " (sew vertical center divider line)" : ""}.`,
    );
  }

  steps.push(
    "Sandwich one zipper side between Outer A and Lining A; sew and topstitch. Repeat with the B panels.",
  );

  if (boxyHandleStyle === "side-handle" || boxyHandleStyle === "both") {
    steps.push(
      "Prepare side carry strap: fold strip in fourths lengthwise to 3/4″ wide, and edgestitch both sides.",
    );
  }

  if (boxyHandleStyle === "grab-tabs" || (boxyHandleStyle === undefined && pullTabs)) {
    steps.push(
      "Fold both 2″ × 2½″ grab tabs in half. Baste one tab centered over zipper tape at each end with fold pointing toward bag center.",
    );
  } else if (boxyHandleStyle === "side-handle") {
    steps.push(
      "Loop side carry strap across one zipper end, aligning raw ends with raw cutout edge below zipper center; baste in place.",
    );
  } else if (boxyHandleStyle === "both") {
    steps.push(
      "Baste grab tab at one zipper end, and loop side carry strap across opposite zipper end; baste both before boxing.",
    );
  }

  steps.push(
    `Arrange outer panels right sides together and lining panels right sides together. Sew only the straight side seams between the cutouts with the selected ${formatInches(plan.seamAllowance)} allowance.`,
    "Close the zipper almost fully, keeping the pull out of the seam area. At one upper opening, align the outer and lining side seams with the zipper center, then sew one combined boxed-end seam through the four fabric layers, nylon zipper, and handle/tab. Repeat at the other zipper end.",
    "Open the zipper fully. Sew the outer bottom seam, then the lining bottom seam while leaving a generous turning gap.",
    `Match and sew the four remaining lower openings separately with the selected ${formatInches(plan.seamAllowance)} allowance: two outer box seams and two lining box seams.`,
    "Turn through the lining gap, check both zipper ends, close the gap, and gently shape the finished box.",
  );

  return steps;
}

function toteBagSewingSteps(
  plan: BagPatternPlan,
  closure: BagClosure,
  options: ClosureOptions,
  structureFeel: BagStructureFeel = "woven-interfaced",
  pocketStyle: BagPocketStyle = "none",
) {
  const steps = [
    structureFeel === "draped"
      ? "Label outer and lining panels and mark centerlines."
      : "Label outer and lining panels; fuse or baste interfacing/stabilizer to outer panels first.",
  ];

  if (pocketStyle !== "none") {
    steps.push(
      `Prepare pocket: press top hem under 1/2″ twice and topstitch. Turn under side and bottom edges 1/2″, center on Lining A panel, and topstitch sides and bottom${pocketStyle === "divided-slip" ? " with center divider line" : ""}.`,
    );
  }

  if (closure === "open-tote") {
    steps.push(
      `Attach handles: position centers ${formatInches(options.handleInset)} from finished front corners, secure ${formatInches(options.handleAttachmentDepth)} below rim with reinforced Box-and-X stitching.`,
    );
  }

  steps.push(
    `Sew outer front to outer back at side seams and bottom with ${formatInches(plan.seamAllowance)} allowance. Box both bottom corners.`,
    `Sew lining front to back at side seams and bottom, leaving a 4–5″ turning gap in the bottom seam. Box lining bottom corners.`,
    closure === "open-tote"
      ? "Nest outer bag inside lining right sides together, match side seams and top rim, sew around top rim. Turn right side out through lining gap, press, close gap, and topstitch rim."
      : "Insert and assemble chosen closure subassembly, join lining and outer, turn through lining gap, press, and topstitch.",
  );

  return steps;
}

function buildPlanText(
  plan: BagPatternPlan,
  bodyRecipe: BodyRecipe,
  closure: BagClosure,
  options: ClosureOptions,
  pieces: CutPiece[],
  composition: OuterPanelComposition,
  handlePlan: ToteHandlePlan,
  structureFeel: BagStructureFeel = "woven-interfaced",
  pocketStyle: BagPocketStyle = "none",
  pullTabs = true,
  boxyHandleStyle: BagBoxyHandleStyle = "side-handle",
  boxyBoxingMethod: BagBoxyBoxingMethod = "pinch-french-seam",
) {
  const closureLabel =
    closureChoices.find((choice) => choice.id === closure)?.label ?? closure;
  const bodyLabel = bodyRecipeChoices.find(
    (choice) => choice.id === bodyRecipe,
  )?.label ?? bodyRecipe;
  const sewingSteps = bodyRecipe === "four-corner-boxy"
    ? boxyBagSewingSteps(plan, structureFeel, pocketStyle, pullTabs, boxyHandleStyle, boxyBoxingMethod)
    : toteBagSewingSteps(plan, closure, options, structureFeel, pocketStyle);
  const lines = [
    "MONOSYTH BAG PATTERN STUDIO",
    `${bodyLabel} · ${closureLabel}`,
    "",
    bodyRecipe === "four-corner-boxy"
      ? `Finished box: ${formatInches(plan.finishedBaseWidth)} L × ${formatInches(plan.finishedDepth)} W × ${formatInches(plan.finishedHeight)} H`
      : `Finished base: ${formatInches(plan.finishedBaseWidth)} W × ${formatInches(plan.finishedHeight)} H × ${formatInches(plan.finishedDepth)} D`,
    ...(bodyRecipe === "four-corner-boxy"
      ? [
          `Zipper-edge sewing span between upper squares: ${formatInches(plan.finishedFlatWidth)}`,
          ...boxyBagFormulaText(plan),
        ]
      : [
          `Flat/top width before shaping: ${formatInches(plan.finishedFlatWidth)}`,
          `Flat top seam after shaping: ${formatInches(plan.finishedTopOpening)}`,
          `Approximate standing rim width: ${formatInches(standingTopRimWidth(plan))}`,
        ]),
    `Seam allowance: ${formatInches(plan.seamAllowance)}`,
    `Raw-edge corner square: ${formatInches(plan.cornerCut)} × ${formatInches(plan.cornerCut)}`,
    bodyRecipe === "four-corner-boxy"
      ? `Corner rule: ${formatInches(plan.cornerCut)} × 2 = ${formatInches(plan.finishedDepth)} finished width; cut all four corners of every panel`
      : `Corner rule: ${formatInches(plan.cornerCut)} × 2 = ${formatInches(plan.finishedDepth)} finished depth`,
    "",
    "STRUCTURE & INTERFACING",
    structureChoices.find((c) => c.id === structureFeel)?.label ?? structureFeel,
    calculateInterfacingPlan(plan, structureFeel).recommendation,
    "",
    "OUTER PANEL BUILD",
    `${composition.modeLabel}${composition.design.mode !== "solid" ? ` — ${composition.scopeLabel}` : ""}`,
    ...(composition.design.mode !== "solid"
      ? [
          `Piecing allowance: ${formatInches(composition.design.piecingAllowance)} (separate from the bag seam allowance)`,
          `Assembled slab: ${formatInches(composition.sewnWidth)} × ${formatInches(composition.sewnHeight)}; final outer blank: ${formatInches(composition.targetWidth)} × ${formatInches(composition.targetHeight)}`,
        ]
      : []),
    ...(composition.design.contrastEnabled
      ? [`Contrast bottom: ${formatInches(composition.design.contrastRise)} finished rise; cut band height ${formatInches(composition.contrastCutHeight)}; join allowance ${formatInches(composition.design.piecingAllowance)}`]
      : []),
    ...composition.instructions.map((instruction, index) => `${index + 1}. ${instruction}`),
    "",
    "CUT LIST",
    ...pieces.map(
      (piece) =>
        `${piece.quantity}× ${piece.name} (${piece.material}): ${formatInches(piece.width)} × ${formatInches(piece.height)} — ${piece.note}`,
    ),
    "",
    "SEWING ORDER",
    ...sewingSteps.map(
      (instruction, index) => `${index + 1}. ${instruction}`,
    ),
    "",
    zipperNote(plan, bodyRecipe, closure, options),
    ...(closure === "recessed-zipper" && options.recessEndStyle === "boxed"
      ? [
          `Closure-notch reminder: cut two ${formatInches(options.recessNotch)} squares from the zipper-edge corners of every recessed panel (8 notches total).`,
          "These closure notches shape the zipper boat; they do not change the bag depth set by the main-panel corner squares.",
        ]
      : []),
    ...(closure === "open-tote"
      ? [
          handlePlacementInstruction(handlePlan),
          `Flat-panel center marks: ${formatInches(handlePlan.rawLeftCenter)} and ${formatInches(handlePlan.rawRightCenter)} from the panel's left raw edge; finished rim line ${formatInches(handlePlan.rawRimY)} below the raw top.`,
        ]
      : []),
    "",
    "REFERENCE",
    bodyRecipe === "four-corner-boxy"
      ? "Measure every corner square from both raw edges. The four equal squares form the zipper-end and bottom box seams; use the same allowance on the zipper, side, bottom, and box seams."
      : "Corner squares are measured from the raw side and bottom edges. This shortcut assumes the side, bottom, and corner seams use the same allowance.",
    "For thick foam, vinyl, or canvas, sew a scrap test because turn-of-cloth changes the usable inside size.",
    bodyRecipe === "four-corner-boxy"
      ? "Keep the pull away from each combined zipper-end seam, then open the zipper fully before sewing the bottom seams."
      : "Open the zipper at least halfway before closing the shell.",
  ];

  return lines.join("\n");
}

function downloadPatternSvg(
  plan: BagPatternPlan,
  composition: OuterPanelComposition,
  closure: BagClosure,
  handlePlan: ToteHandlePlan,
) {
  const pixelsPerInch = 96;
  const margin = 0.75;
  const footer = 1.75;
  const topLeft = plan.leftTopInset;
  const topRight = plan.cutWidth - plan.rightTopInset;
  const minX = Math.min(0, topLeft);
  const maxX = Math.max(plan.cutWidth, topRight);
  const pageWidth = maxX - minX + margin * 2;
  const pageHeight = plan.cutHeight + margin * 2 + footer;
  const shiftX = margin - minX;
  const shiftY = margin;
  const scale = pixelsPerInch;
  const x = (value: number) => (value + shiftX) * scale;
  const y = (value: number) => (value + shiftY) * scale;
  const c = plan.cornerCut;
  const w = plan.cutWidth;
  const h = plan.cutHeight;
  const stitchGeometry = calculatePanelStitchGeometry(plan);
  const outline = [
    `M ${x(topLeft)} ${y(0)}`,
    `L ${x(topRight)} ${y(0)}`,
    `L ${x(w)} ${y(h - c)}`,
    `L ${x(w - c)} ${y(h - c)}`,
    `L ${x(w - c)} ${y(h)}`,
    `L ${x(c)} ${y(h)}`,
    `L ${x(c)} ${y(h - c)}`,
    `L ${x(0)} ${y(h - c)}`,
    "Z",
  ].join(" ");
  const seam = plan.seamAllowance * scale;
  const stitchOutline = [
    `M ${x(stitchGeometry.topLeft.x)} ${y(stitchGeometry.topLeft.y)}`,
    `L ${x(stitchGeometry.topRight.x)} ${y(stitchGeometry.topRight.y)}`,
    `L ${x(stitchGeometry.rightSideBottom.x)} ${y(stitchGeometry.rightSideBottom.y)}`,
    `L ${x(stitchGeometry.rightBoxLineX)} ${y(stitchGeometry.boxLineY)}`,
    `L ${x(stitchGeometry.rightBoxLineX)} ${y(stitchGeometry.bottomRight.y)}`,
    `L ${x(stitchGeometry.leftBoxLineX)} ${y(stitchGeometry.bottomLeft.y)}`,
    `L ${x(stitchGeometry.leftBoxLineX)} ${y(stitchGeometry.boxLineY)}`,
    `L ${x(stitchGeometry.leftSideBottom.x)} ${y(stitchGeometry.leftSideBottom.y)}`,
    "Z",
  ].join(" ");
  const compositionBottom = composition.contrastJoinY ?? h;
  const compositionLines: string[] = [];
  const blankMinX = minX;
  const blankWidth = plan.boundingCutWidth;

  if (composition.design.mode === "vertical-strips") {
    for (const seamX of composition.columnSeams) {
      const lineX = blankMinX + seamX;
      compositionLines.push(
        `<line x1="${x(lineX)}" y1="${y(0)}" x2="${x(lineX)}" y2="${y(compositionBottom)}"/>`,
      );
    }
  }
  if (
    composition.design.mode === "horizontal-strips" ||
    composition.design.mode === "block-grid"
  ) {
    for (const lineY of composition.rowSeams) {
      compositionLines.push(
        `<line x1="${x(blankMinX)}" y1="${y(lineY)}" x2="${x(blankMinX + blankWidth)}" y2="${y(lineY)}"/>`,
      );
    }
  }
  if (composition.design.mode === "block-grid") {
    for (const seamX of composition.columnSeams) {
      const lineX = blankMinX + seamX;
      compositionLines.push(
        `<line x1="${x(lineX)}" y1="${y(0)}" x2="${x(lineX)}" y2="${y(compositionBottom)}"/>`,
      );
    }
  }

  const contrastMarkup = composition.contrastJoinY === null
    ? ""
    : `<rect x="${x(blankMinX)}" y="${y(composition.contrastJoinY)}" width="${blankWidth * scale}" height="${(h - composition.contrastJoinY) * scale}" fill="#d9edf0" clip-path="url(#cut-shape)"/>
  <line x1="${x(blankMinX)}" y1="${y(composition.contrastJoinY)}" x2="${x(blankMinX + blankWidth)}" y2="${y(composition.contrastJoinY)}" stroke="#b95c00" stroke-width="2" stroke-dasharray="10 6" clip-path="url(#cut-shape)"/>`;
  const compositionMarkup = compositionLines.length
    ? `<g fill="none" stroke="#7458a8" stroke-width="1.5" stroke-dasharray="5 4" clip-path="url(#cut-shape)">${compositionLines.join("\n")}</g>`
    : "";
  const handleMarkup = closure === "open-tote"
    ? [handlePlan.rawLeftCenter, handlePlan.rawRightCenter]
        .map(
          (center) => `<rect x="${x(center - handlePlan.handleWidth / 2)}" y="${y(handlePlan.rawRimY)}" width="${handlePlan.handleWidth * scale}" height="${handlePlan.handleAttachmentDepth * scale}" fill="none" stroke="#b95c00" stroke-width="2" stroke-dasharray="8 5" clip-path="url(#cut-shape)"/>
  <line x1="${x(center)}" y1="${y(0)}" x2="${x(center)}" y2="${y(handlePlan.rawAttachmentEndY)}" stroke="#b95c00" stroke-width="1.5" stroke-dasharray="4 4" clip-path="url(#cut-shape)"/>`,
        )
        .join("\n")
    : "";
  const calibrationY = (plan.cutHeight + margin + 0.35) * scale;
  const labelX = pageWidth * scale - margin * scale;
  const compositionScope = composition.design.mode === "solid"
    ? "FRONT + BACK"
    : composition.scopeLabel.toUpperCase();
  const fileName = `monosyth-bag-panel-${formatDecimal(plan.cutWidth)}x${formatDecimal(plan.cutHeight)}.svg`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}in" height="${pageHeight}in" viewBox="0 0 ${pageWidth * scale} ${pageHeight * scale}">
  <rect width="100%" height="100%" fill="white"/>
  <defs><clipPath id="cut-shape"><path d="${outline}"/></clipPath></defs>
  <path d="${outline}" fill="#fffdf8" stroke="#151c32" stroke-width="2"/>
  <path d="${outline}" fill="none" stroke="#f6b94b" stroke-opacity=".24" stroke-width="${seam * 2}" clip-path="url(#cut-shape)"/>
  ${contrastMarkup}
  ${compositionMarkup}
  <path d="${stitchOutline}" fill="none" stroke="#147d91" stroke-width="2" stroke-dasharray="8 6" stroke-linejoin="round"/>
  ${handleMarkup}
  <line x1="${x(w / 2)}" y1="${y(0.8)}" x2="${x(w / 2)}" y2="${y(h - 1)}" stroke="#65708b" stroke-width="1.5" stroke-dasharray="14 8"/>
  <text x="${x(w / 2)}" y="${y(h / 2)}" text-anchor="middle" font-family="monospace" font-size="18" fill="#151c32">MAIN PANEL · ${composition.modeLabel.toUpperCase()} · ${compositionScope}</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 28}" text-anchor="middle" font-family="monospace" font-size="14" fill="#65708b">CUT LINE SOLID · STITCH LINE DASHED · GRAINLINE CENTER</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 54}" text-anchor="middle" font-family="monospace" font-size="14" fill="#65708b">CORNER ${formatInches(c)} · SEAM ${formatInches(plan.seamAllowance)}</text>
  ${closure === "open-tote" ? `<text x="${x(w / 2)}" y="${y(h / 2) + 80}" text-anchor="middle" font-family="monospace" font-size="14" fill="#b95c00">HANDLE MARKS REPEAT ON BOTH OUTER FACES</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 102}" text-anchor="middle" font-family="monospace" font-size="14" fill="#b95c00">CENTERS ${formatInches(handlePlan.handleInset)} FROM FINISHED FRONT CORNERS · ${formatInches(handlePlan.handleWidth)} WIDE</text>` : ""}
  <rect x="${margin * scale}" y="${calibrationY}" width="${scale}" height="${scale}" fill="none" stroke="#151c32" stroke-width="2"/>
  <text x="${margin * scale}" y="${calibrationY - 10}" font-family="monospace" font-size="13" fill="#151c32">1-INCH CALIBRATION SQUARE</text>
  <text x="${labelX}" y="${calibrationY + 36}" text-anchor="end" font-family="monospace" font-size="13" fill="#151c32">PRINT AT ACTUAL SIZE / 100%</text>
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBoxyPatternSvg(plan: BagPatternPlan) {
  const scale = 96;
  const margin = 0.75;
  const footer = 1.75;
  const pageWidth = plan.cutWidth + margin * 2;
  const pageHeight = plan.cutHeight + margin * 2 + footer;
  const x = (value: number) => (value + margin) * scale;
  const y = (value: number) => (value + margin) * scale;
  const w = plan.cutWidth;
  const h = plan.cutHeight;
  const c = plan.cornerCut;
  const s = plan.seamAllowance;
  const outline = [
    `M ${x(c)} ${y(0)}`,
    `L ${x(w - c)} ${y(0)}`,
    `L ${x(w - c)} ${y(c)}`,
    `L ${x(w)} ${y(c)}`,
    `L ${x(w)} ${y(h - c)}`,
    `L ${x(w - c)} ${y(h - c)}`,
    `L ${x(w - c)} ${y(h)}`,
    `L ${x(c)} ${y(h)}`,
    `L ${x(c)} ${y(h - c)}`,
    `L ${x(0)} ${y(h - c)}`,
    `L ${x(0)} ${y(c)}`,
    `L ${x(c)} ${y(c)}`,
    "Z",
  ].join(" ");
  const calibrationY = (plan.cutHeight + margin + 0.35) * scale;
  const labelX = pageWidth * scale - margin * scale;
  const fileName = `monosyth-boxy-panel-${formatDecimal(w)}x${formatDecimal(h)}.svg`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}in" height="${pageHeight}in" viewBox="0 0 ${pageWidth * scale} ${pageHeight * scale}">
  <rect width="100%" height="100%" fill="white"/>
  <path d="${outline}" fill="#f4f0ff" stroke="#151c32" stroke-width="2" stroke-linejoin="round"/>
  <g fill="none" stroke="#147d91" stroke-width="2" stroke-dasharray="8 6">
    <line x1="${x(c)}" y1="${y(s)}" x2="${x(w - c)}" y2="${y(s)}"/>
    <line x1="${x(c)}" y1="${y(h - s)}" x2="${x(w - c)}" y2="${y(h - s)}"/>
    <line x1="${x(s)}" y1="${y(c)}" x2="${x(s)}" y2="${y(h - c)}"/>
    <line x1="${x(w - s)}" y1="${y(c)}" x2="${x(w - s)}" y2="${y(h - c)}"/>
  </g>
  <line x1="${x(w / 2)}" y1="${y(c + 0.35)}" x2="${x(w / 2)}" y2="${y(h - c - 0.35)}" stroke="#65708b" stroke-width="1.5" stroke-dasharray="14 8"/>
  <text x="${x(w / 2)}" y="${y(c / 2)}" text-anchor="middle" font-family="monospace" font-size="16" font-weight="700" fill="#a05a00">TOP / ZIPPER EDGE · ${formatInches(plan.finishedFlatWidth)} BETWEEN SQUARES</text>
  <text x="${x(w / 2)}" y="${y(h / 2) - 16}" text-anchor="middle" font-family="monospace" font-size="19" font-weight="700" fill="#151c32">FOUR-CORNER BOXY PANEL</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 14}" text-anchor="middle" font-family="monospace" font-size="15" fill="#151c32">CUT 2 OUTER · CUT 2 LINING · OPTIONAL INTERFACING</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 42}" text-anchor="middle" font-family="monospace" font-size="14" fill="#65708b">CUT ${formatInches(w)} × ${formatInches(h)} · REMOVE ${formatInches(c)} FROM ALL 4 CORNERS</text>
  <text x="${x(w / 2)}" y="${y(h / 2) + 68}" text-anchor="middle" font-family="monospace" font-size="14" fill="#65708b">SEAM ${formatInches(s)} · SOLID CUT · DASHED FLAT SEAMS</text>
  <rect x="${margin * scale}" y="${calibrationY}" width="${scale}" height="${scale}" fill="none" stroke="#151c32" stroke-width="2"/>
  <text x="${margin * scale}" y="${calibrationY - 10}" font-family="monospace" font-size="13" fill="#151c32">1-INCH CALIBRATION SQUARE</text>
  <text x="${labelX}" y="${calibrationY + 36}" text-anchor="end" font-family="monospace" font-size="13" fill="#151c32">PRINT AT ACTUAL SIZE / 100%</text>
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function MeasurementField({
  label,
  hint,
  value,
  step = 0.125,
  min = 0,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  const stepAmount = step || 0.125;
  const decrement = () => {
    onChange(Math.max(min, snapMeasurement(value - stepAmount, stepAmount)));
  };
  const increment = () => {
    onChange(snapMeasurement(value + stepAmount, stepAmount));
  };

  return (
    <div className={styles.measureField}>
      <label className={styles.measureLabel}>
        <strong>{label}</strong>
        <small>{hint}</small>
      </label>
      <div className={styles.measureControlRow}>
        <button
          type="button"
          className={styles.stepperButton}
          onClick={decrement}
          title={`Decrease by ${formatInches(stepAmount)}`}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className={styles.measureInput}>
          <input
            type="number"
            inputMode="decimal"
            value={formatDecimal(value, 3)}
            min={min}
            step={step}
            onChange={(event) => onChange(cleanInput(event.target.valueAsNumber))}
          />
          <b>in</b>
        </span>
        <button
          type="button"
          className={styles.stepperButton}
          onClick={increment}
          title={`Increase by ${formatInches(stepAmount)}`}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Handle({
  x,
  y,
  label,
  value,
  min,
  max,
  valueText,
  kind = "round",
  axis,
  onPointerDown,
  onKeyDown,
}: {
  x: number;
  y: number;
  label: string;
  value: number;
  min: number;
  max: number;
  valueText: string;
  kind?: "round" | "diamond" | "corner";
  axis?: "horizontal" | "vertical";
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
  onKeyDown: (event: KeyboardEvent<SVGGElement>) => void;
}) {
  return (
    <g
      className={`${styles.vectorHandle} ${kind === "round" ? "" : styles[`vectorHandle_${kind}`]} ${axis ? styles[`handle_${axis}`] : ""}`}
      transform={`translate(${x} ${y})`}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      {kind === "diamond" ? (
        <path d="M0 -10L10 0 0 10-10 0Z" />
      ) : kind === "corner" ? (
        <path d="M-10 -10H10V10H-10Z" />
      ) : (
        <circle r="10" />
      )}
      <circle className={styles.handleCore} r="3" />
    </g>
  );
}

function PatternCanvas({
  draft,
  plan,
  composition,
  closure,
  handlePlan,
  mirror,
  snapStep,
  toolMode,
  onDraftChange,
  onUseCutBasis,
}: {
  draft: BagPatternDraft;
  plan: BagPatternPlan;
  composition: OuterPanelComposition;
  closure: BagClosure;
  handlePlan: ToteHandlePlan;
  mirror: boolean;
  snapStep: SnapStep;
  toolMode: ToolMode;
  onDraftChange: (draft: BagPatternDraft) => void;
  onUseCutBasis: () => void;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    handle: DragHandle;
    pointerId: number;
    startX: number;
    startY: number;
    draft: BagPatternDraft;
    offset: { x: number; y: number };
    scale: number;
    screenToViewX: number;
    screenToViewY: number;
  } | null>(null);

  const scale = Math.min(
    19,
    570 / Math.max(plan.boundingCutWidth + 4, 20),
    350 / Math.max(plan.cutHeight + 4, 16),
  );
  const centerX = 380 + offset.x * scale;
  const centerY = 262 + offset.y * scale;
  const left = centerX - (plan.cutWidth * scale) / 2;
  const right = centerX + (plan.cutWidth * scale) / 2;
  const top = centerY - (plan.cutHeight * scale) / 2;
  const bottom = centerY + (plan.cutHeight * scale) / 2;
  const cut = plan.cornerCut * scale;
  const topLeft = left + plan.leftTopInset * scale;
  const topRight = right - plan.rightTopInset * scale;
  const seam = Math.max(3, plan.seamAllowance * scale);
  const stitchGeometry = calculatePanelStitchGeometry(plan);
  const stitchX = (value: number) => left + value * scale;
  const stitchY = (value: number) => top + value * scale;
  const outline = [
    `M ${topLeft} ${top}`,
    `L ${topRight} ${top}`,
    `L ${right} ${bottom - cut}`,
    `L ${right - cut} ${bottom - cut}`,
    `L ${right - cut} ${bottom}`,
    `L ${left + cut} ${bottom}`,
    `L ${left + cut} ${bottom - cut}`,
    `L ${left} ${bottom - cut}`,
    "Z",
  ].join(" ");
  const stitchOutline = [
    `M ${stitchX(stitchGeometry.topLeft.x)} ${stitchY(stitchGeometry.topLeft.y)}`,
    `L ${stitchX(stitchGeometry.topRight.x)} ${stitchY(stitchGeometry.topRight.y)}`,
    `L ${stitchX(stitchGeometry.rightSideBottom.x)} ${stitchY(stitchGeometry.rightSideBottom.y)}`,
    `L ${stitchX(stitchGeometry.rightBoxLineX)} ${stitchY(stitchGeometry.boxLineY)}`,
    `L ${stitchX(stitchGeometry.rightBoxLineX)} ${stitchY(stitchGeometry.bottomRight.y)}`,
    `L ${stitchX(stitchGeometry.leftBoxLineX)} ${stitchY(stitchGeometry.bottomLeft.y)}`,
    `L ${stitchX(stitchGeometry.leftBoxLineX)} ${stitchY(stitchGeometry.boxLineY)}`,
    `L ${stitchX(stitchGeometry.leftSideBottom.x)} ${stitchY(stitchGeometry.leftSideBottom.y)}`,
    "Z",
  ].join(" ");
  const blankMinX = Math.min(0, plan.leftTopInset);
  const blankWidth = plan.boundingCutWidth;
  const compositionBottom = composition.contrastJoinY ?? plan.cutHeight;
  const compositionTopY = stitchY(0);
  const compositionBottomY = stitchY(compositionBottom);
  const blankLeft = stitchX(blankMinX);
  const blankRight = stitchX(blankMinX + blankWidth);

  function beginDrag(
    handle: DragHandle,
    event: PointerEvent<SVGGElement>,
  ) {
    event.preventDefault();
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    svg?.setPointerCapture(event.pointerId);
    dragRef.current = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      draft,
      offset,
      scale,
      screenToViewX: bounds?.width ? 760 / bounds.width : 1,
      screenToViewY: bounds?.height ? 520 / bounds.height : 1,
    };
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx =
      ((event.clientX - active.startX) * active.screenToViewX) /
      active.scale;
    const dy =
      ((event.clientY - active.startY) * active.screenToViewY) /
      active.scale;
    const start = active.draft;
    const applySnap = (value: number) =>
      snapStep === 0 ? value : snapMeasurement(value, snapStep);
    const mirrorFactor = mirror ? 2 : 1;
    const minWidth = start.cornerCut * 2 + start.seamAllowance * 2 + 2;
    const minHeight =
      start.cornerCut + start.seamAllowance + start.topTakeUp + 2;
    let next = start;

    if (active.handle === "left") {
      const delta = applySnap(dx);
      const cutWidth = clamp(
        applySnap(start.cutWidth - delta * mirrorFactor),
        minWidth,
        60,
      );
      const actualHandleDelta =
        (start.cutWidth - cutWidth) / mirrorFactor;
      next = {
        ...start,
        cutWidth,
      };
      setOffset({
        ...active.offset,
        x: mirror
          ? active.offset.x
          : active.offset.x + actualHandleDelta / 2,
      });
    }

    if (active.handle === "right") {
      const delta = applySnap(dx);
      const cutWidth = clamp(
        applySnap(start.cutWidth + delta * mirrorFactor),
        minWidth,
        60,
      );
      const actualHandleDelta =
        (cutWidth - start.cutWidth) / mirrorFactor;
      next = {
        ...start,
        cutWidth,
      };
      setOffset({
        ...active.offset,
        x: mirror
          ? active.offset.x
          : active.offset.x + actualHandleDelta / 2,
      });
    }

    if (active.handle === "top") {
      const delta = applySnap(dy);
      const cutHeight = clamp(
        applySnap(start.cutHeight - delta * mirrorFactor),
        minHeight,
        50,
      );
      const actualHandleDelta =
        (start.cutHeight - cutHeight) / mirrorFactor;
      next = {
        ...start,
        cutHeight,
      };
      setOffset({
        ...active.offset,
        y: mirror
          ? active.offset.y
          : active.offset.y + actualHandleDelta / 2,
      });
    }

    if (active.handle === "bottom") {
      const delta = applySnap(dy);
      const cutHeight = clamp(
        applySnap(start.cutHeight + delta * mirrorFactor),
        minHeight,
        50,
      );
      const actualHandleDelta =
        (cutHeight - start.cutHeight) / mirrorFactor;
      next = {
        ...start,
        cutHeight,
      };
      setOffset({
        ...active.offset,
        y: mirror
          ? active.offset.y
          : active.offset.y + actualHandleDelta / 2,
      });
    }

    if (active.handle === "corner") {
      const delta = applySnap((-dx - dy) / 2);
      const maxCorner = Math.min(
        start.cutWidth / 2 - start.seamAllowance - 1,
        start.cutHeight / 2 - 0.5,
      );
      next = {
        ...start,
        cornerCut: clamp(
          applySnap(start.cornerCut + delta),
          0.5,
          maxCorner,
        ),
      };
    }

    if (active.handle === "shape-left") {
      const value = clamp(
        applySnap(start.leftTopInset + dx),
        -3,
        start.cutWidth / 3,
      );
      next = {
        ...start,
        leftTopInset: value,
        rightTopInset: mirror ? value : start.rightTopInset,
      };
    }

    if (active.handle === "shape-right") {
      const value = clamp(
        applySnap(start.rightTopInset - dx),
        -3,
        start.cutWidth / 3,
      );
      next = {
        ...start,
        rightTopInset: value,
        leftTopInset: mirror ? value : start.leftTopInset,
      };
    }

    onUseCutBasis();
    onDraftChange(next);
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function nudge(handle: DragHandle, event: KeyboardEvent<SVGGElement>) {
    const step = snapStep || 0.125;
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
    if (!horizontal && !vertical) return;
    event.preventDefault();
    const xDirection = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const yDirection = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const factor = mirror ? 2 : 1;
    let next = draft;

    if (handle === "left" && horizontal) {
      next = { ...draft, cutWidth: Math.max(3, draft.cutWidth - xDirection * step * factor) };
    }
    if (handle === "right" && horizontal) {
      next = { ...draft, cutWidth: Math.max(3, draft.cutWidth + xDirection * step * factor) };
    }
    if (handle === "top" && vertical) {
      next = { ...draft, cutHeight: Math.max(3, draft.cutHeight - yDirection * step * factor) };
    }
    if (handle === "bottom" && vertical) {
      next = { ...draft, cutHeight: Math.max(3, draft.cutHeight + yDirection * step * factor) };
    }
    if (handle === "corner" && (horizontal || vertical)) {
      const direction = xDirection || yDirection;
      next = {
        ...draft,
        cornerCut: clamp(draft.cornerCut + direction * step, 0.5, draft.cutHeight / 2 - 0.5),
      };
    }
    if (handle === "shape-left" && horizontal) {
      const value = clamp(draft.leftTopInset + xDirection * step, -3, draft.cutWidth / 3);
      next = { ...draft, leftTopInset: value, rightTopInset: mirror ? value : draft.rightTopInset };
    }
    if (handle === "shape-right" && horizontal) {
      const value = clamp(draft.rightTopInset - xDirection * step, -3, draft.cutWidth / 3);
      next = { ...draft, rightTopInset: value, leftTopInset: mirror ? value : draft.leftTopInset };
    }

    onUseCutBasis();
    onDraftChange(next);
  }

  return (
    <div className={styles.canvasFrame}>
      <svg
        className={styles.patternCanvas}
        viewBox="0 0 760 520"
        role="group"
        aria-roledescription="interactive vector pattern editor"
        aria-label={`Editable bag panel, ${formatInches(plan.cutWidth)} by ${formatInches(plan.cutHeight)}, with ${formatInches(plan.seamAllowance)} seam allowance, ${formatInches(plan.cornerCut)} boxed corner cutouts, and a ${composition.modeLabel.toLowerCase()} outer build${composition.design.contrastEnabled ? " with a contrast bottom" : ""}${closure === "open-tote" ? " plus measured handle marks" : ""}`}
        onPointerMove={pointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <pattern id="quarter-grid" width={scale / 4} height={scale / 4} patternUnits="userSpaceOnUse">
            <path d={`M ${scale / 4} 0 H 0 V ${scale / 4}`} className={styles.gridFine} />
          </pattern>
          <pattern id="inch-grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <rect width={scale} height={scale} fill="url(#quarter-grid)" />
            <path d={`M ${scale} 0 H 0 V ${scale}`} className={styles.gridInch} />
          </pattern>
          <clipPath id="panel-clip">
            <path d={outline} />
          </clipPath>
        </defs>

        <rect className={styles.canvasPaper} x="12" y="12" width="736" height="496" rx="18" />
        <rect x="12" y="12" width="736" height="496" rx="18" fill="url(#inch-grid)" />
        <line className={styles.centerGuide} x1={centerX} y1="38" x2={centerX} y2="486" />
        <line className={styles.centerGuide} x1="34" y1={centerY} x2="726" y2={centerY} />

        <path className={styles.panelShadow} d={outline} transform="translate(5 7)" />
        <path className={styles.panelFill} d={outline} />
        <g className={styles.compositionOverlay} clipPath="url(#panel-clip)" aria-hidden="true">
          {composition.contrastJoinY !== null ? (
            <rect
              className={styles.compositionContrast}
              x={blankLeft}
              y={compositionBottomY}
              width={blankRight - blankLeft}
              height={bottom - compositionBottomY}
            />
          ) : null}
          {composition.design.mode === "vertical-strips" || composition.design.mode === "block-grid"
            ? composition.columnSeams.map((seamX, index) => {
                const lineX = blankLeft + seamX * scale;
                return <line key={`column-${index}`} x1={lineX} y1={compositionTopY} x2={lineX} y2={compositionBottomY} />;
              })
            : null}
          {composition.design.mode === "horizontal-strips" || composition.design.mode === "block-grid"
            ? composition.rowSeams.map((seamY, index) => {
                const lineY = stitchY(seamY);
                return <line key={`row-${index}`} x1={blankLeft} y1={lineY} x2={blankRight} y2={lineY} />;
              })
            : null}
          {composition.contrastJoinY !== null ? (
            <line className={styles.compositionJoin} x1={blankLeft} y1={compositionBottomY} x2={blankRight} y2={compositionBottomY} />
          ) : null}
        </g>
        <path
          className={styles.allowanceBand}
          d={outline}
          clipPath="url(#panel-clip)"
          style={{ strokeWidth: seam * 2.1 }}
        />
        <path className={styles.cutLine} d={outline} />

        <path className={styles.stitchLines} d={stitchOutline} />

        {closure === "open-tote" ? (
          <g className={styles.handlePlacementMarks} clipPath="url(#panel-clip)" aria-hidden="true">
            {[handlePlan.rawLeftCenter, handlePlan.rawRightCenter].map((center, index) => (
              <g key={index}>
                <rect
                  x={stitchX(center - handlePlan.handleWidth / 2)}
                  y={stitchY(handlePlan.rawRimY)}
                  width={handlePlan.handleWidth * scale}
                  height={handlePlan.handleAttachmentDepth * scale}
                  rx="3"
                />
                <line
                  x1={stitchX(center)}
                  y1={top}
                  x2={stitchX(center)}
                  y2={stitchY(handlePlan.rawAttachmentEndY)}
                />
                <path
                  d={`M ${stitchX(center - handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.48)} L ${stitchX(center + handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.78)} M ${stitchX(center + handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.48)} L ${stitchX(center - handlePlan.handleWidth * 0.34)} ${stitchY(handlePlan.rawRimY + handlePlan.handleAttachmentDepth * 0.78)}`}
                />
              </g>
            ))}
            <text x={centerX} y={stitchY(handlePlan.rawAttachmentEndY) + 17}>
              HANDLE CENTERS · {formatInches(handlePlan.handleInset)} FROM FINISHED FRONT CORNERS · {formatInches(handlePlan.centerSpacing)} APART
            </text>
          </g>
        ) : null}

        <g className={styles.grainLine}>
          <line x1={centerX} y1={top + 58} x2={centerX} y2={bottom - 72} />
          <path d={`M ${centerX} ${top + 46} l -6 12 h 12 Z`} />
          <path d={`M ${centerX} ${bottom - 60} l -6 -12 h 12 Z`} />
          <text x={centerX + 12} y={centerY} transform={`rotate(-90 ${centerX + 12} ${centerY})`}>GRAIN / CENTER</text>
        </g>

        <g className={styles.dimensionLine}>
          <line x1={left} y1={top - 25} x2={right} y2={top - 25} />
          <path d={`M ${left} ${top - 25} l 8 -5 v 10 Z`} />
          <path d={`M ${right} ${top - 25} l -8 -5 v 10 Z`} />
          <text x={centerX} y={top - 34}>{formatInches(plan.cutWidth)} CUT WIDTH</text>

          <line x1={right + 30} y1={top} x2={right + 30} y2={bottom} />
          <path d={`M ${right + 30} ${top} l -5 8 h 10 Z`} />
          <path d={`M ${right + 30} ${bottom} l -5 -8 h 10 Z`} />
          <text x={right + 48} y={centerY} transform={`rotate(90 ${right + 48} ${centerY})`}>{formatInches(plan.cutHeight)} CUT HEIGHT</text>
        </g>

        <g className={styles.cornerMeasure}>
          <path d={`M ${right - cut} ${bottom - cut - 18} v 12 h ${cut} v -12`} />
          <text x={right - cut / 2} y={bottom - cut - 25}>{formatInches(plan.cornerCut)} RAW-EDGE SQUARE</text>
          <path d={`M ${right - cut + 9} ${bottom - cut} v 9 h -9`} />
          <text x={right - cut - 14} y={bottom - cut + 26}>90°</text>
        </g>

        <g className={styles.seamCallout}>
          <line x1={topLeft + 28} y1={top + seam} x2={topLeft + 68} y2={top + 42} />
          <rect x={topLeft + 58} y={top + 29} width="108" height="28" rx="6" />
          <text x={topLeft + 112} y={top + 48}>{formatInches(plan.seamAllowance)} ALLOWANCE</text>
        </g>

        <g className={styles.angleMarks}>
          <path d={`M ${topLeft + 28} ${top} Q ${topLeft + 9} ${top + 9} ${topLeft + 6} ${top + 30}`} />
          <text x={topLeft + 17} y={top + 49}>{Math.round(plan.leftTopAngle)}°</text>
          <path d={`M ${topRight - 28} ${top} Q ${topRight - 9} ${top + 9} ${topRight - 6} ${top + 30}`} />
          <text x={topRight - 17} y={top + 49}>{Math.round(plan.rightTopAngle)}°</text>
        </g>

        <g className={styles.panelLabel}>
          <text x={centerX} y={centerY - 14}>MAIN BODY PANEL</text>
          <text x={centerX} y={centerY + 14}>{composition.modeLabel.toUpperCase()} · {composition.design.mode === "solid" ? "BOTH FACES" : composition.scopeLabel.toUpperCase()}</text>
          <text x={centerX} y={centerY + 39}>SOLID = CUT · DASHED = STITCH</text>
        </g>

        {toolMode === "select" ? (
          <>
            <Handle x={left} y={centerY} label="Resize left edge" value={draft.cutWidth} min={3} max={60} valueText={`${formatInches(draft.cutWidth)} panel cut width`} axis="horizontal" onPointerDown={(event) => beginDrag("left", event)} onKeyDown={(event) => nudge("left", event)} />
            <Handle x={right} y={centerY} label="Resize right edge" value={draft.cutWidth} min={3} max={60} valueText={`${formatInches(draft.cutWidth)} panel cut width`} axis="horizontal" onPointerDown={(event) => beginDrag("right", event)} onKeyDown={(event) => nudge("right", event)} />
            <Handle x={centerX} y={top} label="Resize top edge" value={draft.cutHeight} min={3} max={50} valueText={`${formatInches(draft.cutHeight)} panel cut height`} axis="vertical" onPointerDown={(event) => beginDrag("top", event)} onKeyDown={(event) => nudge("top", event)} />
            <Handle x={centerX} y={bottom} label="Resize bottom edge" value={draft.cutHeight} min={3} max={50} valueText={`${formatInches(draft.cutHeight)} panel cut height`} axis="vertical" onPointerDown={(event) => beginDrag("bottom", event)} onKeyDown={(event) => nudge("bottom", event)} />
          </>
        ) : (
          <>
            <Handle x={topLeft} y={top} label="Shape top-left angle" value={draft.leftTopInset} min={-3} max={draft.cutWidth / 3} valueText={`${formatInches(draft.leftTopInset)} top-left inset`} kind="diamond" axis="horizontal" onPointerDown={(event) => beginDrag("shape-left", event)} onKeyDown={(event) => nudge("shape-left", event)} />
            <Handle x={topRight} y={top} label="Shape top-right angle" value={draft.rightTopInset} min={-3} max={draft.cutWidth / 3} valueText={`${formatInches(draft.rightTopInset)} top-right inset`} kind="diamond" axis="horizontal" onPointerDown={(event) => beginDrag("shape-right", event)} onKeyDown={(event) => nudge("shape-right", event)} />
            <Handle x={right - cut} y={bottom - cut} label="Resize both boxed corner squares" value={draft.cornerCut} min={0.5} max={Math.max(0.5, Math.min(draft.cutWidth / 2 - draft.seamAllowance - 1, draft.cutHeight / 2 - 0.5))} valueText={`${formatInches(draft.cornerCut)} raw corner square`} kind="corner" onPointerDown={(event) => beginDrag("corner", event)} onKeyDown={(event) => nudge("corner", event)} />
          </>
        )}
      </svg>

      <div className={styles.canvasLegend}>
        <span><i className={styles.legendCut} /> cut line</span>
        <span><i className={styles.legendStitch} /> stitch line</span>
        <span><i className={styles.legendAllowance} /> seam allowance</span>
        <span><i className={styles.legendGrain} /> grain / center</span>
        {composition.design.mode !== "solid" ? <span><i className={styles.legendPiecing} /> piecing seams</span> : null}
        {composition.design.contrastEnabled ? <span><i className={styles.legendContrast} /> contrast join</span> : null}
        {closure === "open-tote" ? <span><i className={styles.legendHandle} /> handle placement</span> : null}
      </div>
    </div>
  );
}

function BoxyPatternCanvas({
  draft,
  plan,
  composition,
  snapStep,
  toolMode,
  onDraftChange,
  onUseCutBasis,
}: {
  draft: BagPatternDraft;
  plan: BagPatternPlan;
  composition: OuterPanelComposition;
  snapStep: SnapStep;
  toolMode: ToolMode;
  onDraftChange: (draft: BagPatternDraft) => void;
  onUseCutBasis: () => void;
}) {
  const dragRef = useRef<{
    handle: "left" | "right" | "top" | "bottom" | "corner";
    pointerId: number;
    startX: number;
    startY: number;
    draft: BagPatternDraft;
    scale: number;
    screenToViewX: number;
    screenToViewY: number;
  } | null>(null);
  const scale = Math.min(
    22,
    570 / Math.max(plan.cutWidth + 4, 16),
    350 / Math.max(plan.cutHeight + 4, 12),
  );
  const centerX = 380;
  const centerY = 262;
  const left = centerX - plan.cutWidth * scale / 2;
  const right = centerX + plan.cutWidth * scale / 2;
  const top = centerY - plan.cutHeight * scale / 2;
  const bottom = centerY + plan.cutHeight * scale / 2;
  const cut = plan.cornerCut * scale;
  const seam = Math.max(3, plan.seamAllowance * scale);
  const outline = [
    `M ${left + cut} ${top}`,
    `L ${right - cut} ${top}`,
    `L ${right - cut} ${top + cut}`,
    `L ${right} ${top + cut}`,
    `L ${right} ${bottom - cut}`,
    `L ${right - cut} ${bottom - cut}`,
    `L ${right - cut} ${bottom}`,
    `L ${left + cut} ${bottom}`,
    `L ${left + cut} ${bottom - cut}`,
    `L ${left} ${bottom - cut}`,
    `L ${left} ${top + cut}`,
    `L ${left + cut} ${top + cut}`,
    "Z",
  ].join(" ");
  const compositionBottom = composition.contrastJoinY ?? plan.cutHeight;
  const compositionBottomY = top + compositionBottom * scale;

  function beginDrag(
    handle: "left" | "right" | "top" | "bottom" | "corner",
    event: PointerEvent<SVGGElement>,
  ) {
    event.preventDefault();
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    svg?.setPointerCapture(event.pointerId);
    dragRef.current = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      draft,
      scale,
      screenToViewX: bounds?.width ? 760 / bounds.width : 1,
      screenToViewY: bounds?.height ? 520 / bounds.height : 1,
    };
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = (event.clientX - active.startX) * active.screenToViewX / active.scale;
    const dy = (event.clientY - active.startY) * active.screenToViewY / active.scale;
    const applySnap = (value: number) => snapStep === 0
      ? value
      : snapMeasurement(value, snapStep);
    const start = active.draft;
    const minWidth = start.cornerCut * 2 + start.seamAllowance * 2 + 1;
    const minHeight = start.cornerCut * 2 + start.seamAllowance * 2 + 1;
    let next = start;

    if (active.handle === "left") {
      next = { ...start, cutWidth: clamp(applySnap(start.cutWidth - dx * 2), minWidth, 60) };
    }
    if (active.handle === "right") {
      next = { ...start, cutWidth: clamp(applySnap(start.cutWidth + dx * 2), minWidth, 60) };
    }
    if (active.handle === "top") {
      next = { ...start, cutHeight: clamp(applySnap(start.cutHeight - dy * 2), minHeight, 50) };
    }
    if (active.handle === "bottom") {
      next = { ...start, cutHeight: clamp(applySnap(start.cutHeight + dy * 2), minHeight, 50) };
    }
    if (active.handle === "corner") {
      const delta = applySnap((dx + dy) / 2);
      const maximumCorner = Math.max(
        0.5,
        Math.min(
          start.cutWidth / 2 - start.seamAllowance - 0.5,
          start.cutHeight / 2 - start.seamAllowance - 0.5,
          8,
        ),
      );
      next = {
        ...start,
        cornerCut: clamp(applySnap(start.cornerCut + delta), 0.5, maximumCorner),
      };
    }
    onUseCutBasis();
    onDraftChange(next);
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function nudge(
    handle: "left" | "right" | "top" | "bottom" | "corner",
    event: KeyboardEvent<SVGGElement>,
  ) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = snapStep || 0.125;
    const horizontal = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const vertical = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    let next = draft;
    if (handle === "left" && horizontal) next = { ...draft, cutWidth: Math.max(3, draft.cutWidth - horizontal * step * 2) };
    if (handle === "right" && horizontal) next = { ...draft, cutWidth: Math.max(3, draft.cutWidth + horizontal * step * 2) };
    if (handle === "top" && vertical) next = { ...draft, cutHeight: Math.max(3, draft.cutHeight - vertical * step * 2) };
    if (handle === "bottom" && vertical) next = { ...draft, cutHeight: Math.max(3, draft.cutHeight + vertical * step * 2) };
    if (handle === "corner") {
      const direction = horizontal || vertical;
      next = {
        ...draft,
        cornerCut: clamp(
          draft.cornerCut + direction * step,
          0.5,
          Math.min(
            draft.cutWidth / 2 - draft.seamAllowance - 0.5,
            draft.cutHeight / 2 - draft.seamAllowance - 0.5,
          ),
        ),
      };
    }
    onUseCutBasis();
    onDraftChange(next);
  }

  return (
    <div className={styles.canvasFrame}>
      <svg
        className={styles.patternCanvas}
        viewBox="0 0 760 520"
        role="group"
        aria-roledescription="interactive four-corner pattern editor"
        aria-label={`Editable four-corner boxy-bag panel, ${formatInches(plan.cutWidth)} long by ${formatInches(plan.cutHeight)} wide, with a ${formatInches(plan.cornerCut)} square removed from every corner and a ${formatInches(plan.seamAllowance)} seam allowance`}
        onPointerMove={pointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <pattern id="boxy-quarter-grid" width={scale / 4} height={scale / 4} patternUnits="userSpaceOnUse">
            <path d={`M ${scale / 4} 0 H 0 V ${scale / 4}`} className={styles.gridFine} />
          </pattern>
          <pattern id="boxy-inch-grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <rect width={scale} height={scale} fill="url(#boxy-quarter-grid)" />
            <path d={`M ${scale} 0 H 0 V ${scale}`} className={styles.gridInch} />
          </pattern>
          <clipPath id="boxy-panel-clip"><path d={outline} /></clipPath>
        </defs>
        <rect className={styles.canvasPaper} x="12" y="12" width="736" height="496" rx="18" />
        <rect x="12" y="12" width="736" height="496" rx="18" fill="url(#boxy-inch-grid)" />
        <line className={styles.centerGuide} x1={centerX} y1="38" x2={centerX} y2="486" />
        <line className={styles.centerGuide} x1="34" y1={centerY} x2="726" y2={centerY} />
        <path className={styles.panelShadow} d={outline} transform="translate(5 7)" />
        <path className={styles.panelFill} d={outline} />
        <g className={styles.compositionOverlay} clipPath="url(#boxy-panel-clip)" aria-hidden="true">
          {composition.design.contrastEnabled ? (
            <rect className={styles.compositionContrast} x={left} y={compositionBottomY} width={right - left} height={bottom - compositionBottomY} />
          ) : null}
          {composition.design.mode === "vertical-strips" || composition.design.mode === "block-grid"
            ? composition.columnSeams.map((seamX, index) => (
                <line key={`boxy-column-${index}`} x1={left + seamX * scale} y1={top} x2={left + seamX * scale} y2={compositionBottomY} />
              ))
            : null}
          {composition.design.mode === "horizontal-strips" || composition.design.mode === "block-grid"
            ? composition.rowSeams.map((seamY, index) => (
                <line key={`boxy-row-${index}`} x1={left} y1={top + seamY * scale} x2={right} y2={top + seamY * scale} />
              ))
            : null}
        </g>
        <path className={styles.cutLine} d={outline} />
        <g className={styles.stitchLines} aria-hidden="true">
          <path d={`M ${left + cut} ${top + seam} H ${right - cut}`} />
          <path d={`M ${left + cut} ${bottom - seam} H ${right - cut}`} />
          <path d={`M ${left + seam} ${top + cut} V ${bottom - cut}`} />
          <path d={`M ${right - seam} ${top + cut} V ${bottom - cut}`} />
        </g>
        <g className={styles.boxyZipperEdge} aria-hidden="true">
          <path d={`M ${left + cut} ${top + 8} H ${right - cut}`} />
          <text x={centerX} y={top + 29}>TOP / ZIPPER EDGE · {formatInches(plan.finishedFlatWidth)} BETWEEN SQUARES</text>
        </g>
        <g className={styles.grainLine}>
          <line x1={centerX} y1={top + cut + 38} x2={centerX} y2={bottom - cut - 38} />
          <path d={`M ${centerX} ${top + cut + 26} l -6 12 h 12 Z`} />
          <path d={`M ${centerX} ${bottom - cut - 26} l -6 -12 h 12 Z`} />
          <text x={centerX + 12} y={centerY} transform={`rotate(-90 ${centerX + 12} ${centerY})`}>GRAIN / CENTER</text>
        </g>
        <g className={styles.dimensionLine}>
          <line x1={left} y1={top - 25} x2={right} y2={top - 25} />
          <path d={`M ${left} ${top - 25} l 8 -5 v 10 Z`} />
          <path d={`M ${right} ${top - 25} l -8 -5 v 10 Z`} />
          <text x={centerX} y={top - 34}>{formatInches(plan.cutWidth)} PANEL CUT LENGTH</text>
          <line x1={right + 30} y1={top} x2={right + 30} y2={bottom} />
          <path d={`M ${right + 30} ${top} l -5 8 h 10 Z`} />
          <path d={`M ${right + 30} ${bottom} l -5 -8 h 10 Z`} />
          <text x={right + 48} y={centerY} transform={`rotate(90 ${right + 48} ${centerY})`}>{formatInches(plan.cutHeight)} PANEL CUT WIDTH</text>
        </g>
        <g className={styles.boxyCornerLabels} aria-hidden="true">
          <text x={left + cut / 2} y={top + cut / 2}>{formatInches(plan.cornerCut)}</text>
          <text x={right - cut / 2} y={top + cut / 2}>{formatInches(plan.cornerCut)}</text>
          <text x={left + cut / 2} y={bottom - cut / 2}>{formatInches(plan.cornerCut)}</text>
          <text x={right - cut / 2} y={bottom - cut / 2}>{formatInches(plan.cornerCut)}</text>
        </g>
        <g className={styles.panelLabel}>
          <text x={centerX} y={centerY - 15}>FOUR-CORNER BOXY PANEL</text>
          <text x={centerX} y={centerY + 14}>CUT 2 OUTER · CUT 2 AQUA LINING</text>
          <text x={centerX} y={centerY + 41}>ALL 4 SQUARES LINKED · SOLID CUT / DASHED STITCH</text>
        </g>
        {toolMode === "select" ? (
          <>
            <Handle x={left} y={centerY} label="Resize both horizontal edges" value={draft.cutWidth} min={3} max={60} valueText={`${formatInches(draft.cutWidth)} panel cut length`} axis="horizontal" onPointerDown={(event) => beginDrag("left", event)} onKeyDown={(event) => nudge("left", event)} />
            <Handle x={right} y={centerY} label="Resize both horizontal edges" value={draft.cutWidth} min={3} max={60} valueText={`${formatInches(draft.cutWidth)} panel cut length`} axis="horizontal" onPointerDown={(event) => beginDrag("right", event)} onKeyDown={(event) => nudge("right", event)} />
            <Handle x={centerX} y={top} label="Resize both vertical edges" value={draft.cutHeight} min={3} max={50} valueText={`${formatInches(draft.cutHeight)} panel cut width`} axis="vertical" onPointerDown={(event) => beginDrag("top", event)} onKeyDown={(event) => nudge("top", event)} />
            <Handle x={centerX} y={bottom} label="Resize both vertical edges" value={draft.cutHeight} min={3} max={50} valueText={`${formatInches(draft.cutHeight)} panel cut width`} axis="vertical" onPointerDown={(event) => beginDrag("bottom", event)} onKeyDown={(event) => nudge("bottom", event)} />
          </>
        ) : (
          <Handle x={left + cut} y={top + cut} label="Resize all four boxy-bag corner squares" value={draft.cornerCut} min={0.5} max={Math.max(0.5, Math.min(draft.cutWidth / 2 - draft.seamAllowance - 0.5, draft.cutHeight / 2 - draft.seamAllowance - 0.5, 8))} valueText={`${formatInches(draft.cornerCut)} square removed from all four corners`} kind="corner" onPointerDown={(event) => beginDrag("corner", event)} onKeyDown={(event) => nudge("corner", event)} />
        )}
      </svg>
      <div className={styles.canvasLegend}>
        <span><i className={styles.legendCut} /> cut line</span>
        <span><i className={styles.legendStitch} /> stitch line</span>
        <span><i className={styles.legendAllowance} /> {formatInches(plan.seamAllowance)} seam</span>
        <span><i className={styles.legendGrain} /> grain / center</span>
        <span><i className={styles.legendHandle} /> zipper edge</span>
      </div>
    </div>
  );
}

function FatQuarterLayoutDiagram({
  name,
  fit,
}: {
  name: string;
  fit: ReturnType<typeof calculateFatQuarterPieceLayout>;
}) {
  if (!fit.fits || fit.piecesPerFatQuarter === 0) {
    const widthShortfall = Math.max(0, fit.pieceWidth - fit.usableWidth);
    const lengthShortfall = Math.max(0, fit.pieceHeight - fit.usableLength);
    return (
      <div className={styles.fatQuarterNoFit}>
        <div
          className={styles.fatQuarterSheet}
          style={{ aspectRatio: `${fit.usableWidth || 1} / ${fit.usableLength || 1}` }}
          aria-hidden="true"
        >
          <span>usable fat quarter</span>
          <b>piece does not fit</b>
        </div>
        <p>
          {widthShortfall > 0 || lengthShortfall > 0
            ? `Needs ${widthShortfall > 0 ? `${formatInches(widthShortfall)} more width` : ""}${widthShortfall > 0 && lengthShortfall > 0 ? " and " : ""}${lengthShortfall > 0 ? `${formatInches(lengthShortfall)} more length` : ""}.`
            : "Use yardage, a larger precut, or piece this section."}
        </p>
      </div>
    );
  }

  const placedWidth = fit.rotated ? fit.pieceHeight : fit.pieceWidth;
  const placedHeight = fit.rotated ? fit.pieceWidth : fit.pieceHeight;
  const sheetIndexes = fit.fatQuartersNeeded <= 4
    ? Array.from({ length: fit.fatQuartersNeeded }, (_, index) => index)
    : [0, fit.fatQuartersNeeded - 1];
  const hiddenSheetCount = Math.max(0, fit.fatQuartersNeeded - 2);

  return (
    <div className={styles.fatQuarterLayout}>
      <div className={styles.fatQuarterLayoutMeta}>
        <span>Body-piece cutting layout</span>
        <strong>
          Full sheet: {fit.piecesAcross} across × {fit.rows} rows
          {fit.rotated ? " · uniform 90° turn" : " · grain upright"}
        </strong>
      </div>
      <div className={styles.fatQuarterSheets}>
        {sheetIndexes.map((sheetIndex, visibleIndex) => {
          const usedCount = Math.min(
            fit.piecesPerFatQuarter,
            Math.max(0, fit.quantity - sheetIndex * fit.piecesPerFatQuarter),
          );
          const usedColumns = Math.min(fit.piecesAcross, usedCount);
          const usedRows = Math.ceil(usedCount / fit.piecesAcross);
          return (
            <div className={styles.fatQuarterSheetWrap} key={sheetIndex}>
              {visibleIndex === 1 && hiddenSheetCount > 0 ? (
                <p className={styles.fatQuarterRepeat}>
                  Repeat the full layout for {hiddenSheetCount} middle fat quarter{hiddenSheetCount === 1 ? "" : "s"}
                </p>
              ) : null}
              <div className={styles.fatQuarterSheetTitle}>
                <strong>FQ {sheetIndex + 1} of {fit.fatQuartersNeeded}</strong>
                <span>{usedCount} piece{usedCount === 1 ? "" : "s"}</span>
              </div>
              <div
                className={styles.fatQuarterSheet}
                style={{ aspectRatio: `${fit.usableWidth} / ${fit.usableLength}` }}
                role="img"
                aria-label={`${name}, fat quarter ${sheetIndex + 1}: ${usedCount} pieces arranged up to ${usedColumns} across by ${usedRows} row${usedRows === 1 ? "" : "s"}${fit.rotated ? ", turned 90 degrees" : ""}.`}
              >
                <span className={styles.fatQuarterGrain}>lengthwise grain ↑</span>
                {Array.from({ length: usedCount }, (_, pieceIndex) => {
                  const column = pieceIndex % fit.piecesAcross;
                  const row = Math.floor(pieceIndex / fit.piecesAcross);
                  const pieceStyle = {
                    left: `${(column * placedWidth / fit.usableWidth) * 100}%`,
                    top: `${(row * placedHeight / fit.usableLength) * 100}%`,
                    width: `${(placedWidth / fit.usableWidth) * 100}%`,
                    height: `${(placedHeight / fit.usableLength) * 100}%`,
                  } as CSSProperties;
                  return (
                    <span
                      className={styles.fatQuarterPiece}
                      style={pieceStyle}
                      key={pieceIndex}
                      title={`${name} ${pieceIndex + 1}: ${formatInches(fit.pieceWidth)} × ${formatInches(fit.pieceHeight)}`}
                    >
                      {usedCount <= 24 ? <b>{pieceIndex + 1}</b> : null}
                      {pieceIndex === 0 ? (
                        <small>{formatInches(fit.pieceWidth)} × {formatInches(fit.pieceHeight)}</small>
                      ) : null}
                      {usedCount <= 12 ? <i>{fit.rotated ? "grain →" : "grain ↑"}</i> : null}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.fatQuarterLayoutNote}>
        Pieces are aligned to squared edges for simple shared cuts. This is a conservative, uniform-orientation layout. Different piece types are calculated separately, so their offcuts are not reused in the purchase count.
      </p>
    </div>
  );
}

function FabricLayoutPanel({
  plan,
  composition,
  settings,
  onSettingsChange,
}: {
  plan: BagPatternPlan;
  composition: OuterPanelComposition;
  settings: BagStudioFabricSettings;
  onSettingsChange: (settings: BagStudioFabricSettings) => void;
}) {
  const {
    source,
    fatQuarterWidth,
    fatQuarterLength,
    allowFatQuarterRotation,
  } = settings;
  const layout = calculateBodyFabricLayout(plan);
  const customOuter =
    composition.design.mode !== "solid" ||
    composition.design.contrastEnabled;
  const fatQuarterPieceSpecs: Array<{
    material: "outer" | "contrast" | "lining";
    name: string;
    quantity: number;
    width: number;
    height: number;
  }> = [
    ...composition.cutPieces.map((piece) => ({
      material: piece.material,
      name: piece.name,
      quantity: piece.quantity,
      width: piece.width,
      height: piece.height,
    })),
    {
      material: "lining",
      name: "Lining body panel",
      quantity: 2,
      width: plan.boundingCutWidth,
      height: plan.cutHeight,
    },
  ];
  const fatQuarterRows = fatQuarterPieceSpecs.map((piece) => {
    const fit = calculateFatQuarterPieceLayout({
      usableWidth: fatQuarterWidth,
      usableLength: fatQuarterLength,
      pieceWidth: piece.width,
      pieceHeight: piece.height,
      quantity: piece.quantity,
      allowRotation: allowFatQuarterRotation,
    });
    const fitWithRotation = calculateFatQuarterPieceLayout({
      usableWidth: fatQuarterWidth,
      usableLength: fatQuarterLength,
      pieceWidth: piece.width,
      pieceHeight: piece.height,
      quantity: piece.quantity,
      allowRotation: true,
    });
    return {
      ...piece,
      fit,
      fitsOnlyRotated:
        !fit.fits &&
        !allowFatQuarterRotation &&
        fitWithRotation.fits &&
        fitWithRotation.rotated,
    };
  });
  const roleLabels = {
    outer: customOuter ? "Outer fabric groups" : "Outer fabric",
    contrast: "Contrast fabric",
    lining: "Lining fabric",
  } as const;
  const fatQuarterRoles = (["outer", "contrast", "lining"] as const)
    .map((material) => {
      const rows = fatQuarterRows.filter((row) => row.material === material);
      const fits = rows.every((row) => row.fit.fits);
      return {
        material,
        label: roleLabels[material],
        rows,
        fits,
        count: fits
          ? rows.reduce((total, row) => total + row.fit.fatQuartersNeeded, 0)
          : 0,
      };
    })
    .filter((role) => role.rows.length > 0);
  const allFatQuarterPiecesFit = fatQuarterRows.every((row) => row.fit.fits);
  const fatQuarterTotal = fatQuarterRoles.reduce(
    (total, role) => total + role.count,
    0,
  );
  const conservativeFatQuarterEstimate = fatQuarterRoles.some(
    (role) => role.rows.length > 1,
  );
  const fatQuarterRoleSummary = fatQuarterRoles
    .map((role) => `${role.rows.length > 1 ? "up to " : ""}${role.count} ${role.material === "outer" ? "outer" : role.material}`)
    .join(" + ");
  const tightFatQuarterRows = fatQuarterRows.filter(
    (row) => {
      if (!row.fit.fits || row.fit.quantity === 0) return false;
      const placedWidth = row.fit.rotated ? row.fit.pieceHeight : row.fit.pieceWidth;
      const placedHeight = row.fit.rotated ? row.fit.pieceWidth : row.fit.pieceHeight;
      const firstSheetCount = Math.min(
        row.fit.quantity,
        row.fit.piecesPerFatQuarter,
      );
      const usedColumns = Math.min(row.fit.piecesAcross, firstSheetCount);
      const usedRows = Math.ceil(firstSheetCount / row.fit.piecesAcross);
      const actualWidthClearance = row.fit.usableWidth - usedColumns * placedWidth;
      const actualLengthClearance = row.fit.usableLength - usedRows * placedHeight;
      return Math.min(actualWidthClearance, actualLengthClearance) < 0.25;
    },
  );
  const rotatedFatQuarterRows = fatQuarterRows.filter(
    (row) => row.fit.rotated,
  );
  const pieceStyle = {
    "--piece-ratio": `${Math.max(0.5, Math.min(2.2, plan.boundingCutWidth / plan.cutHeight))}`,
    "--piece-width": `${Math.min(96, Math.max(24, (plan.boundingCutWidth / Math.max(layout.usableWidth, 1)) * 100))}%`,
  } as CSSProperties;

  return (
    <section className={styles.fabricSection} aria-labelledby="fabric-layout-title">
      <header className={styles.sectionHeader}>
        <div>
          <p>03 / Fabric map</p>
          <h2 id="fabric-layout-title">
            {source === "bolt" ? "Start at the bolt" : "Start with fat quarters"}
          </h2>
        </div>
        <div className={styles.yardageReadout}>
          <span>
            {source === "bolt"
              ? customOuter ? "Lining panels" : "Body fabric"
              : "Separate fabric totals"}
          </span>
          <strong>
            {source === "bolt"
              ? layout.fits ? formatYards(layout.buyYards) : "too narrow"
              : allFatQuarterPiecesFit
                ? `${conservativeFatQuarterEstimate ? "up to " : ""}${fatQuarterTotal} FQ${fatQuarterTotal === 1 ? "" : "s"}${conservativeFatQuarterEstimate ? " conservative" : " total"}`
                : "check fit"}
          </strong>
          {source === "fat-quarters" ? (
            <small>{allFatQuarterPiecesFit ? fatQuarterRoleSummary : "Follow the fit cards below"}</small>
          ) : null}
        </div>
      </header>

      <div className={styles.fabricSourceControls}>
        <div className={styles.fabricSourceToggle} role="group" aria-label="Fabric purchasing format">
          <button
            type="button"
            aria-pressed={source === "bolt"}
            onClick={() => onSettingsChange({ ...settings, source: "bolt" })}
          >
            <strong>Bolt yardage</strong>
            <small>continuous width of fabric</small>
          </button>
          <button
            type="button"
            aria-pressed={source === "fat-quarters"}
            onClick={() =>
              onSettingsChange({ ...settings, source: "fat-quarters" })
            }
          >
            <strong>Fat quarters</strong>
            <small>finite precut rectangles</small>
          </button>
        </div>

        {source === "fat-quarters" ? (
          <div className={styles.fatQuarterSettings}>
            <MeasurementField
              label="Usable width"
              hint="across the fat quarter"
              value={fatQuarterWidth}
              min={1}
              onChange={(value) =>
                onSettingsChange({
                  ...settings,
                  fatQuarterWidth: Math.max(1, value),
                })
              }
            />
            <MeasurementField
              label="Usable length"
              hint="along the lengthwise grain"
              value={fatQuarterLength}
              min={1}
              onChange={(value) =>
                onSettingsChange({
                  ...settings,
                  fatQuarterLength: Math.max(1, value),
                })
              }
            />
            <div className={styles.fatQuarterOrientation} role="group" aria-label="Fat-quarter piece orientation">
              <button
                type="button"
                aria-pressed={!allowFatQuarterRotation}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    allowFatQuarterRotation: false,
                  })
                }
              >
                Keep grain upright
              </button>
              <button
                type="button"
                aria-pressed={allowFatQuarterRotation}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    allowFatQuarterRotation: true,
                  })
                }
              >
                Rotation allowed
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {source === "bolt" ? (
        layout.fits ? (
          <div className={styles.fabricGrid}>
            {customOuter ? (
              <article className={styles.fabricRoll}>
                <div className={styles.fabricRollHead}>
                  <strong>Outer build recipe</strong>
                  <span>Cut by fabric group · quantities include selected faces</span>
                </div>
                <div className={styles.fabricRecipeRows}>
                  {composition.cutPieces.map((piece) => (
                    <div key={`${piece.material}-${piece.name}`}>
                      <span className={styles[`material_${piece.material}`]}>{piece.quantity}×</span>
                      <strong>{piece.name}</strong>
                      <b>{formatInches(piece.width)} × {formatInches(piece.height)}</b>
                    </div>
                  ))}
                </div>
                <footer>
                  <span>Assemble before shaping</span>
                  <strong>Trim to {formatInches(composition.targetWidth)} × {formatInches(composition.targetHeight)}</strong>
                </footer>
              </article>
            ) : (
              <article className={styles.fabricRoll}>
                <div className={styles.fabricRollHead}>
                  <strong>Outer fabric</strong>
                  <span>{formatInches(plan.fabricWidth)} bolt · {formatInches(layout.usableWidth)} usable</span>
                </div>
                <div className={`${styles.fabricBed} ${layout.piecesAcross === 2 ? styles.fabricAcross : styles.fabricStacked}`}>
                  <span className={styles.selvageLeft}>selvage</span>
                  <span className={styles.selvageRight}>selvage</span>
                  {[1, 2].map((piece) => (
                    <div className={styles.fabricPiece} style={pieceStyle} key={piece}>
                      <span>Panel {piece}</span>
                      <small>{formatInches(plan.boundingCutWidth)} × {formatInches(plan.cutHeight)}</small>
                      <i>grain ↑</i>
                    </div>
                  ))}
                  <span className={styles.offcutNote}>Closure pieces can usually nest in the offcuts; handles may require more length.</span>
                </div>
                <footer>
                  <span>{layout.piecesAcross === 2 ? "2 panels across" : "1 panel across · 2 rows"}</span>
                  <strong>{formatInches(layout.lengthInches)} minimum length</strong>
                </footer>
              </article>
            )}

            <article className={styles.fabricRoll}>
              <div className={styles.fabricRollHead}>
                <strong>Lining fabric</strong>
                <span>{formatInches(plan.fabricWidth)} bolt · {formatInches(layout.usableWidth)} usable</span>
              </div>
              <div className={`${styles.fabricBed} ${layout.piecesAcross === 2 ? styles.fabricAcross : styles.fabricStacked}`}>
                <span className={styles.selvageLeft}>selvage</span>
                <span className={styles.selvageRight}>selvage</span>
                {[1, 2].map((piece) => (
                  <div className={styles.fabricPiece} style={pieceStyle} key={piece}>
                    <span>Panel {piece}</span>
                    <small>{formatInches(plan.boundingCutWidth)} × {formatInches(plan.cutHeight)}</small>
                    <i>grain ↑</i>
                  </div>
                ))}
                <span className={styles.offcutNote}>Keep both lining panels on the same grain direction.</span>
              </div>
              <footer>
                <span>{layout.piecesAcross === 2 ? "2 panels across" : "1 panel across · 2 rows"}</span>
                <strong>{formatInches(layout.lengthInches)} minimum length</strong>
              </footer>
            </article>
          </div>
        ) : (
          <div className={styles.fabricWarning}>
            <strong>This panel is wider than the usable fabric.</strong>
            <p>Choose wider fabric, piece the panel, or rotate only if the print, nap, and grain allow it.</p>
          </div>
        )
      ) : (
        <>
          <div className={styles.fatQuarterIntro}>
            <span>Standard: 18″ × 22″ nominal · starts at about 18″ × 21″ usable</span>
            <strong>{formatInches(fatQuarterWidth)} wide × {formatInches(fatQuarterLength)} long usable</strong>
            <small>Measure after removing selvage, squaring, or prewashing. Grain is assumed to run along the usable length.</small>
          </div>
          <div className={styles.fatQuarterGrid}>
            {fatQuarterRoles.map((role) => (
              <article className={styles.fatQuarterCard} key={role.material}>
                <div className={styles.fabricRollHead}>
                  <strong>{role.label}</strong>
                  <span>{role.fits ? `${role.rows.length > 1 ? "up to " : ""}${role.count} FQ${role.count === 1 ? "" : "s"}` : "check fit"}</span>
                </div>
                <div className={styles.fatQuarterRows}>
                  {role.rows.map((row) => (
                    <section className={styles.fatQuarterPiecePlan} key={`${row.material}-${row.name}`}>
                      <div className={styles.fatQuarterPieceSummary}>
                        <span className={styles[`material_${row.material}`]}>{row.quantity}×</span>
                        <div>
                          <strong>{row.name}</strong>
                          <small>{formatInches(row.width)} × {formatInches(row.height)} each</small>
                        </div>
                        <b>
                          {row.fit.fits
                            ? `${row.fit.piecesPerFatQuarter}/FQ · ${row.fit.fatQuartersNeeded} needed`
                            : "no single FQ fits"}
                        </b>
                        <em>
                          {row.fit.rotated
                            ? "turned 90° as one uniform grid"
                            : row.fitsOnlyRotated
                              ? "fits only if rotation is allowed"
                              : row.fit.fits
                                ? `${row.fit.piecesAcross} across × ${row.fit.rows} row${row.fit.rows === 1 ? "" : "s"}`
                                : "use yardage or piece this section"}
                        </em>
                      </div>
                      <FatQuarterLayoutDiagram name={row.name} fit={row.fit} />
                    </section>
                  ))}
                </div>
                <footer>
                  <span>{formatInches(fatQuarterWidth)} × {formatInches(fatQuarterLength)} usable</span>
                  <strong>{role.rows.length > 1 ? "Conservative counts · offcuts not shared" : "Uniform-piece fit"}</strong>
                </footer>
              </article>
            ))}
          </div>

          {!allFatQuarterPiecesFit ? (
            <div className={styles.fabricWarning}>
              <strong>Some pieces do not fit one fat quarter.</strong>
              {fatQuarterRows.filter((row) => !row.fit.fits).map((row) => (
                <p key={`${row.material}-${row.name}`}>
                  {row.name}: {row.fitsOnlyRotated
                    ? "it fits only when turned 90°. Allow rotation only when sideways grain or motif placement is intentional."
                    : `the ${formatInches(row.width)} × ${formatInches(row.height)} cut needs yardage, a larger precut, or piecing.`}
                </p>
              ))}
            </div>
          ) : null}

          {rotatedFatQuarterRows.length || tightFatQuarterRows.length ? (
            <div className={styles.fabricAdvisory}>
              {rotatedFatQuarterRows.length ? <p><strong>Rotated pieces:</strong> check grain, nap, and directional motifs before cutting.</p> : null}
              {tightFatQuarterRows.length ? <p><strong>Tight fit:</strong> less than ¼″ remains in one direction, so measure the actual fat quarter before relying on the count.</p> : null}
            </div>
          ) : null}
        </>
      )}

      <p className={styles.fabricFinePrint}>
        {source === "bolt"
          ? customOuter
            ? "The yardage readout covers the two full lining panels. Outer piecing can use scraps, precuts, or several fabrics, so use the exact cut groups above rather than one misleading bolt total. "
            : "Conservative body-panel estimate, rounded up to the next ⅛ yard. "
          : `${customOuter ? "Bolt lining option" : "Bolt option for outer and lining separately"}: ${layout.fits ? formatYards(layout.buyYards) : "the current bolt is too narrow"}${customOuter ? "" : " each"}. Fat-quarter counts cover body pieces only; long handles and closure parts may require yardage or webbing. ${customOuter ? "Multiple outer cut groups are estimated separately without recombining their offcuts. " : ""}`}
        Directional prints, repeats, straps, matching, and shrinkage can require more.
      </p>
    </section>
  );
}

function RecessedZipperCutPlan({
  plan,
  options,
}: {
  plan: BagPatternPlan;
  options: ClosureOptions;
}) {
  const kit = calculateRecessedZipperKit(plan, options);
  const boxed = kit.endStyle === "boxed";
  const notchStyle = {
    "--notch-width": boxed
      ? `${clamp(
          (kit.notch / Math.max(kit.cutLength, 0.01)) * 100,
          8,
          18,
        )}%`
      : "0%",
    "--notch-height": boxed
      ? `${clamp(
          (kit.notch / Math.max(kit.cutWidth, 0.01)) * 100,
          20,
          58,
        )}%`
      : "0%",
  } as CSSProperties;
  const panels = [
    { material: "outer" as const, name: "Outer panel A" },
    { material: "outer" as const, name: "Outer panel B" },
    { material: "lining" as const, name: "Lining panel A" },
    { material: "lining" as const, name: "Lining panel B" },
  ];
  const assemblySteps = boxed
    ? [
        "Label all four rectangles, mark the zipper edge, and cut both notches from every panel.",
        "Sandwich one zipper edge between one outer and one lining panel; sew and topstitch. Repeat on the other zipper edge.",
        "Open the zipper partway and move the pull away from the end you are sewing.",
        "At one end, bring the outer panels right sides together and sew the short end. Then bring the lining panels right sides together and sew their short end. Repeat at the other end.",
        "Flatten each sewn end seam over the zipper centerline and match the straight raw edges made by the notches.",
        "Sew across each boxed edge slowly. Sew across nylon teeth only; keep metal stops out of the seam.",
        "Trim extra zipper tape and bulky seam allowance without cutting the stitching.",
        "Turn the zipper boat right side out, match its center and end marks to the lining, and attach it at the rim.",
      ]
    : [
        "Label all four strips, mark the zipper edge, and press the short-end folds.",
        "Sandwich one zipper edge between one outer and one lining strip; sew and topstitch. Repeat on the other side.",
        "Finish both free ends and keep the completed panel clear of the side seams by the chosen end gap.",
        "Match the center marks and attach the floating panel to the lining at the rim.",
      ];

  return (
    <section className={styles.recessedCutPlan} aria-labelledby="recessed-cut-plan-title">
      <header className={styles.recessedCutPlanHeader}>
        <div>
          <p>Recessed zipper kit</p>
          <h2 id="recessed-cut-plan-title">
            {boxed ? "Cut four rectangles, then cut the little squares" : "Cut four strips and finish the open ends"}
          </h2>
          <span>
            This closure plan is separate from the two main body panels above.
          </span>
        </div>
        <b>{boxed ? "BOXED ENDS" : "OPEN ENDS"}</b>
      </header>

      <div className={styles.recessedCutSummary}>
        <div>
          <span>Cut each rectangle</span>
          <strong>{formatInches(kit.cutLength)} × {formatInches(kit.cutWidth)}</strong>
          <small>2 outer + 2 lining</small>
        </div>
        <div>
          <span>{boxed ? "Remove from every panel" : "Fold at every short end"}</span>
          <strong>{boxed ? `${formatInches(kit.notch)} square` : formatInches(plan.seamAllowance)}</strong>
          <small>{boxed ? `2 each · 8 total · about ${formatInches(kit.boxedEndWidth)} boxed end` : "press before zipper assembly"}</small>
        </div>
        <div>
          <span>Zipper seam span</span>
          <strong>{formatInches(kit.zipperSeamSpan)}</strong>
          <small>start with {formatInches(kit.recommendedZipperLength)} or longer for handling tails</small>
        </div>
        <div>
          <span>Construction seam</span>
          <strong>{formatInches(plan.seamAllowance)}</strong>
          <small>assumed for zipper, ends, box, and rim</small>
        </div>
      </div>

      <div className={styles.recessedColorKey} aria-label="Recessed zipper panel color key">
        <span><i className={styles.recessedOuterSwatch} />Outer fabric · violet</span>
        <span><i className={styles.recessedLiningSwatch} />Lining fabric · aqua</span>
        <span><i className={styles.recessedStitchSwatch} />Dashed = labeled seam line</span>
      </div>
      <p className={styles.recessedScaleNote}>Diagram is enlarged for clarity and is not to scale. Cut from the written measurements.</p>

      <div className={styles.recessedPieceGrid}>
        {panels.map((panel) => (
          <article key={`${panel.material}-${panel.name}`}>
            <header>
              <strong>{panel.name}</strong>
              <span>{panel.material === "outer" ? "OUTER FABRIC" : "LINING FABRIC"}</span>
            </header>
            <div
              className={`${styles.recessedPatternPiece} ${panel.material === "outer" ? styles.recessedPatternOuter : styles.recessedPatternLining}`}
              style={notchStyle}
              role="img"
              aria-label={`${panel.name}, cut ${formatInches(kit.cutLength)} by ${formatInches(kit.cutWidth)}${boxed ? `, with a ${formatInches(kit.notch)} square removed from both zipper-edge corners` : ", with folded open ends"}`}
            >
              <span className={styles.recessedRimEdge}>RIM SEAM · {formatInches(plan.seamAllowance)}</span>
              <span className={styles.recessedGrain}>grain →</span>
              <span className={styles.recessedCenterMark}>CENTER</span>
              <span className={styles.recessedZipperEdge}>
                {boxed
                  ? `ZIPPER SEAM · ${formatInches(plan.seamAllowance)} · BETWEEN NOTCHES`
                  : `ZIPPER SEAM · ${formatInches(plan.seamAllowance)}`}
              </span>
              <i className={styles.recessedRimStitch} aria-hidden="true" />
              <i className={styles.recessedZipperStitch} aria-hidden="true" />
              {boxed ? (
                <>
                  <i className={styles.recessedNotchLeft} aria-hidden="true" />
                  <i className={styles.recessedNotchRight} aria-hidden="true" />
                  <b className={styles.recessedNotchLabel}>{formatInches(kit.notch)}</b>
                </>
              ) : (
                <>
                  <i className={styles.recessedFoldLeft} aria-hidden="true" />
                  <i className={styles.recessedFoldRight} aria-hidden="true" />
                </>
              )}
            </div>
            <p>{formatInches(kit.cutLength)} long × {formatInches(kit.cutWidth)} deep</p>
          </article>
        ))}
      </div>

      {boxed ? (
        <div className={styles.recessedSquareLesson}>
          <div className={styles.recessedSquareExample} aria-hidden="true">
            <span />
            <b>{formatInches(kit.notch)}</b>
          </div>
          <div>
            <strong>Measure this square from both raw zipper-edge corners.</strong>
            <p>With the same allowance on the matching seams, this makes an end about <em>{formatInches(kit.boxedEndWidth)} wide</em>, which must fit inside the bag’s {formatInches(plan.finishedDepth)} depth. These closure notches do not set bag depth; the large body squares still do that.</p>
          </div>
        </div>
      ) : (
        <p className={styles.recessedOpenExplanation}>
          Open-end panels do not use square notches. Fold and finish the short ends, then keep the completed zipper panel {formatInches(options.recessEndGap)} away from each side seam. To use the square-cut construction, return to Step 2 and choose <strong>Boxed ends</strong>.
        </p>
      )}

      <div className={styles.recessedAssemblyGuide}>
        <div className={styles.recessedAssemblyModel} role="img" aria-label="Color-coded zipper sandwich preview: violet outer fabric, zipper, then aqua lining fabric">
          <span className={styles.recessedAssemblyOuter}>OUTER</span>
          <span className={styles.recessedAssemblyZipper}>ZIPPER</span>
          <span className={styles.recessedAssemblyLining}>LINING</span>
        </div>
        <ol>
          {assemblySteps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
      <p className={styles.recessedConstructionNote}><strong>Construction assumption:</strong> this first version uses the selected {formatInches(plan.seamAllowance)} allowance for every recessed-panel seam. If the zipper panels need more body, interface the two outer panels before assembly. Test one end in scraps before cutting precious fabric, especially with foam, canvas, vinyl, or a different zipper-foot setup.</p>
    </section>
  );
}

function BoxyBagCutPlan({
  plan,
  boxingMethod = "pinch-french-seam",
  handleStyle = "side-handle",
  structureFeel = "fleece-padded",
  pocketStyle = "none",
}: {
  plan: BagPatternPlan;
  boxingMethod?: BagBoxyBoxingMethod;
  handleStyle?: BagBoxyHandleStyle;
  structureFeel?: BagStructureFeel;
  pocketStyle?: BagPocketStyle;
}) {
  const kit = calculateBoxyBagKit(plan);
  const isFrenchSeam = boxingMethod === "pinch-french-seam";
  const panels = [
    { material: "outer" as const, name: "Outer panel A" },
    { material: "outer" as const, name: "Outer panel B" },
    { material: "lining" as const, name: "Lining panel A" },
    { material: "lining" as const, name: "Lining panel B" },
  ];
  const cornerStyle = {
    "--boxy-notch-x": `${clamp(
      kit.cornerSquare / Math.max(kit.panelCutLength, 0.01) * 100,
      8,
      24,
    )}%`,
    "--boxy-notch-y": `${clamp(
      kit.cornerSquare / Math.max(kit.panelCutWidth, 0.01) * 100,
      14,
      34,
    )}%`,
  } as CSSProperties;
  const formulas = boxyBagFormulaText(plan);
  const sewingSteps = boxyBagSewingSteps(plan, structureFeel, pocketStyle, true, handleStyle, boxingMethod);

  return (
    <section className={`${styles.recessedCutPlan} ${styles.boxyCutPlan}`} aria-labelledby="boxy-cut-plan-title">
      <header className={styles.recessedCutPlanHeader}>
        <div>
          <p>{isFrenchSeam ? "Shannon's Boxy Makeup Bag Method" : "True boxy zipper bag"}</p>
          <h2 id="boxy-cut-plan-title">
            {isFrenchSeam
              ? "Cut full matching rectangles — corners are pinched & French-seamed"
              : "Cut four matching rectangles, then remove every corner"}
          </h2>
          <span>
            {isFrenchSeam
              ? "No corner cutouts! Sew full panels into a tube, measure 3″ corner triangles from outside, and enclose in French seams."
              : "The upper squares box the zipper ends; the lower squares box the bottom."}
          </span>
        </div>
        <b>{isFrenchSeam ? "FRENCH-SEAM BOXING" : "4 CORNERS / PANEL"}</b>
      </header>

      <div className={styles.recessedCutSummary}>
        <div>
          <span>Cut each rectangle</span>
          <strong>{formatInches(kit.panelCutLength)} × {formatInches(kit.panelCutWidth)}</strong>
          <small>2 outer + 2 fleece + 2 lining</small>
        </div>
        <div>
          <span>{isFrenchSeam ? "Pinch corner triangle" : "Remove from every corner"}</span>
          <strong>{isFrenchSeam ? "Mark 3″ across base" : `${formatInches(kit.cornerSquare)} square`}</strong>
          <small>{isFrenchSeam ? "4 corner triangles" : "4 each · 16 total"}</small>
        </div>
        <div>
          <span>Zipper & accents</span>
          <strong>{isFrenchSeam ? "16″ separated coil" : formatInches(kit.installedZipperSeam)}</strong>
          <small>{isFrenchSeam ? "2× 3″ tabs + 4″ × 9″ side handle" : "zipper seam span between cutouts"}</small>
        </div>
        <div>
          <span>Expected finished box</span>
          <strong>{formatInches(plan.finishedBaseWidth)} L × {formatInches(plan.finishedDepth)} W × {formatInches(plan.finishedHeight)} H</strong>
          <small>clean enclosed French seams</small>
        </div>
      </div>

      <div className={styles.recessedColorKey} aria-label="Boxy bag panel color key">
        <span><i className={styles.recessedOuterSwatch} />Outer fabric · violet</span>
        <span><i className={styles.recessedLiningSwatch} />Lining fabric · aqua</span>
        <span><i className={styles.recessedStitchSwatch} />Dashed = seam line</span>
      </div>
      <p className={styles.recessedScaleNote}>
        True-to-scale visual proportions ({formatInches(kit.panelCutLength)} × {formatInches(kit.panelCutWidth)} aspect). Cut from the written dimensions.
      </p>

      <div className={`${styles.recessedPieceGrid} ${styles.boxyPieceGrid}`}>
        {panels.map((panel) => (
          <article key={`${panel.material}-${panel.name}`}>
            <header>
              <strong>{panel.name}</strong>
              <span>{panel.material === "outer" ? "OUTER FABRIC" : "LINING FABRIC"}</span>
            </header>
            <div
              className={`${styles.boxyPatternPiece} ${panel.material === "outer" ? styles.boxyPatternOuter : styles.boxyPatternLining}`}
              style={{
                ...(isFrenchSeam ? {} : cornerStyle),
                aspectRatio: `${Math.max(1, kit.panelCutLength)} / ${Math.max(1, kit.panelCutWidth)}`,
              }}
              role="img"
              aria-label={`${panel.name}, cut ${formatInches(kit.panelCutLength)} by ${formatInches(kit.panelCutWidth)}${isFrenchSeam ? " as full rectangle" : `, then remove a ${formatInches(kit.cornerSquare)} square from all four corners`}`}
            >
              {!isFrenchSeam && (
                <>
                  <i className={styles.boxyNotchTopLeft} aria-hidden="true" />
                  <i className={styles.boxyNotchTopRight} aria-hidden="true" />
                  <i className={styles.boxyNotchBottomLeft} aria-hidden="true" />
                  <i className={styles.boxyNotchBottomRight} aria-hidden="true" />
                </>
              )}
              <span className={styles.boxyPieceZipper}>{isFrenchSeam ? "TOP / ZIPPER EDGE" : `TOP / ZIPPER EDGE · ${formatInches(kit.installedZipperSeam)}`}</span>
              <span className={styles.boxyPieceBottom}>BOTTOM SEAM</span>
              <span className={styles.boxyPieceSideLeft}>SIDE</span>
              <span className={styles.boxyPieceSideRight}>SIDE</span>
              {!isFrenchSeam && <b>{formatInches(kit.cornerSquare)} × 4</b>}
              <em>grain →</em>
            </div>
            <p>{formatInches(kit.panelCutLength)} long × {formatInches(kit.panelCutWidth)} wide</p>
          </article>
        ))}
      </div>

      <div className={styles.recessedAssemblyGuide}>
        <div className={`${styles.recessedAssemblyModel} ${styles.boxyAssemblyModel}`} role="img" aria-label="Boxy zipper sandwich: violet outer fabric, centered zipper, aqua lining, with four linked box corners">
          <span className={styles.recessedAssemblyOuter}>OUTER A</span>
          <span className={styles.recessedAssemblyZipper}>CENTER ZIPPER</span>
          <span className={styles.recessedAssemblyLining}>AQUA LINING</span>
        </div>
        <ol>
          {sewingSteps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
      <p className={styles.recessedConstructionNote}>
        <strong>{isFrenchSeam ? "Shannon's Technique Note:" : "Why this is a different bag:"}</strong> {isFrenchSeam
          ? "This pinch-and-sew method encloses the raw corner triangles inside a French seam on the interior, leaving the bag fully lined with clean enclosed seams and no raw edges or binding tape needed. Make sure to open the zipper halfway before sewing the tube ends!"
          : "The tote pattern removes only two bottom squares. This boxy pattern removes four squares from every panel; each upper pair closes around a zipper end, while the four lower openings form the separate outer and lining box seams."}
      </p>
    </section>
  );
}

const SavedBagThumbnail = memo(function SavedBagThumbnail({
  snapshot,
}: {
  snapshot: BagStudioSnapshot;
}) {
  const plan = snapshot.bodyRecipe === "four-corner-boxy"
    ? calculateBoxyBagPlan(snapshot.boxyDraft)
    : calculateBagPatternPlan(snapshot.draft);
  const composition = calculateOuterPanelComposition(
    plan,
    outerDesignForBody(snapshot.bodyRecipe, snapshot.outerDesign),
  );

  return (
    <BagOutcomePreview
      variant="thumbnail"
      bodyRecipe={snapshot.bodyRecipe}
      plan={plan}
      closure={snapshot.closure}
      options={snapshot.closureOptions}
      composition={composition}
      yaw={snapshot.previewYaw}
    />
  );
});

export function BagPatternStudio() {
  const { status, user } = useAuth();
  const [bodyRecipe, setBodyRecipe] = useState<BodyRecipe>(
    defaultStudioSnapshot.bodyRecipe,
  );
  const [closure, setClosure] = useState<BagClosure>("open-tote");
  const [basis, setBasis] = useState<SizeBasis>("cut");
  const [toteDraft, setToteDraft] = useState<BagPatternDraft>(defaultDraft);
  const [boxyDraft, setBoxyDraft] = useState<BagPatternDraft>(defaultBoxyDraft);
  const [closureOptions, setClosureOptions] = useState<ClosureOptions>(defaultClosureOptions);
  const [outerDesign, setOuterDesign] = useState<OuterPanelDesign>(defaultOuterPanelDesign);
  const [structureFeel, setStructureFeel] = useState<BagStructureFeel>("woven-interfaced");
  const [pocketStyle, setPocketStyle] = useState<BagPocketStyle>("none");
  const [pullTabs, setPullTabs] = useState(true);
  const [boxyHandleStyle, setBoxyHandleStyle] = useState<BagBoxyHandleStyle>("side-handle");
  const [boxyBoxingMethod, setBoxyBoxingMethod] = useState<BagBoxyBoxingMethod>("pinch-french-seam");
  const [mirror, setMirror] = useState(true);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [snapStep, setSnapStep] = useState<SnapStep>(0.5);
  const [fabricSettings, setFabricSettings] = useState<BagStudioFabricSettings>(
    defaultFabricSettings,
  );
  const [previewYaw, setPreviewYaw] = useState(
    defaultStudioSnapshot.previewYaw,
  );
  const [activeTab, setActiveTab] = useState<BagStudioTab>("studio");
  const [activeStudioStep, setActiveStudioStep] = useState<StudioStep>("cuts");
  const [bagName, setBagName] = useState("");
  const [activeSavedBagId, setActiveSavedBagId] = useState<string | null>(null);
  const [savedBags, setSavedBags] = useState<SavedBagDesign[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [hydratedOwnerId, setHydratedOwnerId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saved" | "error" | "limit"
  >("idle");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");
  const [companionMode, setCompanionMode] = useState(false);
  const [cutProgress, setCutProgress] = useState<Record<string, boolean>>({});
  const [showMiniPip, setShowMiniPip] = useState(true);
  const workspaceTabRefs = useRef<
    Partial<Record<BagStudioTab, HTMLButtonElement | null>>
  >({});
  const draft = bodyRecipe === "four-corner-boxy" ? boxyDraft : toteDraft;

  const currentSnapshot = useMemo<BagStudioSnapshot>(
    () => ({
      bodyRecipe,
      closure,
      basis,
      draft: toteDraft,
      boxyDraft,
      closureOptions,
      outerDesign,
      structureFeel,
      pocketStyle,
      pullTabs,
      boxyHandleStyle,
      boxyBoxingMethod,
      mirror,
      toolMode,
      snapStep,
      fabricSettings,
      previewYaw,
    }),
    [
      basis,
      bodyRecipe,
      boxyBoxingMethod,
      boxyDraft,
      boxyHandleStyle,
      closure,
      closureOptions,
      fabricSettings,
      mirror,
      outerDesign,
      pocketStyle,
      previewYaw,
      pullTabs,
      snapStep,
      structureFeel,
      toteDraft,
      toolMode,
    ],
  );

  const storedState = useMemo<BagStudioStoredState>(
    () => ({
      schemaVersion: BAG_STUDIO_SCHEMA_VERSION,
      workingCopy: {
        name: bagName,
        activeSavedBagId,
        activeTab,
        snapshot: currentSnapshot,
      },
      savedBags,
    }),
    [activeSavedBagId, activeTab, bagName, currentSnapshot, savedBags],
  );

  const activeSavedBag = useMemo(
    () => savedBags.find((saved) => saved.id === activeSavedBagId) ?? null,
    [activeSavedBagId, savedBags],
  );
  const workingDraftHasChanges =
    bagName.trim().length > 0 ||
    JSON.stringify(currentSnapshot) !== JSON.stringify(defaultStudioSnapshot);
  const hasUnsavedChanges = activeSavedBag
    ? activeSavedBag.name !== bagName.trim() ||
      JSON.stringify(activeSavedBag.snapshot) !== JSON.stringify(currentSnapshot)
    : workingDraftHasChanges;
  const filteredSavedBags = useMemo(() => {
    const query = savedSearch.trim().toLocaleLowerCase();
    return [...savedBags]
      .filter((saved) => !query || saved.name.toLocaleLowerCase().includes(query))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [savedBags, savedSearch]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.startsWith("#bag=")) {
      const encoded = window.location.hash.slice(5);
      const decoded = decodeBagStudioShare(encoded, defaultStudioSnapshot);
      if (decoded) {
        applySnapshot(decoded.snapshot);
        if (decoded.name) setBagName(decoded.name);
      }
    }
  }, []);

  useEffect(() => {
    if (status !== "signed_in" || !user?.uid) return;
    const ownerId = user.uid;
    const persisted = readBagStudioState(defaultStudioSnapshot, ownerId);

    startTransition(() => {
      const snapshot = persisted.workingCopy.snapshot;
      setBodyRecipe(snapshot.bodyRecipe);
      setClosure(snapshot.closure);
      setBasis(snapshot.basis);
      setToteDraft(snapshot.draft);
      setBoxyDraft(snapshot.boxyDraft);
      setClosureOptions(snapshot.closureOptions);
      setOuterDesign(snapshot.outerDesign);
      setStructureFeel(snapshot.structureFeel ?? "woven-interfaced");
      setPocketStyle(snapshot.pocketStyle ?? "none");
      setPullTabs(snapshot.pullTabs ?? true);
      setBoxyHandleStyle(snapshot.boxyHandleStyle ?? (snapshot.pullTabs === false ? "none" : "side-handle"));
      setBoxyBoxingMethod(snapshot.boxyBoxingMethod ?? "pinch-french-seam");
      setMirror(snapshot.mirror);
      setToolMode(snapshot.toolMode);
      setSnapStep(snapshot.snapStep);
      setFabricSettings(snapshot.fabricSettings);
      setPreviewYaw(snapshot.previewYaw);
      setBagName(persisted.workingCopy.name);
      setActiveSavedBagId(persisted.workingCopy.activeSavedBagId);
      setActiveTab(persisted.workingCopy.activeTab);
      setSavedBags(persisted.savedBags);
      setStorageReady(true);
      setHydratedOwnerId(ownerId);
    });
  }, [status, user?.uid]);

  useEffect(() => {
    if (
      !storageReady ||
      !user?.uid ||
      hydratedOwnerId !== user.uid
    ) {
      return;
    }
    const ownerId = user.uid;
    const timeout = window.setTimeout(() => {
      setSaveState(writeBagStudioState(storedState, ownerId) ? "saved" : "error");
    }, 240);
    return () => window.clearTimeout(timeout);
  }, [hydratedOwnerId, storageReady, storedState, user?.uid]);

  useEffect(() => {
    if (
      !storageReady ||
      !user?.uid ||
      hydratedOwnerId !== user.uid
    ) {
      return;
    }
    const ownerId = user.uid;
    const persistWorkingCopy = () => {
      writeBagStudioState(storedState, ownerId);
    };
    window.addEventListener("pagehide", persistWorkingCopy);
    return () => window.removeEventListener("pagehide", persistWorkingCopy);
  }, [hydratedOwnerId, storageReady, storedState, user?.uid]);

  const plan = useMemo(
    () => bodyRecipe === "four-corner-boxy"
      ? calculateBoxyBagPlan(boxyDraft)
      : calculateBagPatternPlan(toteDraft),
    [bodyRecipe, boxyDraft, toteDraft],
  );
  const composition = useMemo(
    () => calculateOuterPanelComposition(
      plan,
      outerDesignForBody(bodyRecipe, outerDesign),
    ),
    [bodyRecipe, plan, outerDesign],
  );
  const handlePlan = useMemo(
    () => calculateToteHandlePlan(plan, closureOptions),
    [plan, closureOptions],
  );
  const pieces = useMemo(
    () => getCutPieces(
      plan,
      bodyRecipe,
      closure,
      closureOptions,
      composition,
      handlePlan,
      structureFeel,
      pocketStyle,
      pullTabs,
      boxyHandleStyle,
      boxyBoxingMethod,
    ),
    [
      plan,
      bodyRecipe,
      closure,
      closureOptions,
      composition,
      handlePlan,
      structureFeel,
      pocketStyle,
      pullTabs,
      boxyHandleStyle,
      boxyBoxingMethod,
    ],
  );
  const sewingSteps = useMemo(
    () =>
      bodyRecipe === "four-corner-boxy"
        ? boxyBagSewingSteps(plan, structureFeel, pocketStyle, pullTabs, boxyHandleStyle, boxyBoxingMethod)
        : toteBagSewingSteps(plan, closure, closureOptions, structureFeel, pocketStyle),
    [bodyRecipe, plan, structureFeel, pocketStyle, pullTabs, boxyHandleStyle, boxyBoxingMethod, closure, closureOptions],
  );
  const closureWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (
      closure === "side-zipper" &&
      closureOptions.sideZipperLength >
        Math.max(0, finishedSideSeamLength(plan) - 1)
    ) {
      warnings.push(
        "Shorten the side zipper so its stops stay clear of the top join and boxed-corner zone.",
      );
    }
    if (
      closure === "zipper-gusset" &&
      closureOptions.zipperGap >= plan.finishedDepth
    ) {
      warnings.push(
        "The zipper reveal must be smaller than the finished bag depth.",
      );
    }
    if (
      closure === "recessed-zipper" &&
      closureOptions.recessEndStyle === "open" &&
      recessedPanelFinishedLength(
        plan,
        closureOptions.recessEndGap,
      ) < 1
    ) {
      warnings.push(
        "Leave at least 1 inch of usable recessed zipper panel after both end gaps.",
      );
    }
    if (
      closure === "recessed-zipper" &&
      closureOptions.recessEndStyle === "boxed"
    ) {
      const kit = calculateRecessedZipperKit(plan, closureOptions);
      if (kit.notch <= plan.seamAllowance) {
        warnings.push(
          "Make the zipper-panel square larger than the seam allowance so the notch reaches beyond the stitch line.",
        );
      }
      if (kit.notch >= kit.cutWidth - plan.seamAllowance) {
        warnings.push(
          "Make the zipper-panel square smaller than the panel depth so fabric remains above the notch.",
        );
      }
      if (kit.notchedZipperEdge < 2) {
        warnings.push(
          "Use smaller zipper-panel squares or a longer top edge so at least 2 inches remain between the notches.",
        );
      }
      if (kit.boxedEndWidth >= plan.finishedDepth) {
        warnings.push(
          `Use a smaller zipper-panel square: its approximately ${formatInches(kit.boxedEndWidth)} boxed end must be narrower than the bag's ${formatInches(plan.finishedDepth)} depth.`,
        );
      }
    }
    if (
      closure !== "top-zipper" &&
      standingTopRimWidth(plan) <= 0
    ) {
      warnings.push(
        "This top shaping leaves no usable standing rim for this closure.",
      );
    }
    if (
      closure === "recessed-zipper" &&
      closureOptions.recessDepth >= plan.finishedHeight
    ) {
      warnings.push(
        "The zipper recess must be shallower than the finished bag height.",
      );
    }
    if (closure === "open-tote") {
      warnings.push(...handlePlan.warnings);
    }
    return warnings;
  }, [closure, closureOptions, handlePlan.warnings, plan]);
  const ready =
    plan.valid &&
    composition.valid &&
    closureWarnings.length === 0;
  const activeStepIndex = studioSteps.findIndex(
    (step) => step.id === activeStudioStep,
  );
  const activeStep = studioSteps[activeStepIndex] ?? studioSteps[0];
  const easyCutGrid = snapStep === 0 ? 0.5 : snapStep;
  const cutsMatchGrid = [
    draft.cutWidth,
    draft.cutHeight,
    draft.cornerCut,
    ...(bodyRecipe === "two-panel-tote"
      ? [draft.leftTopInset, draft.rightTopInset]
      : []),
  ].every(
    (measurement) =>
      Math.abs(measurement - snapMeasurement(measurement, easyCutGrid)) < 0.001,
  );
  const balancedCornerGrid = snapStep === 0 ? 0.25 : Math.min(snapStep, 0.25);
  const maximumBoxyCorner = Math.max(
    0.5,
    Math.min(
      5,
      draft.cutWidth / 2 - draft.seamAllowance - 0.5,
      draft.cutHeight / 2 - draft.seamAllowance - 0.5,
    ),
  );
  const balancedBoxyCorner = clamp(
    snapMeasurement(
      (Math.min(draft.cutWidth, draft.cutHeight) - draft.seamAllowance * 2) / 4,
      balancedCornerGrid,
    ),
    0.5,
    maximumBoxyCorner,
  );
  const balancedBoxyPlan = calculateBoxyBagPlan({
    ...draft,
    cornerCut: balancedBoxyCorner,
  });
  const boxyNarrowSide = Math.min(
    plan.finishedBaseWidth,
    plan.finishedDepth,
  );
  const boxyHasTallProportions =
    bodyRecipe === "four-corner-boxy" &&
    plan.valid &&
    boxyNarrowSide > 0 &&
    plan.finishedHeight > boxyNarrowSide * 1.5;
  const handleBuildAdvisories = useMemo(() => {
    if (closure !== "open-tote") return [];
    const advisories = [...handlePlan.advisories];
    if (
      composition.design.contrastEnabled &&
      closureOptions.handleAttachmentDepth >=
        plan.finishedHeight - composition.design.contrastRise
    ) {
      advisories.push(
        "The handle attachment crosses the contrast-bottom join. Reinforce that seam or shorten the attachment depth.",
      );
    }
    if (
      composition.design.mode === "vertical-strips" ||
      composition.design.mode === "block-grid"
    ) {
      const blankMinX = Math.min(0, plan.leftTopInset);
      const centers = [handlePlan.rawLeftCenter, handlePlan.rawRightCenter];
      const seamUnderHandle = composition.columnSeams
        .map((seamX) => blankMinX + seamX)
        .some((seamX) =>
        centers.some(
          (center) =>
            Math.abs(seamX - center) <= handlePlan.handleWidth / 2 + 0.125,
        ),
      );
      if (seamUnderHandle) {
        advisories.push(
          "A vertical piecing seam sits under a handle leg. Add backing behind the box-and-X or shift the handle inset slightly.",
        );
      }
    }
    if (
      composition.design.mode === "horizontal-strips" ||
      composition.design.mode === "block-grid"
    ) {
      const seamThroughHandle = composition.rowSeams.some(
        (seamY) =>
          seamY >= handlePlan.rawRimY &&
          seamY <= handlePlan.rawAttachmentEndY,
      );
      if (seamThroughHandle) {
        advisories.push(
          "A horizontal piecing seam crosses the handle attachment box. Reinforce the full area before stitching the handle.",
        );
      }
    }
    return advisories;
  }, [closure, closureOptions.handleAttachmentDepth, composition, handlePlan, plan]);

  function applySnapshot(snapshot: BagStudioSnapshot) {
    setBodyRecipe(snapshot.bodyRecipe);
    setClosure(snapshot.closure);
    setBasis(snapshot.basis);
    setToteDraft(snapshot.draft);
    setBoxyDraft(snapshot.boxyDraft);
    setClosureOptions(snapshot.closureOptions);
    setOuterDesign(snapshot.outerDesign);
    setStructureFeel(snapshot.structureFeel ?? "woven-interfaced");
    setPocketStyle(snapshot.pocketStyle ?? "none");
    setPullTabs(snapshot.pullTabs ?? true);
    setMirror(snapshot.mirror);
    setToolMode(snapshot.toolMode);
    setSnapStep(snapshot.snapStep);
    setFabricSettings(snapshot.fabricSettings);
    setPreviewYaw(snapshot.previewYaw);
    setCopyState("idle");
  }

  function applySizePreset(preset: BagSizePreset) {
    if (preset.bodyRecipe === "four-corner-boxy") {
      setBodyRecipe("four-corner-boxy");
      setClosure("top-zipper");
      if (preset.id === "boxy-makeup") {
        setBoxyBoxingMethod("pinch-french-seam");
        setBoxyHandleStyle("side-handle");
        setStructureFeel("fleece-padded");
      }
      setBoxyDraft((current) =>
        draftFromFinishedBoxyBag({
          length: preset.baseWidth,
          width: preset.depth,
          height: preset.height,
          seamAllowance: current.seamAllowance,
          fabricWidth: current.fabricWidth,
        }),
      );
    } else {
      setBodyRecipe("two-panel-tote");
      setToteDraft((current) =>
        draftFromFinishedSize({
          baseWidth: preset.baseWidth,
          height: preset.height,
          depth: preset.depth,
          seamAllowance: current.seamAllowance,
          topTakeUp: current.topTakeUp,
          leftTopInset: current.leftTopInset,
          rightTopInset: current.rightTopInset,
          fabricWidth: current.fabricWidth,
        }),
      );
    }
    setBasis("finished");
    setCopyState("idle");
  }

  function saveCurrentBag(asNew = false) {
    const cleanName = bagName.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!cleanName) {
      setSaveState("error");
      return;
    }
    const now = new Date().toISOString();
    const existing = asNew
      ? null
      : savedBags.find((saved) => saved.id === activeSavedBagId) ?? null;

    if (existing) {
      setSavedBags((current) =>
        current.map((saved) =>
          saved.id === existing.id
            ? {
                ...saved,
                name: cleanName,
                updatedAt: now,
                snapshot: currentSnapshot,
              }
            : saved,
        ),
      );
      setBagName(cleanName);
      setSaveState("saved");
      return;
    }

    if (savedBags.length >= MAX_SAVED_BAGS) {
      setSaveState("limit");
      return;
    }
    const id = createSavedBagId();
    const next: SavedBagDesign = {
      id,
      name: cleanName,
      createdAt: now,
      updatedAt: now,
      snapshot: currentSnapshot,
    };
    setSavedBags((current) => [next, ...current]);
    setActiveSavedBagId(id);
    setBagName(cleanName);
    setSaveState("saved");
  }

  function saveCurrentAsCopy() {
    if (savedBags.length >= MAX_SAVED_BAGS) {
      setSaveState("limit");
      return;
    }
    const copyName = savedBagCopyName(bagName, savedBags);
    const now = new Date().toISOString();
    const id = createSavedBagId();
    const copy: SavedBagDesign = {
      id,
      name: copyName,
      createdAt: now,
      updatedAt: now,
      snapshot: currentSnapshot,
    };
    setSavedBags((current) => [copy, ...current]);
    setActiveSavedBagId(id);
    setBagName(copyName);
    setSaveState("saved");
  }

  function showWorkspaceTab(tab: BagStudioTab, focus = false) {
    setActiveTab(tab);
    if (focus) workspaceTabRefs.current[tab]?.focus();
  }

  function confirmReplaceWorkingCopy(action: string) {
    if (!hasUnsavedChanges) return true;
    return window.confirm(
      `Your current changes are not in a named save. ${action} will replace them. Continue?`,
    );
  }

  function loadSavedBag(saved: SavedBagDesign) {
    applySnapshot(saved.snapshot);
    setBagName(saved.name);
    setActiveSavedBagId(saved.id);
    showWorkspaceTab("studio", true);
    setSaveState("saved");
  }

  function openSavedBag(saved: SavedBagDesign) {
    if (!confirmReplaceWorkingCopy(`Opening “${saved.name}”`)) return;
    loadSavedBag(saved);
  }

  function duplicateSavedBag(saved: SavedBagDesign) {
    if (savedBags.length >= MAX_SAVED_BAGS) {
      setSaveState("limit");
      return;
    }
    if (!confirmReplaceWorkingCopy(`Duplicating “${saved.name}”`)) return;
    const now = new Date().toISOString();
    const copy: SavedBagDesign = {
      ...saved,
      id: createSavedBagId(),
      name: savedBagCopyName(saved.name, savedBags),
      createdAt: now,
      updatedAt: now,
    };
    setSavedBags((current) => [copy, ...current]);
    loadSavedBag(copy);
  }

  function removeSavedBag(saved: SavedBagDesign) {
    if (!window.confirm(`Remove “${saved.name}” from this browser?`)) return;
    setSavedBags((current) => current.filter((candidate) => candidate.id !== saved.id));
    if (activeSavedBagId === saved.id) {
      setActiveSavedBagId(null);
      setSaveState("idle");
    }
  }

  function updateDraft(next: BagPatternDraft) {
    if (bodyRecipe === "four-corner-boxy") {
      setBoxyDraft({
        ...next,
        topTakeUp: 0,
        leftTopInset: 0,
        rightTopInset: 0,
      });
    } else {
      setToteDraft(next);
    }
    setCopyState("idle");
  }

  function makeCutsEasy() {
    const grid = snapStep === 0 ? 0.5 : snapStep;
    const cutWidth = Math.max(3, snapMeasurement(draft.cutWidth, grid));
    const cutHeight = Math.max(3, snapMeasurement(draft.cutHeight, grid));
    const maximumCorner = Math.max(
      0.5,
      Math.min(
        5,
        cutHeight / 2 - draft.seamAllowance - 0.5,
        cutWidth / 2 - draft.seamAllowance - 0.5,
      ),
    );
    updateDraft({
      ...draft,
      cutWidth,
      cutHeight,
      cornerCut: clamp(
        snapMeasurement(draft.cornerCut, grid),
        0.5,
        maximumCorner,
      ),
      leftTopInset: bodyRecipe === "four-corner-boxy"
        ? 0
        : snapMeasurement(draft.leftTopInset, grid),
      rightTopInset: bodyRecipe === "four-corner-boxy"
        ? 0
        : snapMeasurement(draft.rightTopInset, grid),
    });
    setBasis("cut");
    if (snapStep === 0) setSnapStep(0.5);
  }

  function goToStudioStep(step: StudioStep) {
    setActiveStudioStep(step);
    window.requestAnimationFrame(() => {
      document.getElementById(`studio-step-${step}`)?.focus();
    });
  }

  function chooseBodyRecipe(nextRecipe: BodyRecipe) {
    setBodyRecipe(nextRecipe);
    if (nextRecipe === "four-corner-boxy") {
      setClosure("top-zipper");
    }
    setCopyState("idle");
  }

  function updateFinished(
    key: "baseWidth" | "height" | "depth",
    value: number,
  ) {
    const nextValue = Math.max(0, cleanInput(value));
    const current = plan;

    if (bodyRecipe === "four-corner-boxy") {
      if (key === "baseWidth") {
        updateDraft({
          ...draft,
          cutWidth:
            nextValue + current.finishedDepth + draft.seamAllowance * 2,
        });
      }
      if (key === "height") {
        updateDraft({
          ...draft,
          cutHeight:
            nextValue + current.finishedDepth + draft.seamAllowance * 2,
        });
      }
      if (key === "depth") {
        updateDraft({
          ...draft,
          cornerCut: nextValue / 2,
          cutWidth:
            current.finishedBaseWidth +
            nextValue +
            draft.seamAllowance * 2,
          cutHeight:
            current.finishedHeight +
            nextValue +
            draft.seamAllowance * 2,
        });
      }
      return;
    }

    if (key === "baseWidth") {
      updateDraft({
        ...draft,
        cutWidth:
          nextValue + current.finishedDepth + draft.seamAllowance * 2,
      });
    }
    if (key === "height") {
      updateDraft({
        ...draft,
        cutHeight:
          nextValue +
          draft.cornerCut +
          draft.seamAllowance +
          draft.topTakeUp,
      });
    }
    if (key === "depth") {
      const cornerCut = nextValue / 2;
      updateDraft({
        ...draft,
        cornerCut,
        cutWidth:
          current.finishedBaseWidth +
          nextValue +
          draft.seamAllowance * 2,
        cutHeight:
          current.finishedHeight +
          cornerCut +
          draft.seamAllowance +
          draft.topTakeUp,
      });
    }
  }

  function updateSeamAllowance(value: number) {
    const seamAllowance = clamp(cleanInput(value), 0.125, 1);
    if (basis === "cut") {
      updateDraft({
        ...draft,
        seamAllowance,
        topTakeUp: bodyRecipe === "four-corner-boxy" ? 0 : seamAllowance,
      });
      return;
    }
    if (bodyRecipe === "four-corner-boxy") {
      updateDraft({
        ...draft,
        seamAllowance,
        topTakeUp: 0,
        cutWidth:
          plan.finishedBaseWidth +
          plan.finishedDepth +
          seamAllowance * 2,
        cutHeight:
          plan.finishedHeight +
          plan.finishedDepth +
          seamAllowance * 2,
      });
      return;
    }
    updateDraft({
      ...draft,
      seamAllowance,
      topTakeUp: seamAllowance,
      cutWidth:
        plan.finishedBaseWidth +
        plan.finishedDepth +
        seamAllowance * 2,
      cutHeight:
        plan.finishedHeight +
        draft.cornerCut +
        seamAllowance * 2,
    });
  }

  function chooseCorner(value: number) {
    if (basis === "finished") {
      updateFinished(
        bodyRecipe === "four-corner-boxy" ? "height" : "depth",
        value * 2,
      );
    } else {
      updateDraft({ ...draft, cornerCut: value });
    }
  }

  function updateInset(side: "left" | "right", value: number) {
    const nextValue = clamp(cleanInput(value), -3, draft.cutWidth / 3);
    updateDraft({
      ...draft,
      leftTopInset:
        side === "left" || mirror ? nextValue : draft.leftTopInset,
      rightTopInset:
        side === "right" || mirror ? nextValue : draft.rightTopInset,
    });
  }

  function resetDraft() {
    if (!confirmReplaceWorkingCopy("Resetting the measurements")) return;
    applySnapshot(defaultStudioSnapshot);
    setActiveStudioStep("cuts");
    setSaveState("idle");
  }

  function startNewBag() {
    if (!confirmReplaceWorkingCopy("Starting a new bag")) return;
    applySnapshot(defaultStudioSnapshot);
    setBagName("");
    setActiveSavedBagId(null);
    setActiveStudioStep("cuts");
    showWorkspaceTab("studio", true);
    setSaveState("idle");
  }

  function navigateWorkspaceTabs(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: BagStudioTab,
  ) {
    const order: BagStudioTab[] = ["studio", "saved"];
    const currentIndex = order.indexOf(currentTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % order.length;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + order.length) % order.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = order.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    showWorkspaceTab(order[nextIndex], true);
  }

  function printPlan() {
    showWorkspaceTab("studio");
    setActiveStudioStep("plan");
    window.requestAnimationFrame(() => window.print());
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(
        buildPlanText(
          plan,
          bodyRecipe,
          closure,
          closureOptions,
          pieces,
          composition,
          handlePlan,
          structureFeel,
          pocketStyle,
          pullTabs,
        ),
      );
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  async function handleShareLink() {
    try {
      const encoded = encodeBagStudioShare(currentSnapshot, bagName);
      const url = `${window.location.origin}${window.location.pathname}#bag=${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 2500);
    }
  }

  function toggleCutProgress(pieceKey: string) {
    setCutProgress((prev) => ({ ...prev, [pieceKey]: !prev[pieceKey] }));
  }

  if (status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} aria-hidden="true" />
          Laying out the cutting table…
        </div>
      </main>
    );
  }

  if (status !== "signed_in") {
    return (
      <main className={styles.page}>
        <section className={styles.gateCard}>
          <span className={styles.gateMark} aria-hidden="true">MS / BAG</span>
          <p className={styles.eyebrow}>Private sewing studio</p>
          <h1>Sign in to open the pattern table.</h1>
          <p>The bag studio lives with your private Monosyth tools.</p>
          <Link href="/app" className={styles.primaryAction}>Go to studio sign-in →</Link>
        </section>
      </main>
    );
  }

  if (!storageReady || hydratedOwnerId !== user?.uid) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} aria-hidden="true" />
          Opening your last bag settings…
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <div className={styles.brandBlock}>
            <Link href="/app" aria-label="Back to Monosyth Studio" className={styles.brandMark}>MS</Link>
            <div>
              <p>Monosyth sewing studio</p>
              <h1>Modular Bag Studio <span>beta</span></h1>
            </div>
          </div>
          <div className={styles.topStatus}>
            <span><i /> live geometry</span>
            <b>inches</b>
          </div>
          <div className={styles.topActions}>
            <button type="button" onClick={() => setCompanionMode(true)} className={styles.companionTriggerButton} title="Open full-screen sewing companion mode with cut checklist">🧵 Sewing mode</button>
            <button type="button" onClick={() => void handleShareLink()} title="Copy shareable URL link">{shareState === "copied" ? "Link copied! ✓" : shareState === "error" ? "Error copying" : "Share link"}</button>
            <button type="button" onClick={startNewBag}>New bag</button>
            <button type="button" onClick={resetDraft}>Reset</button>
            <button type="button" onClick={printPlan}>Print</button>
            <button type="button" className={styles.downloadButton} disabled={!ready} onClick={() => bodyRecipe === "four-corner-boxy" ? downloadBoxyPatternSvg(plan) : downloadPatternSvg(plan, composition, closure, handlePlan)}>{bodyRecipe === "four-corner-boxy" ? "Boxy SVG" : "Body SVG"}</button>
          </div>
        </header>

        <nav className={styles.workspaceNav} aria-label="Modular Bag Studio sections">
          <div role="tablist" aria-label="Workspace">
            <button
              ref={(node) => {
                workspaceTabRefs.current.studio = node;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === "studio"}
              aria-controls="bag-studio-workspace"
              id="bag-studio-tab"
              tabIndex={activeTab === "studio" ? 0 : -1}
              onClick={() => showWorkspaceTab("studio")}
              onKeyDown={(event) => navigateWorkspaceTabs(event, "studio")}
            >
              <strong>Design studio</strong>
              <small>pattern, 3D outcome + fabric</small>
            </button>
            <button
              ref={(node) => {
                workspaceTabRefs.current.saved = node;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === "saved"}
              aria-controls="saved-bags-workspace"
              id="saved-bags-tab"
              tabIndex={activeTab === "saved" ? 0 : -1}
              onClick={() => showWorkspaceTab("saved")}
              onKeyDown={(event) => navigateWorkspaceTabs(event, "saved")}
            >
              <strong>Saved bags</strong>
              <small>{savedBags.length} named design{savedBags.length === 1 ? "" : "s"}</small>
            </button>
          </div>
          <p>Choose the bag body, then change its size, panels, handles, bottom, and opening.</p>
        </nav>

        <section className={styles.projectBar} aria-label="Current bag design">
          <label>
            <span>Current bag name</span>
            <input
              type="text"
              value={bagName}
              maxLength={80}
              placeholder="e.g. Patchwork market tote"
              onChange={(event) => {
                setBagName(event.target.value);
                setSaveState("idle");
              }}
            />
          </label>
          <div className={styles.projectSaveStatus} aria-live="polite">
            <span>{activeSavedBag ? "Named design" : "Working draft"}</span>
            <strong>
              {saveState === "limit"
                ? `The ${MAX_SAVED_BAGS}-bag local limit is full`
                : saveState === "error"
                ? bagName.trim()
                  ? "Could not save locally"
                  : "Add a name before saving"
                : activeSavedBag
                  ? hasUnsavedChanges
                    ? "Changes waiting to be updated"
                    : `Saved ${formatSavedBagTime(activeSavedBag.updatedAt)}`
                  : storageReady
                    ? "Last settings saved automatically"
                    : "Opening your last settings…"}
            </strong>
            <small>Private to this browser and your signed-in Monosyth profile.</small>
          </div>
          <div className={styles.projectActions}>
            <button
              type="button"
              className={styles.projectPrimaryAction}
              onClick={() => saveCurrentBag(false)}
            >
              {activeSavedBag ? "Update bag" : "Save named bag"}
            </button>
            {activeSavedBag ? (
              <button type="button" onClick={saveCurrentAsCopy}>Save as copy</button>
            ) : null}
          </div>
        </section>

        <div
          id="bag-studio-workspace"
          role="tabpanel"
          aria-labelledby="bag-studio-tab"
          hidden={activeTab !== "studio"}
        >
        <section
          className={styles.studioGuide}
          aria-labelledby="studio-step-heading"
          id={`studio-step-${activeStudioStep}`}
          tabIndex={-1}
        >
          <div className={styles.studioGuideIntro}>
            <p>Guided workspace</p>
            <h2 id="studio-step-heading">{activeStep.label}</h2>
            <span>{activeStep.description}</span>
          </div>
          <nav className={styles.studioStepNav} aria-label="Bag design steps">
            {studioSteps.map((step) => (
              <button
                type="button"
                key={step.id}
                aria-current={activeStudioStep === step.id ? "step" : undefined}
                onClick={() => goToStudioStep(step.id)}
              >
                <b>{step.number}</b>
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.description}</small>
                </span>
              </button>
            ))}
          </nav>
          <div className={styles.studioSummary}>
            <span>
              <small>Start by cutting</small>
              <strong>{formatInches(plan.boundingCutWidth)} × {formatInches(plan.cutHeight)}</strong>
            </span>
            <i aria-hidden="true">→</i>
            <span>
              <small>Expected sewn size</small>
              <strong>{bodyRecipe === "four-corner-boxy"
                ? `${formatInches(plan.finishedBaseWidth)} L × ${formatInches(plan.finishedDepth)} W × ${formatInches(plan.finishedHeight)} H`
                : `${formatInches(plan.finishedBaseWidth)} W × ${formatInches(plan.finishedHeight)} H × ${formatInches(plan.finishedDepth)} D`}</strong>
            </span>
            <b className={ready ? styles.validBadge : styles.invalidBadge}>{ready ? "READY" : "CHECK"}</b>
          </div>
        </section>

        <section
          className={`${styles.closureRail} ${styles.bodyRecipeRail}`}
          aria-labelledby="body-recipe-title"
          hidden={activeStudioStep !== "cuts"}
        >
          <div className={styles.railTitle}>
            <span>01</span>
            <div>
              <p id="body-recipe-title">Choose the bag body</p>
              <small>This changes the flat pattern, corner math, zipper construction, and 3D shape.</small>
            </div>
          </div>
          <div className={`${styles.closureChoices} ${styles.bodyRecipeChoices}`}>
            {bodyRecipeChoices.map((choice) => (
              <button
                type="button"
                key={choice.id}
                aria-pressed={bodyRecipe === choice.id}
                className={bodyRecipe === choice.id ? styles.closureActive : ""}
                onClick={() => chooseBodyRecipe(choice.id)}
              >
                <i aria-hidden="true"><span /></i>
                <strong>{choice.label}</strong>
                <small>{choice.description}</small>
                <b>{choice.short}</b>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.closureRail} aria-labelledby="closure-title" hidden={activeStudioStep !== "build"}>
          <div className={styles.railTitle}>
            <span>02</span>
            <div>
              <p id="closure-title">{bodyRecipe === "four-corner-boxy" ? "Boxy-bag opening" : "Choose the opening"}</p>
              <small>{bodyRecipe === "four-corner-boxy" ? "The centered top zipper is structural in this first boxy-bag method." : "Body math stays visible while the closure kit changes."}</small>
            </div>
          </div>
          <div className={styles.closureChoices}>
            {(bodyRecipe === "four-corner-boxy"
              ? closureChoices.filter((choice) => choice.id === "top-zipper")
              : closureChoices
            ).map((choice) => (
              <button
                type="button"
                key={choice.id}
                aria-pressed={closure === choice.id}
                className={closure === choice.id ? styles.closureActive : ""}
                disabled={bodyRecipe === "four-corner-boxy"}
                onClick={() => setClosure(choice.id)}
              >
                <i aria-hidden="true"><span /></i>
                <strong>{bodyRecipe === "four-corner-boxy" ? "Centered structural zipper" : choice.label}</strong>
                <small>{bodyRecipe === "four-corner-boxy" ? "The top seam that completes the rectangular box" : choice.description}</small>
                <b>{bodyRecipe === "four-corner-boxy" ? "BUILT INTO BODY" : choice.short}</b>
              </button>
            ))}
          </div>
        </section>

        <div className={`${styles.workbench} ${styles[`workbench_${activeStudioStep}`]}`}>
          <aside className={styles.controlPanel}>
            <div className={styles.panelTitle}>
              <div>
                <p>Step {activeStep.number} controls</p>
                <h2>
                  {activeStudioStep === "cuts"
                    ? "Easy cutting sizes"
                    : activeStudioStep === "build"
                      ? "Opening details"
                      : "Fabric setup"}
                </h2>
              </div>
              <span className={styles.stepBadge}>
                {snapStep === 0 ? "free sizing" : `${formatInches(snapStep)} cut grid`}
              </span>
            </div>

            <div className={styles.studioStepContent} hidden={activeStudioStep !== "cuts"}>
            <div className={styles.presetsSection}>
              <div className={styles.presetsHeader}>
                <span>⚡ Real-world presets</span>
                <small>1-click proven {bodyRecipe === "four-corner-boxy" ? "pouch" : "tote"} sizes</small>
              </div>
              <div className={styles.presetChips}>
                {sizePresets
                  .filter((preset) => preset.bodyRecipe === bodyRecipe)
                  .map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      className={styles.presetChip}
                      onClick={() => applySizePreset(preset)}
                      title={preset.description}
                    >
                      <strong>{preset.label}</strong>
                      <small>{preset.dimensions}</small>
                    </button>
                  ))}
              </div>
            </div>

            <section className={styles.cutFirstCard}>
              <header>
                <div>
                  <p>Start here</p>
                  <h3>{bodyRecipe === "four-corner-boxy" ? "Cut the easy boxy rectangles first" : "Cut the easy rectangle first"}</h3>
                </div>
                <span>{cutsMatchGrid ? "easy-grid ready" : "off-grid cuts"}</span>
              </header>
              <strong>{bodyRecipe === "four-corner-boxy"
                ? `${formatInches(plan.boundingCutWidth)} long × ${formatInches(plan.cutHeight)} wide`
                : `${formatInches(plan.boundingCutWidth)} wide × ${formatInches(plan.cutHeight)} tall`}</strong>
              <ol>
                <li>
                  {composition.design.mode === "solid" && !composition.design.contrastEnabled
                    ? "Cut 2 outer rectangles and 2 lining rectangles."
                    : `Build the selected outer panels, trim each to ${formatInches(composition.targetWidth)} × ${formatInches(composition.targetHeight)}, and cut 2 lining rectangles.`}
                </li>
                <li>{bodyRecipe === "four-corner-boxy"
                  ? `Label the zipper edge, then mark and remove a ${formatInches(draft.cornerCut)} square from all four corners of every panel.`
                  : `Mark and remove a ${formatInches(draft.cornerCut)} square from both bottom corners.`}</li>
                <li>Sew with a {formatInches(draft.seamAllowance)} seam allowance.</li>
              </ol>
              <p>The finished measurements below are allowed to be unusual. The measurements you cut stay practical.</p>
              {!cutsMatchGrid ? (
                <button type="button" onClick={makeCutsEasy}>
                  Round body cuts to the nearest {formatInches(easyCutGrid)}
                </button>
              ) : null}
            </section>

            <div className={styles.basisToggle} aria-label="Sizing direction">
              <button type="button" aria-pressed={basis === "cut"} onClick={() => setBasis("cut")}>
                <strong>Easy cut sizes</strong>
                <small>fabric first → sewn result</small>
              </button>
              <button type="button" aria-pressed={basis === "finished"} onClick={() => setBasis("finished")}>
                <strong>Exact finished size</strong>
                <small>result first → calculated cuts</small>
              </button>
            </div>

            <div className={styles.fieldStack}>
              {basis === "finished" ? (
                <>
                  <MeasurementField label={bodyRecipe === "four-corner-boxy" ? "Finished length" : "Bottom / base width"} hint={bodyRecipe === "four-corner-boxy" ? "along the centered zipper" : "finished front edge at the floor"} value={plan.finishedBaseWidth} min={1} onChange={(value) => updateFinished("baseWidth", value)} />
                  <MeasurementField label="Standing height" hint={bodyRecipe === "four-corner-boxy" ? "finished rim to bottom plane" : "finished rim to bottom plane"} value={plan.finishedHeight} min={1} onChange={(value) => updateFinished("height", value)} />
                  <MeasurementField label={bodyRecipe === "four-corner-boxy" ? "Finished width" : "Bag depth"} hint={bodyRecipe === "four-corner-boxy" ? "created by all four corner squares" : "front-to-back finished space"} value={plan.finishedDepth} min={1} onChange={(value) => updateFinished("depth", value)} />
                </>
              ) : (
                <>
                  <MeasurementField label={bodyRecipe === "four-corner-boxy" ? "Panel cut length" : "Panel cut width"} hint={bodyRecipe === "four-corner-boxy" ? "long edge runs along the zipper" : "raw edge to raw edge"} value={draft.cutWidth} min={3} step={snapStep === 0 ? 0.125 : snapStep} onChange={(value) => updateDraft({ ...draft, cutWidth: Math.max(0, value) })} />
                  <MeasurementField label={bodyRecipe === "four-corner-boxy" ? "Zipper-to-bottom wrap span" : "Panel cut height"} hint={bodyRecipe === "four-corner-boxy" ? "raw zipper edge to raw bottom edge" : "raw top to raw bottom"} value={draft.cutHeight} min={3} step={snapStep === 0 ? 0.125 : snapStep} onChange={(value) => updateDraft({ ...draft, cutHeight: Math.max(0, value) })} />
                  <MeasurementField label={bodyRecipe === "four-corner-boxy" ? "Four-corner square" : "Corner square"} hint={bodyRecipe === "four-corner-boxy" ? "remove from every corner" : "measure from both raw edges"} value={draft.cornerCut} min={0.5} step={snapStep === 0 ? 0.125 : snapStep} onChange={(value) => updateDraft({ ...draft, cornerCut: Math.max(0, value) })} />
                </>
              )}
            </div>

            <section className={styles.seamSection}>
              <div className={styles.subhead}>
                <div>
                  <span>Seam allowance</span>
                  <strong>{formatInches(draft.seamAllowance)}</strong>
                </div>
                <div className={styles.presetRow}>
                  {seamPresets.map((preset) => (
                    <button type="button" key={preset} aria-pressed={Math.abs(draft.seamAllowance - preset) < 0.001} onClick={() => updateSeamAllowance(preset)}>{formatInches(preset)}</button>
                  ))}
                </div>
              </div>
              <p>{bodyRecipe === "four-corner-boxy"
                ? "Use this same allowance on the zipper, ends, bottom, and all box seams so the four-corner formula remains consistent."
                : "The cut line sits this far outside the stitch line. Side, bottom, and corner allowances stay locked together so the corner shortcut remains accurate."}</p>
            </section>

            <section className={styles.cornerLab}>
              <div className={styles.subhead}>
                <div>
                  <span>Box-corner experiment</span>
                  <strong>{formatInches(draft.cornerCut)} square</strong>
                </div>
                <span className={styles.depthPill}>{bodyRecipe === "four-corner-boxy" ? `${formatInches(plan.finishedDepth)} wide` : `${formatInches(plan.finishedDepth)} deep`}</span>
              </div>
              <input
                className={styles.range}
                type="range"
                min="0.5"
                max={Math.max(
                  0.5,
                  Math.min(
                    5,
                    draft.cutHeight / 2 - draft.seamAllowance - 0.5,
                    bodyRecipe === "four-corner-boxy"
                      ? draft.cutWidth / 2 - draft.seamAllowance - 0.5
                      : 5,
                  ),
                )}
                step={snapStep === 0 ? 0.01 : snapStep}
                value={draft.cornerCut}
                aria-label="Corner square size"
                onChange={(event) => chooseCorner(event.target.valueAsNumber)}
              />
              <div className={styles.cornerPresets}>
                {cornerPresets.map((preset) => (
                  <button type="button" key={preset} aria-pressed={Math.abs(draft.cornerCut - preset) < 0.001} onClick={() => chooseCorner(preset)}>{formatInches(preset)}</button>
                ))}
              </div>
              <div className={styles.cornerEquation}>
                <span>{formatInches(draft.cornerCut)}</span>
                <i>× 2</i>
                <span>{formatInches(plan.finishedDepth)}</span>
                <small>raw square</small>
                <small />
                <small>{bodyRecipe === "four-corner-boxy" ? "finished width" : "finished depth"}</small>
              </div>
              {bodyRecipe === "four-corner-boxy" ? (
                <div className={`${styles.boxyShapeCheck} ${boxyHasTallProportions ? styles.boxyShapeAlert : ""}`} aria-live="polite">
                  <div>
                    <span>Shape check</span>
                    <strong>{boxyHasTallProportions ? "Tall, narrow pouch" : "Balanced boxy proportion"}</strong>
                  </div>
                  <p>{boxyHasTallProportions
                    ? <>This is mathematically valid, but it will be {formatInches(plan.finishedHeight)} high while its narrow side is only {formatInches(boxyNarrowSide)}. The 3D tower shape is the actual result of these cuts.</>
                    : <>The finished height stays reasonably close to the narrow side of the box.</>}</p>
                  <dl>
                    <div>
                      <dt>Finished length</dt>
                      <dd>{formatInches(draft.cutWidth)} − {formatInches(draft.cornerCut * 2)} corners − {formatInches(draft.seamAllowance * 2)} seams = {formatInches(plan.finishedBaseWidth)}</dd>
                    </div>
                    <div>
                      <dt>Finished height</dt>
                      <dd>{formatInches(draft.cutHeight)} − {formatInches(draft.cornerCut * 2)} corners − {formatInches(draft.seamAllowance * 2)} seams = {formatInches(plan.finishedHeight)}</dd>
                    </div>
                  </dl>
                  {boxyHasTallProportions && Math.abs(balancedBoxyCorner - draft.cornerCut) > 0.001 ? (
                    <button
                      type="button"
                      onClick={() => {
                        updateDraft({ ...draft, cornerCut: balancedBoxyCorner });
                        setBasis("cut");
                      }}
                    >
                      Use balanced {formatInches(balancedBoxyCorner)} corners → {formatInches(balancedBoxyPlan.finishedBaseWidth)} L × {formatInches(balancedBoxyPlan.finishedDepth)} W × {formatInches(balancedBoxyPlan.finishedHeight)} H
                    </button>
                  ) : null}
                </div>
              ) : null}
              <p>{bodyRecipe === "four-corner-boxy"
                ? basis === "finished"
                  ? "Finished mode keeps the length and height while all four linked corner squares change the width."
                  : "Cut-first mode keeps the rectangles fixed: a larger square makes the box wider while shortening its length and height."
                : basis === "finished"
                  ? "Finished mode keeps your base width and height while the panel grows or shrinks."
                  : "Cut-panel mode keeps the fabric fixed so you can see exactly what a larger corner steals."}</p>
            </section>

            {bodyRecipe === "two-panel-tote" ? (
              <section className={styles.shapeSection}>
                <div className={styles.subhead}>
                  <div>
                    <span>Side shaping</span>
                    <strong>Angle the top</strong>
                  </div>
                  <button type="button" className={styles.mirrorButton} aria-pressed={mirror} onClick={() => setMirror((current) => !current)}>
                    <i aria-hidden="true">↔</i> Mirror {mirror ? "on" : "off"}
                  </button>
                </div>
                <div className={styles.insetFields}>
                  <MeasurementField label="Left inset" hint={`${Math.round(plan.leftTopAngle)}° top angle`} value={draft.leftTopInset} min={-3} step={snapStep === 0 ? 0.125 : snapStep} onChange={(value) => updateInset("left", value)} />
                  <MeasurementField label="Right inset" hint={`${Math.round(plan.rightTopAngle)}° top angle`} value={draft.rightTopInset} min={-3} step={snapStep === 0 ? 0.125 : snapStep} onChange={(value) => updateInset("right", value)} />
                </div>
                <p>Positive values narrow the top; negative values flare it. Mirror keeps both stitch-line angles identical.</p>
              </section>
            ) : (
              <section className={styles.shapeSection}>
                <div className={styles.subhead}>
                  <div>
                    <span>Corner construction</span>
                    <strong>Boxing method</strong>
                  </div>
                </div>
                <div className={styles.structureGrid}>
                  {boxyBoxingChoices.map((choice) => (
                    <button
                      type="button"
                      key={choice.id}
                      aria-pressed={boxyBoxingMethod === choice.id}
                      className={boxyBoxingMethod === choice.id ? styles.structureActive : ""}
                      onClick={() => setBoxyBoxingMethod(choice.id)}
                    >
                      <strong>{choice.label}</strong>
                      <b>{choice.detail}</b>
                      <small>{choice.description}</small>
                    </button>
                  ))}
                </div>

                {boxyBoxingMethod === "pinch-french-seam" && (
                  <div className={styles.frenchSeamCard}>
                    <header>
                      <span>📐 Compensated 2-pass math</span>
                      <strong>Pass 1 compensation</strong>
                    </header>
                    {(() => {
                      const frenchPlan = calculateFrenchCornerPlan(plan.cornerCut * 2, plan.seamAllowance);
                      return (
                        <div>
                          <p>To keep finished {formatInches(plan.finishedDepth)} box depth accurate after enclosing raw edges:</p>
                          <ul>
                            {frenchPlan.guidance.map((g) => (
                              <li key={g}>{g}</li>
                            ))}
                          </ul>
                          {frenchPlan.warnings.map((w) => (
                            <small key={w} className={styles.warningNote}>⚠️ {w}</small>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className={styles.subhead} style={{ marginTop: "1rem" }}>
                  <div>
                    <span>End attachments</span>
                    <strong>Handles & pull tabs</strong>
                  </div>
                </div>
                <div className={styles.structureGrid}>
                  {boxyHandleChoices.map((choice) => (
                    <button
                      type="button"
                      key={choice.id}
                      aria-pressed={boxyHandleStyle === choice.id}
                      className={boxyHandleStyle === choice.id ? styles.structureActive : ""}
                      onClick={() => setBoxyHandleStyle(choice.id)}
                    >
                      <strong>{choice.label}</strong>
                      <b>{choice.detail}</b>
                      <small>{choice.description}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}
            </div>

            <div className={styles.studioStepContent} hidden={activeStudioStep !== "build"}>
            <section className={styles.structureSection}>
              <div className={styles.subhead}>
                <div>
                  <span>Body structure</span>
                  <strong>Interfacing & feel</strong>
                </div>
              </div>
              <div className={styles.structureGrid}>
                {structureChoices.map((choice) => (
                  <button
                    type="button"
                    key={choice.id}
                    aria-pressed={structureFeel === choice.id}
                    className={structureFeel === choice.id ? styles.structureActive : ""}
                    onClick={() => setStructureFeel(choice.id)}
                  >
                    <strong>{choice.label}</strong>
                    <b>{choice.material}</b>
                    <small>{choice.description}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.pocketSection}>
              <div className={styles.subhead}>
                <div>
                  <span>Interior storage</span>
                  <strong>Slip pocket</strong>
                </div>
              </div>
              <div className={styles.pocketGrid}>
                {pocketChoices.map((choice) => (
                  <button
                    type="button"
                    key={choice.id}
                    aria-pressed={pocketStyle === choice.id}
                    className={pocketStyle === choice.id ? styles.pocketActive : ""}
                    onClick={() => setPocketStyle(choice.id)}
                  >
                    <strong>{choice.label}</strong>
                    <small>{choice.description}</small>
                  </button>
                ))}
              </div>
              {pocketStyle !== "none" ? (
                <div className={styles.pocketDetailCard}>
                  {(() => {
                    const pocket = calculatePocketPlan(plan, pocketStyle);
                    return (
                      <>
                        <div className={styles.pocketDetailHeader}>
                          <span>Cut 1 piece: <strong>{formatInches(pocket.cutWidth)} × {formatInches(pocket.cutHeight)}</strong></span>
                          <b>{pocketStyle === "divided-slip" ? "DIVIDED SLIP" : "SINGLE SLIP"}</b>
                        </div>
                        <p>Finishes {formatInches(pocket.finishedWidth)} wide × {formatInches(pocket.finishedHeight)} high with 1″ double-fold top hem and 1/2″ edge turn-under.</p>
                        {pocket.notes.map((note) => <small key={note}>{note}</small>)}
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </section>

            <section className={styles.closureOptions}>
              <div className={styles.subhead}>
                <div>
                  <span>{bodyRecipe === "four-corner-boxy" ? "Boxy structural zipper" : closureChoices.find((choice) => choice.id === closure)?.label}</span>
                  <strong>Closure details</strong>
                </div>
              </div>
              {closure === "open-tote" ? (
                <div className={styles.handleControls}>
                  <div className={styles.handleMaterialToggle} role="group" aria-label="Handle material">
                    <button type="button" aria-pressed={closureOptions.handleMaterial === "webbing"} onClick={() => setClosureOptions((current) => ({ ...current, handleMaterial: "webbing" }))}>Webbing</button>
                    <button type="button" aria-pressed={closureOptions.handleMaterial === "fabric"} onClick={() => setClosureOptions((current) => ({ ...current, handleMaterial: "fabric" }))}>Folded fabric</button>
                  </div>
                  <div className={styles.handleFieldGrid}>
                    <MeasurementField label="Handle width" hint="finished edge to edge" value={closureOptions.handleWidth} min={0.25} onChange={(value) => setClosureOptions((current) => ({ ...current, handleWidth: Math.max(0.25, value) }))} />
                    <MeasurementField label="Corner inset" hint="front corner to center" value={closureOptions.handleInset} min={0} onChange={(value) => setClosureOptions((current) => ({ ...current, handleInset: Math.max(0, value) }))} />
                    <MeasurementField label="Attachment depth" hint="rim to bottom of stitching" value={closureOptions.handleAttachmentDepth} min={0.5} onChange={(value) => setClosureOptions((current) => ({ ...current, handleAttachmentDepth: Math.max(0.5, value) }))} />
                    <MeasurementField label="Handle drop" hint="inside rim-to-apex clearance" value={closureOptions.handleDrop} min={1} onChange={(value) => setClosureOptions((current) => ({ ...current, handleDrop: Math.max(1, value) }))} />
                  </div>
                  <div className={styles.handleReadout}>
                    <span><small>Centers apart</small><strong>{formatInches(handlePlan.centerSpacing)}</strong></span>
                    <span><small>Cut each</small><strong>{formatInches(handlePlan.cutLength)} × {formatInches(handlePlan.cutWidth)}</strong></span>
                  </div>
                  <p className={styles.handlePlacementCopy}>Mark each handle center {formatInches(handlePlan.handleInset)} in from the finished front-corner fold, then secure it {formatInches(handlePlan.handleAttachmentDepth)} below the rim.</p>
                </div>
              ) : null}
              {closure === "side-zipper" ? (
                <div className={styles.sideZipperControls}>
                  <MeasurementField label="Opening length" hint="between zipper stops" value={closureOptions.sideZipperLength} min={3} onChange={(value) => setClosureOptions((current) => ({ ...current, sideZipperLength: Math.max(3, value) }))} />
                  <div className={styles.handleMaterialToggle} role="group" aria-label="Side zipper location">
                    <button type="button" aria-pressed={closureOptions.sideZipperSide === "left"} onClick={() => setClosureOptions((current) => ({ ...current, sideZipperSide: "left" }))}>Left side</button>
                    <button type="button" aria-pressed={closureOptions.sideZipperSide === "right"} onClick={() => setClosureOptions((current) => ({ ...current, sideZipperSide: "right" }))}>Right side</button>
                  </div>
                </div>
              ) : null}
              {closure === "zipper-gusset" ? (
                <MeasurementField label="Zipper reveal" hint="finished gap between folds" value={closureOptions.zipperGap} min={0} onChange={(value) => setClosureOptions((current) => ({ ...current, zipperGap: Math.max(0, value) }))} />
              ) : null}
              {closure === "recessed-zipper" ? (
                <div className={styles.recessedControls}>
                  <div className={styles.recessedMethodToggle}>
                    <span>Panel end style</span>
                    <div className={styles.handleMaterialToggle} role="group" aria-label="Recessed zipper panel end style">
                      <button type="button" aria-pressed={closureOptions.recessEndStyle === "boxed"} onClick={() => setClosureOptions((current) => ({ ...current, recessEndStyle: "boxed" }))}>Boxed ends</button>
                      <button type="button" aria-pressed={closureOptions.recessEndStyle === "open"} onClick={() => setClosureOptions((current) => ({ ...current, recessEndStyle: "open" }))}>Open ends</button>
                    </div>
                  </div>
                  <MeasurementField label="Finished zipper-panel depth" hint="strip width after seam allowances" value={closureOptions.recessDepth} min={0.5} onChange={(value) => setClosureOptions((current) => ({ ...current, recessDepth: Math.max(0.5, value) }))} />
                  {closureOptions.recessEndStyle === "boxed" ? (
                    <MeasurementField label="Zipper-panel square" hint="cut from both zipper-edge corners" value={closureOptions.recessNotch} min={0.25} onChange={(value) => setClosureOptions((current) => ({ ...current, recessNotch: Math.max(0.25, value) }))} />
                  ) : (
                    <MeasurementField label="End gap" hint="free space at each side seam" value={closureOptions.recessEndGap} min={0.25} onChange={(value) => setClosureOptions((current) => ({ ...current, recessEndGap: Math.max(0.25, value) }))} />
                  )}
                  {closureWarnings.length ? (
                    <div className={styles.recessedInlineWarnings} role="status">
                      {closureWarnings.map((warning) => <p key={warning}>{warning}</p>)}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {closure === "top-zipper" ? <p className={styles.optionOnlyNote}>{bodyRecipe === "four-corner-boxy" ? `The zipper sewing span between the upper squares is ${formatInches(plan.finishedFlatWidth)}. Start longer, sew across nylon teeth only, and trim after the ends are secured.` : "The zipper uses the full flat top seam; extra tape is added for handling and trimming."}</p> : null}
              <p className={styles.closureTeaching}>{closureTeaching(bodyRecipe, closure, closureOptions)}</p>
            </section>
            </div>

            <section className={styles.fabricInput} hidden={activeStudioStep !== "plan"}>
              <MeasurementField label="Fabric bolt width" hint="nominal width before selvages" value={draft.fabricWidth} min={20} step={1} onChange={(value) => updateDraft({ ...draft, fabricWidth: Math.max(20, value) })} />
            </section>
          </aside>

          <section className={styles.canvasColumn}>
            <div className={styles.cutCanvasWorkspace} hidden={activeStudioStep !== "cuts"}>
            <div className={styles.canvasToolbar}>
              <div className={styles.toolButtons} aria-label="Vector tools">
                <button type="button" aria-pressed={toolMode === "select"} onClick={() => setToolMode("select")}><i aria-hidden="true">↖</i><span>Select</span><small>resize edges</small></button>
                <button type="button" aria-pressed={toolMode === "shape"} onClick={() => setToolMode("shape")}><i aria-hidden="true">⌁</i><span>Vector pen</span><small>{bodyRecipe === "four-corner-boxy" ? "4 linked corners" : "angles + corners"}</small></button>
              </div>
              <div className={styles.snapControl}>
                <label htmlFor="snap-step">Cut grid</label>
                <select id="snap-step" value={snapStep} onChange={(event) => setSnapStep(Number(event.target.value) as SnapStep)}>
                  <option value={1}>Whole inch</option>
                  <option value={0.5}>½ inch</option>
                  <option value={0.25}>¼ inch</option>
                  <option value={0.125}>⅛ inch</option>
                  <option value={0}>Free</option>
                </select>
              </div>
              <div className={styles.toolbarHint}>
                <span>{bodyRecipe === "four-corner-boxy" ? "Four-corner editing" : mirror ? "Mirrored editing" : "Independent edges"}</span>
                <small>{bodyRecipe === "four-corner-boxy" ? "All corner squares move together to keep a true rectangular box." : "Drag the bright handles or focus one and use arrow keys."}</small>
              </div>
            </div>

            {bodyRecipe === "four-corner-boxy" ? (
              <BoxyPatternCanvas
                draft={draft}
                plan={plan}
                composition={composition}
                snapStep={snapStep}
                toolMode={toolMode}
                onDraftChange={updateDraft}
                onUseCutBasis={() => setBasis("cut")}
              />
            ) : (
              <PatternCanvas
                draft={draft}
                plan={plan}
                composition={composition}
                closure={closure}
                handlePlan={handlePlan}
                mirror={mirror}
                snapStep={snapStep}
                toolMode={toolMode}
                onDraftChange={updateDraft}
                onUseCutBasis={() => setBasis("cut")}
              />
            )}

            {showMiniPip ? (
              <aside className={styles.miniPipCard} aria-label="3D live preview">
                <div className={styles.miniPipHeader}>
                  <span>Live 3D Outcome</span>
                  <button
                    type="button"
                    className={styles.miniPipToggle}
                    onClick={() => setShowMiniPip(false)}
                    title="Hide mini preview"
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.miniPipCanvas}>
                  <BagOutcomePreview
                    variant="thumbnail"
                    bodyRecipe={bodyRecipe}
                    plan={plan}
                    closure={closure}
                    options={closureOptions}
                    composition={composition}
                    yaw={previewYaw}
                  />
                </div>
              </aside>
            ) : (
              <button
                type="button"
                className={styles.miniPipRestore}
                onClick={() => setShowMiniPip(true)}
                title="Show mini 3D outcome preview"
              >
                <span>3D PIP</span>
              </button>
            )}

            <div className={styles.liveStrip}>
              <div>
                <span>{bodyRecipe === "four-corner-boxy" ? "Raw rectangle" : "Raw panel"}</span>
                <strong>{formatInches(plan.cutWidth)} × {formatInches(plan.cutHeight)}</strong>
              </div>
              <i>→</i>
              <div>
                <span>{bodyRecipe === "four-corner-boxy" ? "Zipper seam span" : "Flat width"}</span>
                <strong>{formatInches(plan.finishedFlatWidth)}</strong>
              </div>
              <i>→</i>
              <div className={styles.liveStripAccent}>
                <span>{bodyRecipe === "four-corner-boxy" ? "Finished box" : "Finished footprint"}</span>
                <strong>{bodyRecipe === "four-corner-boxy"
                  ? `${formatInches(plan.finishedBaseWidth)} L × ${formatInches(plan.finishedDepth)} W × ${formatInches(plan.finishedHeight)} H`
                  : `${formatInches(plan.finishedBaseWidth)} × ${formatInches(plan.finishedDepth)}`}</strong>
              </div>
            </div>
            </div>

            <div className={styles.buildWorkspace} hidden={activeStudioStep !== "build"}>
            <BagPanelComposer
              bodyRecipe={bodyRecipe}
              plan={plan}
              value={outerDesign}
              composition={composition}
              onChange={(value) => {
                setOuterDesign(value);
                setCopyState("idle");
              }}
            />

            <BagOutcomePreview
              bodyRecipe={bodyRecipe}
              plan={plan}
              closure={closure}
              options={closureOptions}
              composition={composition}
              yaw={previewYaw}
              onYawChange={setPreviewYaw}
            />
            </div>

            <div className={styles.fabricWorkspace} hidden={activeStudioStep !== "plan"}>
            <FabricLayoutPanel
              plan={plan}
              composition={composition}
              settings={fabricSettings}
              onSettingsChange={setFabricSettings}
            />
            {closure === "recessed-zipper" ? (
              <RecessedZipperCutPlan plan={plan} options={closureOptions} />
            ) : null}
            {bodyRecipe === "four-corner-boxy" ? (
              <BoxyBagCutPlan
                plan={plan}
                boxingMethod={boxyBoxingMethod}
                handleStyle={boxyHandleStyle}
                structureFeel={structureFeel}
                pocketStyle={pocketStyle}
              />
            ) : null}
            </div>
          </section>

          <aside className={styles.resultPanel} hidden={activeStudioStep !== "plan"}>
            <div className={styles.resultTitle}>
              <div>
                <p>Live outcome</p>
                <h2>What you will get</h2>
              </div>
              <span className={ready ? styles.validBadge : styles.invalidBadge}>{ready ? "READY" : "CHECK"}</span>
            </div>

            <section className={styles.finishedCard}>
              <p>Finished bag</p>
              <strong>{bodyRecipe === "four-corner-boxy"
                ? `${formatInches(plan.finishedBaseWidth)} L × ${formatInches(plan.finishedDepth)} W × ${formatInches(plan.finishedHeight)} H`
                : `${formatInches(plan.finishedBaseWidth)} W × ${formatInches(plan.finishedHeight)} H × ${formatInches(plan.finishedDepth)} D`}</strong>
              <div>
                <span><small>Bottom footprint</small><b>{formatInches(plan.finishedBaseWidth)} × {formatInches(plan.finishedDepth)}</b></span>
                <span><small>{bodyRecipe === "four-corner-boxy" ? "Zipper seam span" : "Flat top seam"}</small><b>{formatInches(bodyRecipe === "four-corner-boxy" ? plan.finishedFlatWidth : plan.finishedTopOpening)}</b></span>
                <span><small>Approx. volume</small><b>{Math.round(plan.volumeCubicInches / 61)} L</b></span>
              </div>
            </section>

            <section className={styles.mathCard}>
              <header>
                <span>{bodyRecipe === "four-corner-boxy" ? "Why four equal squares make a true box" : `Why the ${formatInches(plan.seamAllowance)} does not add to the square`}</span>
                <b>{bodyRecipe === "four-corner-boxy" ? "BOXY MATH" : "BOX MATH"}</b>
              </header>
              <div className={styles.mathDiagram} aria-hidden="true">
                <span className={styles.mathCut} />
                <span className={styles.mathStitch} />
                <span className={styles.mathCorner}>C</span>
                <span className={styles.mathSeam}>{formatInches(plan.seamAllowance)}</span>
              </div>
              <p>{bodyRecipe === "four-corner-boxy"
                ? <>Measure every square from its <strong>two raw edges</strong>. The upper pair shapes the zipper ends and the lower pair shapes the bottom; equal squares keep the top and bottom the same size.</>
                : <>Measure the corner square from the <strong>raw side and bottom edges</strong>. When the side, bottom, and boxed seams all use {formatInches(plan.seamAllowance)}, their offsets cancel in the fold.</>}</p>
              <div className={styles.mathFormula}>
                <span>{bodyRecipe === "four-corner-boxy" ? "Height" : "Depth"}</span>
                <b>=</b>
                <strong>2 × corner square</strong>
                <em>= {formatInches(bodyRecipe === "four-corner-boxy" ? plan.finishedHeight : plan.finishedDepth)}</em>
              </div>
              <small>{bodyRecipe === "four-corner-boxy"
                ? `The corners also remove ${formatInches(plan.cornerCut)} from both ends of the length and width. Sew a scrap test when bulk matters.`
                : "If you pinch first instead, measure half the desired depth from the actual seam intersection—not from the raw fabric point."}</small>
            </section>

            {!ready ? (
              <section className={styles.warningList}>
                {[...plan.warnings, ...composition.warnings, ...closureWarnings].map((warning) => <p key={warning}>{warning}</p>)}
              </section>
            ) : null}

            <section className={styles.cutList}>
              <header>
                <div>
                  <p>Cut list</p>
                  <h3>{bodyRecipe === "four-corner-boxy" ? "Boxy zipper bag" : closureChoices.find((choice) => choice.id === closure)?.label}</h3>
                </div>
                <span>{pieces.length} groups</span>
              </header>
              <div className={styles.cutRows}>
                {pieces.map((piece) => (
                  <article key={`${piece.material}-${piece.name}`}>
                    <span className={`${styles.materialDot} ${styles[`material_${piece.material}`]}`}>{piece.quantity}×</span>
                    <div>
                      <strong>{piece.name}</strong>
                      <b>{formatInches(piece.width)} × {formatInches(piece.height)}</b>
                      <small>{piece.note}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.notionCard}>
              <span>Hardware + construction</span>
              <strong>{zipperNote(plan, bodyRecipe, closure, closureOptions)}</strong>
              <p>Directional fabric: keep grain arrows parallel. Thick foam or vinyl: make a scrap corner because turn-of-cloth can reduce the inside size.</p>
              {handleBuildAdvisories.map((advisory) => <b key={advisory}>{advisory}</b>)}
              {closure !== "open-tote" ? <b>Before closing the shell, open the zipper at least halfway.</b> : null}
            </section>

            <div className={styles.resultActions}>
              <button type="button" onClick={() => void copyPlan()} disabled={!ready}>{copyState === "copied" ? "Copied ✓" : copyState === "error" ? "Copy failed" : "Copy cut plan"}</button>
              <button type="button" onClick={() => window.print()}>Print</button>
              <button type="button" className={styles.primaryAction} disabled={!ready} onClick={() => bodyRecipe === "four-corner-boxy" ? downloadBoxyPatternSvg(plan) : downloadPatternSvg(plan, composition, closure, handlePlan)}>Download {bodyRecipe === "four-corner-boxy" ? "boxy-panel" : "body-panel"} SVG</button>
            </div>
          </aside>
        </div>
        <nav className={styles.studioStepFooter} aria-label="Continue through bag design steps">
          <button
            type="button"
            disabled={activeStepIndex <= 0}
            onClick={() => goToStudioStep(studioSteps[activeStepIndex - 1]?.id ?? "cuts")}
          >
            ← Previous step
          </button>
          <p>
            <span>Step {activeStep.number} of {studioSteps.length}</span>
            <strong>{activeStep.label}</strong>
          </p>
          <button
            type="button"
            className={styles.studioNextButton}
            disabled={activeStepIndex >= studioSteps.length - 1}
            onClick={() => goToStudioStep(studioSteps[activeStepIndex + 1]?.id ?? "plan")}
          >
            Next step →
          </button>
        </nav>
        </div>

        <section
          className={styles.savedLibrary}
          id="saved-bags-workspace"
          role="tabpanel"
          aria-labelledby="saved-bags-tab"
          hidden={activeTab !== "saved"}
        >
          <header className={styles.savedLibraryHeader}>
            <div>
              <p>Named patterns</p>
              <h2>Your saved bags</h2>
              <span>Open a design to continue from every saved measurement, panel choice, closure setting, fabric plan, and 3D angle.</span>
            </div>
            <button type="button" className={styles.projectPrimaryAction} onClick={startNewBag}>+ New bag</button>
          </header>

          {savedBags.length ? (
            <label className={styles.savedSearch}>
              <span>Find a saved bag</span>
              <input
                type="search"
                value={savedSearch}
                placeholder="Search by name"
                onChange={(event) => setSavedSearch(event.target.value)}
              />
            </label>
          ) : null}

          {filteredSavedBags.length ? (
            <div className={styles.savedBagGrid}>
              {filteredSavedBags.map((saved) => {
                const savedPlan = saved.snapshot.bodyRecipe === "four-corner-boxy"
                  ? calculateBoxyBagPlan(saved.snapshot.boxyDraft)
                  : calculateBagPatternPlan(saved.snapshot.draft);
                const closureLabel = closureChoices.find(
                  (choice) => choice.id === saved.snapshot.closure,
                )?.label;
                const boxySaved = saved.snapshot.bodyRecipe === "four-corner-boxy";
                return (
                  <article className={styles.savedBagCard} key={saved.id}>
                    <div className={styles.savedBagCardTop}>
                      <span>{boxySaved ? "Boxy zipper bag" : closureLabel}</span>
                      {saved.id === activeSavedBagId ? <b>OPEN</b> : null}
                    </div>
                    <h3>{saved.name}</h3>
                    {activeTab === "saved" ? (
                      <SavedBagThumbnail snapshot={saved.snapshot} />
                    ) : null}
                    <strong>{boxySaved
                      ? `${formatInches(savedPlan.finishedBaseWidth)} L × ${formatInches(savedPlan.finishedDepth)} W × ${formatInches(savedPlan.finishedHeight)} H`
                      : `${formatInches(savedPlan.finishedBaseWidth)} W × ${formatInches(savedPlan.finishedHeight)} H × ${formatInches(savedPlan.finishedDepth)} D`}</strong>
                    <dl>
                      <div><dt>Outer</dt><dd>{saved.snapshot.outerDesign.mode.replaceAll("-", " ")}</dd></div>
                      <div><dt>Fabric</dt><dd>{saved.snapshot.fabricSettings.source === "fat-quarters" ? "fat quarters" : `${formatInches(boxySaved ? saved.snapshot.boxyDraft.fabricWidth : saved.snapshot.draft.fabricWidth)} bolt`}</dd></div>
                      <div><dt>Updated</dt><dd>{formatSavedBagTime(saved.updatedAt)}</dd></div>
                    </dl>
                    <div className={styles.savedBagActions}>
                      <button type="button" className={styles.projectPrimaryAction} onClick={() => openSavedBag(saved)}>Open</button>
                      <button type="button" onClick={() => duplicateSavedBag(saved)}>Duplicate</button>
                      <button type="button" className={styles.savedBagRemove} onClick={() => removeSavedBag(saved)}>Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.savedEmptyState}>
              <span aria-hidden="true">◇</span>
              <h3>{savedBags.length ? "No names match that search." : "No named bags yet."}</h3>
              <p>Your latest working settings are already restored automatically. Give a design a name in the studio when you want to keep it as a reusable pattern.</p>
              <button type="button" onClick={() => showWorkspaceTab("studio", true)}>Return to design studio</button>
            </div>
          )}

          <p className={styles.savedLocalNote}>These early saves stay only in this browser, under your signed-in Monosyth profile. They are not published or shared.</p>
        </section>

        {companionMode ? (
          <div className={styles.companionOverlay} role="dialog" aria-label="Studio Sewing Table Companion Mode">
            <div className={styles.companionModal}>
              <header className={styles.companionHeader}>
                <div>
                  <span className={styles.companionBadge}>🧵 STUDIO SEWING COMPANION</span>
                  <h2>{bagName.trim() || (bodyRecipe === "four-corner-boxy" ? "Boxy Zipper Pouch" : "Two-Panel Tote")}</h2>
                  <p>
                    {bodyRecipe === "four-corner-boxy"
                      ? `${formatInches(plan.finishedBaseWidth)} L × ${formatInches(plan.finishedDepth)} W × ${formatInches(plan.finishedHeight)} H`
                      : `${formatInches(plan.finishedBaseWidth)} W × ${formatInches(plan.finishedHeight)} H × ${formatInches(plan.finishedDepth)} D`}
                    {" · "}
                    {structureChoices.find((c) => c.id === structureFeel)?.label}
                  </p>
                </div>
                <div className={styles.companionHeaderActions}>
                  <button type="button" onClick={() => window.print()} className={styles.companionPrintBtn}>Print Sheet</button>
                  <button type="button" onClick={() => setCompanionMode(false)} className={styles.companionCloseBtn}>✕ Close</button>
                </div>
              </header>

              <div className={styles.companionBody}>
                <section className={styles.companionCutSection}>
                  <div className={styles.companionSectionTitle}>
                    <h3>1. Fabric Cut Checklist</h3>
                    <span>
                      {pieces.filter((p) => cutProgress[`${p.material}-${p.name}`]).length} of {pieces.length} groups cut
                    </span>
                  </div>
                  <div className={styles.companionPieceList}>
                    {pieces.map((piece) => {
                      const key = `${piece.material}-${piece.name}`;
                      const isChecked = !!cutProgress[key];
                      return (
                        <label
                          key={key}
                          className={`${styles.companionPieceCard} ${isChecked ? styles.pieceCardChecked : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCutProgress(key)}
                          />
                          <div className={styles.companionPieceInfo}>
                            <div className={styles.companionPieceTop}>
                              <span className={`${styles.materialPill} ${styles[`material_${piece.material}`]}`}>
                                {piece.quantity}× {piece.material.toUpperCase()}
                              </span>
                              <strong>{piece.name}</strong>
                            </div>
                            <b className={styles.companionDimension}>
                              {formatInches(piece.width)} × {formatInches(piece.height)}
                            </b>
                            <small>{piece.note}</small>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className={styles.companionStepsSection}>
                  <div className={styles.companionSectionTitle}>
                    <h3>2. Assembly Sequence & Checkpoints</h3>
                    <span>{sewingSteps.length} step sequence</span>
                  </div>
                  <ol className={styles.companionStepList}>
                    {sewingSteps.map((step, idx) => (
                      <li key={step} className={styles.companionStepItem}>
                        <span className={styles.companionStepNumber}>{idx + 1}</span>
                        <p>{step}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </div>
          </div>
        ) : null}

        <footer className={styles.appFooter}>
          <span>Monosyth / Modular Bag Studio</span>
          <p>Shared sewing ideas, distinct bag bodies, and practical cuts.</p>
          <Link href="/app">← Back to Studio</Link>
        </footer>
      </div>
    </main>
  );
}

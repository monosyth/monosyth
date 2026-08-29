
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
import { SizeBasis, BodyRecipe, ToolMode, SnapStep, StudioStep, DragHandle, ClosureOptions, CutPiece, BagSizePreset, closureChoices, bodyRecipeChoices, structureChoices, pocketChoices, boxyHandleChoices, boxyBoxingChoices, studioSteps } from "./constants";

export function outerDesignForBody(bodyRecipe: BodyRecipe, design: OuterPanelDesign): OuterPanelDesign {
    return bodyRecipe === "four-corner-boxy"
    ? { ...design, contrastEnabled: false }
    : design;
}

export function cleanInput(value: number, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

export function savedBagCopyName(name: string, savedBags: SavedBagDesign[]) {
    const base = `${name.trim() || "Untitled bag"} copy`;
    const existing = new Set(savedBags.map((saved) => saved.name.toLocaleLowerCase()));
    if (!existing.has(base.toLocaleLowerCase())) return base;
    let suffix = 2;
    while (existing.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
    return `${base} ${suffix}`;
}

export function formatSavedBagTime(value: string) {
    return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    }).format(new Date(value));
}

export function standingTopRimWidth(plan: BagPatternPlan) {
    return Math.max(0, plan.finishedTopOpening - plan.finishedDepth);
}

export function finishedSideSeamLength(plan: BagPatternPlan) {
    return Math.hypot(
    plan.finishedHeight,
    (standingTopRimWidth(plan) - plan.finishedBaseWidth) / 2,
    );
}

export function getCutPieces(plan: BagPatternPlan, bodyRecipe: BodyRecipe, closure: BagClosure, options: ClosureOptions, composition: OuterPanelComposition, handlePlan: ToteHandlePlan, structureFeel: BagStructureFeel = "woven-interfaced", pocketStyle: BagPocketStyle = "none", pullTabs = true, boxyHandleStyle: BagBoxyHandleStyle = "side-handle", boxyBoxingMethod: BagBoxyBoxingMethod = "pinch-french-seam"): CutPiece[] {
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

export function zipperNote(plan: BagPatternPlan, bodyRecipe: BodyRecipe, closure: BagClosure, options: ClosureOptions) {
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

export function closureTeaching(bodyRecipe: BodyRecipe, closure: BagClosure, options: ClosureOptions) {
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

export function boxyBagSewingSteps(plan: BagPatternPlan, structureFeel: BagStructureFeel = "woven-interfaced", pocketStyle: BagPocketStyle = "none", pullTabs = true, boxyHandleStyle: BagBoxyHandleStyle = "side-handle", boxyBoxingMethod: BagBoxyBoxingMethod = "pinch-french-seam") {
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

export function toteBagSewingSteps(plan: BagPatternPlan, closure: BagClosure, options: ClosureOptions, structureFeel: BagStructureFeel = "woven-interfaced", pocketStyle: BagPocketStyle = "none") {
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

export function buildPlanText(plan: BagPatternPlan, bodyRecipe: BodyRecipe, closure: BagClosure, options: ClosureOptions, pieces: CutPiece[], composition: OuterPanelComposition, handlePlan: ToteHandlePlan, structureFeel: BagStructureFeel = "woven-interfaced", pocketStyle: BagPocketStyle = "none", pullTabs = true, boxyHandleStyle: BagBoxyHandleStyle = "side-handle", boxyBoxingMethod: BagBoxyBoxingMethod = "pinch-french-seam") {
    const closureLabel = closureChoices.find((choice) => choice.id === closure)?.label ?? closure;
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

export function downloadPatternSvg(plan: BagPatternPlan, composition: OuterPanelComposition, closure: BagClosure, handlePlan: ToteHandlePlan) {
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

export function downloadBoxyPatternSvg(plan: BagPatternPlan) {
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

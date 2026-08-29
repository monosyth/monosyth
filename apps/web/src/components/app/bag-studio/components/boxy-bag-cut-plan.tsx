import Link from "next/link";
import { memo, startTransition, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import styles from "@/app/app/bag-studio/bag-studio.module.css";
import { BagOutcomePreview } from "@/components/app/bag-outcome-preview/bag-outcome-preview";
import { BagPanelComposer } from "@/components/app/bag-panel-composer";
import { useAuth } from "@/components/auth/auth-provider";
import { calculateBagPatternPlan, calculateBodyFabricLayout, calculateFatQuarterPieceLayout, calculateInterfacingPlan, calculatePanelStitchGeometry, calculatePocketPlan, clamp, draftFromFinishedSize, formatDecimal, formatInches, formatYards, snapMeasurement, type BagBodyRecipe, type BagClosure, type BagPatternDraft, type BagPatternPlan, type InterfacingPlan, type PocketPlan } from "@/lib/sewing/bag-pattern";
import { boxyBagFormulaText, calculateBoxyBagKit, calculateBoxyBagPlan, draftFromFinishedBoxyBag } from "@/lib/sewing/boxy-bag";
import { calculateOuterPanelComposition, defaultOuterPanelDesign, type OuterPanelComposition, type OuterPanelDesign } from "@/lib/sewing/panel-composition";
import { calculateToteHandlePlan, handlePlacementInstruction, type ToteHandleOptions, type ToteHandlePlan } from "@/lib/sewing/tote-handle";
import { BAG_STUDIO_SCHEMA_VERSION, MAX_SAVED_BAGS, createSavedBagId, decodeBagStudioShare, encodeBagStudioShare, readBagStudioState, writeBagStudioState, type BagBoxyBoxingMethod, type BagBoxyHandleStyle, type BagPocketStyle, type BagStructureFeel, type BagStudioClosureOptions, type BagStudioFabricSettings, type BagStudioSizeBasis, type BagStudioSnapshot, type BagStudioSnapStep, type BagStudioStoredState, type BagStudioTab, type BagStudioToolMode, type SavedBagDesign } from "@/lib/sewing/bag-studio-storage";
import { calculateRecessedZipperKit, recessedPanelFinishedLength } from "@/lib/sewing/recessed-zipper";
import { calculateFrenchCornerPlan } from "@/lib/sewing/corner-construction";
import { closureChoices, bodyRecipeChoices, seamPresets, cornerPresets, sizePresets, structureChoices, pocketChoices, boxyHandleChoices, boxyBoxingChoices, studioSteps, defaultDraft, defaultBoxyDraft, defaultClosureOptions, defaultFabricSettings, defaultStudioSnapshot, SizeBasis, BodyRecipe, ToolMode, SnapStep, StudioStep, DragHandle, ClosureOptions, CutPiece } from "../constants";
import { outerDesignForBody, cleanInput, savedBagCopyName, formatSavedBagTime, standingTopRimWidth, finishedSideSeamLength, getCutPieces, zipperNote, closureTeaching, boxyBagSewingSteps, toteBagSewingSteps, buildPlanText, downloadPatternSvg, downloadBoxyPatternSvg } from "../utils";
import { MeasurementField } from "./measurement-field";
import { Handle } from "./handle";
import { PatternCanvas } from "./pattern-canvas";
import { BoxyPatternCanvas } from "./boxy-pattern-canvas";
import { FatQuarterLayoutDiagram } from "./fat-quarter-layout-diagram";
import { FabricLayoutPanel } from "./fabric-layout-panel";
import { RecessedZipperCutPlan } from "./recessed-zipper-cut-plan";

export function BoxyBagCutPlan({
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

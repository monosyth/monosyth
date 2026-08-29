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

export function RecessedZipperCutPlan({
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

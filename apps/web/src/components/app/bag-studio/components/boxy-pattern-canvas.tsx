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

export function BoxyPatternCanvas({
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

    function beginDrag(handle: "left" | "right" | "top" | "bottom" | "corner", event: PointerEvent<SVGGElement>) {
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

    function nudge(handle: "left" | "right" | "top" | "bottom" | "corner", event: KeyboardEvent<SVGGElement>) {
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

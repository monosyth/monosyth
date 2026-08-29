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

export function PatternCanvas({
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

    function beginDrag(handle: DragHandle, event: PointerEvent<SVGGElement>) {
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
        const dx = ((event.clientX - active.startX) * active.screenToViewX) /
                  active.scale;
        const dy = ((event.clientY - active.startY) * active.screenToViewY) /
                  active.scale;
        const start = active.draft;
        const applySnap = (value: number) =>
                  snapStep === 0 ? value : snapMeasurement(value, snapStep);
        const mirrorFactor = mirror ? 2 : 1;
        const minWidth = start.cornerCut * 2 + start.seamAllowance * 2 + 2;
        const minHeight = start.cornerCut + start.seamAllowance + start.topTakeUp + 2;
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

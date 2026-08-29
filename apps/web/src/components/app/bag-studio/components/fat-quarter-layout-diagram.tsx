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

export function FatQuarterLayoutDiagram({
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

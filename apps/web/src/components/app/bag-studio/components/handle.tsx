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

export function Handle({
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

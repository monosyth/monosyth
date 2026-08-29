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

export function MeasurementField({
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

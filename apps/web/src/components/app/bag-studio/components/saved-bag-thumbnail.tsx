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
import { BoxyBagCutPlan } from "./boxy-bag-cut-plan";

export const SavedBagThumbnail = memo(function SavedBagThumbnail({
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

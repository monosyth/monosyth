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
import { BagOutcomePreview } from "@/components/app/bag-outcome-preview/bag-outcome-preview";
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
import { closureChoices, bodyRecipeChoices, seamPresets, cornerPresets, sizePresets, structureChoices, pocketChoices, boxyHandleChoices, boxyBoxingChoices, studioSteps, defaultDraft, defaultBoxyDraft, defaultClosureOptions, defaultFabricSettings, defaultStudioSnapshot, SizeBasis, BodyRecipe, ToolMode, SnapStep, StudioStep, DragHandle, ClosureOptions, CutPiece } from "./constants";
import { outerDesignForBody, cleanInput, savedBagCopyName, formatSavedBagTime, standingTopRimWidth, finishedSideSeamLength, getCutPieces, zipperNote, closureTeaching, boxyBagSewingSteps, toteBagSewingSteps, buildPlanText, downloadPatternSvg, downloadBoxyPatternSvg } from "./utils";
import { MeasurementField } from "./components/measurement-field";
import { Handle } from "./components/handle";
import { PatternCanvas } from "./components/pattern-canvas";
import { BoxyPatternCanvas } from "./components/boxy-pattern-canvas";
import { FatQuarterLayoutDiagram } from "./components/fat-quarter-layout-diagram";
import { FabricLayoutPanel } from "./components/fabric-layout-panel";
import { RecessedZipperCutPlan } from "./components/recessed-zipper-cut-plan";
import { BoxyBagCutPlan } from "./components/boxy-bag-cut-plan";
import { SavedBagThumbnail } from "./components/saved-bag-thumbnail";

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

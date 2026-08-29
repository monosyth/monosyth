"use client";

import {
  startTransition,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import styles from "@/components/app/bag-outcome-preview.module.css";
import {
  calculatePanelStitchGeometry,
  clamp,
  formatDecimal,
  formatInches,
  type BagBodyRecipe,
  type BagClosure,
  type BagPatternPlan,
} from "@/lib/sewing/bag-pattern";
import type { OuterPanelComposition } from "@/lib/sewing/panel-composition";
import type { HandleMaterial } from "@/lib/sewing/tote-handle";
import { ORBIT_STEP } from "./isometric-math";
import { ORBIT_STEPS } from "./isometric-math";
import { PROJECTION_PITCH } from "./isometric-math";
import { ANGLE_EPSILON } from "./isometric-math";
import { Point3 } from "./isometric-math";
import { ProjectedPoint } from "./isometric-math";
import { SurfaceBuild } from "./components/surface-build";
import { ZipperLine } from "./components/zipper-line";
import { DimensionLine } from "./components/dimension-line";
import { add } from "./isometric-math";
import { lerp } from "./isometric-math";
import { midpoint } from "./isometric-math";
import { points } from "./isometric-math";
import { pointOnQuad } from "./isometric-math";
import { shiftedSegment } from "./isometric-math";
import { normalizeYaw } from "./isometric-math";
import { quantizeYaw } from "./isometric-math";
import { circularAngleDistance } from "./isometric-math";
import { lerp3 } from "./isometric-math";
import { projectPoint3 } from "./isometric-math";
import { projectQuad } from "./isometric-math";
import { averageDepth } from "./isometric-math";
import { yawDescription } from "./isometric-math";

type PreviewView = "left" | "front" | "back" | "right";

export type BagOutcomeOptions = {
  handleMaterial: HandleMaterial;
  handleDrop: number;
  handleWidth: number;
  handleInset: number;
  handleAttachmentDepth: number;
  sideZipperLength: number;
  sideZipperSide: "left" | "right";
  zipperGap: number;
  recessDepth: number;
  recessEndGap: number;
  recessEndStyle: "boxed" | "open";
  recessNotch: number;
};

export type Point = {
  x: number;
  y: number;
};
export type SurfaceWindow = {
  top: { start: number; end: number };
  bottom: { start: number; end: number };
};

type BagOutcomePreviewProps = {
  bodyRecipe: BagBodyRecipe;
  plan: BagPatternPlan;
  closure: BagClosure;
  options: BagOutcomeOptions;
  composition: OuterPanelComposition;
  yaw: number;
  onYawChange?: (yaw: number) => void;
  variant?: "interactive" | "thumbnail";
};

export const viewChoices: ReadonlyArray<{
  id: PreviewView;
  label: string;
  detail: string;
  yaw: number;
}> = [
  { id: "front", label: "Front", detail: "straight-on front view", yaw: 0 },
  { id: "right", label: "Right", detail: "straight-on right side", yaw: 90 },
  { id: "back", label: "Back", detail: "straight-on back view", yaw: 180 },
  { id: "left", label: "Left", detail: "straight-on left side", yaw: 270 },
];
const closureLabels: Record<BagClosure, string> = {
  "open-tote": "Open tote + handles",
  "top-zipper": "Top zipper",
  "side-zipper": "Side zipper",
  "zipper-gusset": "Zipper gusset",
  "recessed-zipper": "Recessed zipper",
};

const closureNotes: Record<BagClosure, string> = {
  "open-tote": "The handle width, center inset, attachment depth, and inside drop all scale from the same finished rim marks used by the 2D panel.",
  "top-zipper": "The two full flat top seams meet at the zipper ridge, so this closure changes the top silhouette.",
  "side-zipper": "The zipper is positioned on the visible side panel; choose Left or Right to inspect it.",
  "zipper-gusset": "The highlighted top panel spans the standing rim, with two gusset strips meeting at the measured reveal.",
  "recessed-zipper": "The zipper panel sits below the rim and stops short of both side seams by the measured end gaps.",
};
type ProjectedBodySurface = {
  id: string;
  quad: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
  face: "front" | "back";
  window: SurfaceWindow;
  reverseColumns: boolean;
  side: boolean;
  depth: number;
};

export function BagOutcomePreview({
  bodyRecipe,
  plan,
  closure,
  options,
  composition,
  yaw: externalYaw,
  onYawChange,
  variant = "interactive",
}: BagOutcomePreviewProps) {
  const interactive = variant === "interactive";
  const [previewYaw, setPreviewYaw] = useState(() => quantizeYaw(externalYaw));
  const [isSpinning, setIsSpinning] = useState(false);
  const previewYawRef = useRef(previewYaw);
  const spinDragRef = useRef<{
    pointerId: number;
    startX: number;
    startYaw: number;
    lastYaw: number;
    pendingYaw: number;
    stepWidth: number;
    animationFrame: number | null;
  } | null>(null);
  const viewButtonRefs = useRef<Partial<Record<PreviewView, HTMLButtonElement | null>>>({});
  const rawId = useId().replaceAll(":", "");
  const markerId = `outcome-arrow-${rawId}`;
  const frontGradientId = `outcome-front-${rawId}`;
  const sideGradientId = `outcome-side-${rawId}`;
  const topGradientId = `outcome-top-${rawId}`;
  const weaveId = `outcome-weave-${rawId}`;
  const shadowId = `outcome-shadow-${rawId}`;

  useEffect(() => {
    const nextYaw = quantizeYaw(externalYaw);
    if (circularAngleDistance(nextYaw, previewYawRef.current) < ANGLE_EPSILON) {
      return;
    }
    previewYawRef.current = nextYaw;
    startTransition(() => setPreviewYaw(nextYaw));
  }, [externalYaw]);

  useEffect(() => {
    return () => {
      const animationFrame = spinDragRef.current?.animationFrame;
      if (animationFrame !== null && animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const chooseYaw = (nextValue: number, commit = true) => {
    const nextYaw = quantizeYaw(nextValue);
    previewYawRef.current = nextYaw;
    setPreviewYaw(nextYaw);
    if (commit) onYawChange?.(nextYaw);
  };

  const beginSpin = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    spinDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startYaw: previewYawRef.current,
      lastYaw: previewYawRef.current,
      pendingYaw: previewYawRef.current,
      stepWidth: clamp(event.currentTarget.clientWidth / ORBIT_STEPS, 8, 20),
      animationFrame: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsSpinning(true);
  };

  const continueSpin = (event: PointerEvent<HTMLDivElement>) => {
    const drag = spinDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const steps = Math.round((drag.startX - event.clientX) / drag.stepWidth);
    const nextYaw = quantizeYaw(drag.startYaw + steps * ORBIT_STEP);
    if (circularAngleDistance(nextYaw, drag.lastYaw) < ANGLE_EPSILON) return;
    drag.lastYaw = nextYaw;
    drag.pendingYaw = nextYaw;
    if (drag.animationFrame !== null) return;
    drag.animationFrame = window.requestAnimationFrame(() => {
      const active = spinDragRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      active.animationFrame = null;
      chooseYaw(active.pendingYaw, false);
    });
  };

  const finishSpin = (event: PointerEvent<HTMLDivElement>) => {
    const drag = spinDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.animationFrame !== null) {
      window.cancelAnimationFrame(drag.animationFrame);
    }
    const finalYaw = drag.pendingYaw;
    spinDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    chooseYaw(finalYaw);
    setIsSpinning(false);
  };

  const navigateViews = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % viewChoices.length;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + viewChoices.length) % viewChoices.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = viewChoices.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextChoice = viewChoices[nextIndex];
    chooseYaw(nextChoice.yaw);
    viewButtonRefs.current[nextChoice.id]?.focus();
  };

  const rotateWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = normalizeYaw(previewYawRef.current);
    let next: number | null = null;
    const fineStep = event.shiftKey ? ORBIT_STEP * 3 : ORBIT_STEP;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = normalizeYaw(current + fineStep);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = normalizeYaw(current - fineStep);
    }
    if (event.key === "PageUp") next = normalizeYaw(current + 90);
    if (event.key === "PageDown") next = normalizeYaw(current - 90);
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = 360 - ORBIT_STEP;
    if (next === null) return;
    event.preventDefault();
    chooseYaw(next);
  };

  const safeWidth = Math.max(0.5, plan.finishedBaseWidth);
  // One flat panel spans the front plus half of each side once the bag stands.
  // Subtracting the boxed depth converts that flat seam span to the visible rim.
  const boxy = bodyRecipe === "four-corner-boxy";
  const standingTopWidth = boxy
    ? Math.max(0, plan.finishedBaseWidth)
    : Math.max(0, plan.finishedTopOpening - plan.finishedDepth);
  const safeTopWidth = Math.max(0.5, standingTopWidth);
  const safeHeight = Math.max(0.5, plan.finishedHeight);
  const safeDepth = Math.max(0.25, plan.finishedDepth);
  const topCollapsesToZipper = !boxy && closure === "top-zipper";
  const bodyTopWidth = boxy
    ? safeWidth
    : topCollapsesToZipper
    ? Math.max(0.5, plan.finishedTopOpening)
    : safeTopWidth;
  const normalizedYaw = quantizeYaw(previewYaw);
  const radians = (normalizedYaw * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const frontVisible = cosine > ANGLE_EPSILON;
  const backVisible = cosine < -ANGLE_EPSILON;
  const rightVisible = sine > ANGLE_EPSILON;
  const leftVisible = sine < -ANGLE_EPSILON;
  const handleModel = closure === "open-tote"
    ? Math.max(0.5, options.handleDrop)
    : 0;
  const widestBody = Math.max(safeWidth, bodyTopWidth);
  const orbitDiagonal = Math.hypot(widestBody, safeDepth);
  const modelWidth = orbitDiagonal + 3.4;
  const modelHeight =
    safeHeight + handleModel + orbitDiagonal * PROJECTION_PITCH + 2;
  const scale = Math.min(480 / modelWidth, 290 / modelHeight, 32);
  const baseline = 352 - (orbitDiagonal / 2) * PROJECTION_PITCH * scale;
  const topCenterShift = boxy
    ? 0
    : (plan.leftTopInset - plan.rightTopInset) / 2;
  const frontTopZ = topCollapsesToZipper ? 0 : -safeDepth / 2;
  const backTopZ = topCollapsesToZipper ? 0 : safeDepth / 2;
  const frontTopLeft3: Point3 = { x: topCenterShift - bodyTopWidth / 2, y: safeHeight, z: frontTopZ };
  const frontTopRight3: Point3 = { x: topCenterShift + bodyTopWidth / 2, y: safeHeight, z: frontTopZ };
  const backTopLeft3: Point3 = { x: topCenterShift - bodyTopWidth / 2, y: safeHeight, z: backTopZ };
  const backTopRight3: Point3 = { x: topCenterShift + bodyTopWidth / 2, y: safeHeight, z: backTopZ };
  const frontBottomLeft3: Point3 = { x: -safeWidth / 2, y: 0, z: -safeDepth / 2 };
  const frontBottomRight3: Point3 = { x: safeWidth / 2, y: 0, z: -safeDepth / 2 };
  const backBottomLeft3: Point3 = { x: -safeWidth / 2, y: 0, z: safeDepth / 2 };
  const backBottomRight3: Point3 = { x: safeWidth / 2, y: 0, z: safeDepth / 2 };
  const rightMidTop3 = lerp3(frontTopRight3, backTopRight3, 0.5);
  const rightMidBottom3 = lerp3(frontBottomRight3, backBottomRight3, 0.5);
  const leftMidTop3 = lerp3(frontTopLeft3, backTopLeft3, 0.5);
  const leftMidBottom3 = lerp3(frontBottomLeft3, backBottomLeft3, 0.5);
  const project = (point: Point3) =>
    projectPoint3(point, normalizedYaw, scale, baseline);
  const verticalDimensionX = Math.max(
    38,
    Math.min(
      ...[
        frontTopLeft3,
        frontTopRight3,
        backTopLeft3,
        backTopRight3,
        frontBottomLeft3,
        frontBottomRight3,
        backBottomLeft3,
        backBottomRight3,
      ].map((point) => project(point).x),
    ) - 34,
  );
  const blankMinX = Math.min(0, plan.leftTopInset);
  const stitchGeometry = boxy ? null : calculatePanelStitchGeometry(plan);
  const toBlankX = (rawX: number) => rawX - blankMinX;
  const flatTopLeft = boxy
    ? plan.cornerCut
    : toBlankX(stitchGeometry?.topLeft.x ?? 0);
  const flatTopRight = boxy
    ? Math.max(plan.cornerCut, plan.cutWidth - plan.cornerCut)
    : toBlankX(stitchGeometry?.topRight.x ?? plan.cutWidth);
  const toteFrontWindow: SurfaceWindow = {
    top: topCollapsesToZipper
      ? { start: flatTopLeft, end: flatTopRight }
      : {
          start: toBlankX(
            (stitchGeometry?.topLeft.x ?? 0) + plan.finishedDepth / 2,
          ),
          end: toBlankX(
            (stitchGeometry?.topRight.x ?? plan.cutWidth) - plan.finishedDepth / 2,
          ),
        },
    bottom: {
      start: toBlankX(
        (stitchGeometry?.leftSideBottom.x ?? 0) + plan.finishedDepth / 2,
      ),
      end: toBlankX(
        (stitchGeometry?.rightSideBottom.x ?? plan.cutWidth) - plan.finishedDepth / 2,
      ),
    },
  };
  const boxyFrontWindow: SurfaceWindow = {
    top: { start: flatTopLeft, end: flatTopRight },
    bottom: { start: flatTopLeft, end: flatTopRight },
  };
  const frontWindow = boxy ? boxyFrontWindow : toteFrontWindow;
  const leftSideWindow: SurfaceWindow = {
    top: topCollapsesToZipper
      ? { start: flatTopLeft, end: flatTopLeft }
      : { start: flatTopLeft, end: frontWindow.top.start },
    bottom: {
      start: boxy ? 0 : toBlankX(stitchGeometry?.leftSideBottom.x ?? 0),
      end: frontWindow.bottom.start,
    },
  };
  const rightSideWindow: SurfaceWindow = {
    top: topCollapsesToZipper
      ? { start: flatTopRight, end: flatTopRight }
      : { start: frontWindow.top.end, end: flatTopRight },
    bottom: {
      start: frontWindow.bottom.end,
      end: boxy ? plan.cutWidth : toBlankX(stitchGeometry?.rightSideBottom.x ?? plan.cutWidth),
    },
  };
  const bodySurfaces: ProjectedBodySurface[] = [];
  const addSurface = (
    id: string,
    quad3: [Point3, Point3, Point3, Point3],
    face: "front" | "back",
    window: SurfaceWindow,
    reverseColumns: boolean,
    side: boolean,
  ) => {
    const quad = projectQuad(quad3, normalizedYaw, scale, baseline);
    bodySurfaces.push({
      id,
      quad,
      face,
      window,
      reverseColumns,
      side,
      depth: averageDepth(quad),
    });
  };

  if (frontVisible) {
    addSurface(
      "front",
      [frontTopLeft3, frontTopRight3, frontBottomRight3, frontBottomLeft3],
      "front",
      frontWindow,
      false,
      false,
    );
  }
  if (backVisible) {
    addSurface(
      "back",
      [backTopLeft3, backTopRight3, backBottomRight3, backBottomLeft3],
      "back",
      frontWindow,
      true,
      false,
    );
  }
  if (rightVisible) {
    addSurface(
      "right-front",
      [frontTopRight3, rightMidTop3, rightMidBottom3, frontBottomRight3],
      "front",
      rightSideWindow,
      false,
      true,
    );
    addSurface(
      "right-back",
      [rightMidTop3, backTopRight3, backBottomRight3, rightMidBottom3],
      "back",
      leftSideWindow,
      false,
      true,
    );
  }
  if (leftVisible) {
    addSurface(
      "left-front",
      [frontTopLeft3, leftMidTop3, leftMidBottom3, frontBottomLeft3],
      "front",
      leftSideWindow,
      true,
      true,
    );
    addSurface(
      "left-back",
      [leftMidTop3, backTopLeft3, backBottomLeft3, leftMidBottom3],
      "back",
      rightSideWindow,
      true,
      true,
    );
  }
  bodySurfaces.sort((left, right) => right.depth - left.depth);

  const topFace = projectQuad(
    [frontTopLeft3, frontTopRight3, backTopRight3, backTopLeft3],
    normalizedYaw,
    scale,
    baseline,
  );
  const topZipFrom = project(lerp3(frontTopLeft3, backTopLeft3, 0.5));
  const topZipTo = project(lerp3(frontTopRight3, backTopRight3, 0.5));
  const gussetGapRatio = clamp(options.zipperGap / safeDepth, 0, 0.98);
  const gussetSeamA = {
    from: project(lerp3(frontTopLeft3, backTopLeft3, 0.5 - gussetGapRatio / 2)),
    to: project(lerp3(frontTopRight3, backTopRight3, 0.5 - gussetGapRatio / 2)),
  };
  const gussetSeamB = {
    from: project(lerp3(frontTopLeft3, backTopLeft3, 0.5 + gussetGapRatio / 2)),
    to: project(lerp3(frontTopRight3, backTopRight3, 0.5 + gussetGapRatio / 2)),
  };
  const handleHeight = handleModel + Math.max(0, options.handleWidth) / 2;
  const handleInsetRatio = clamp(
    options.handleInset / Math.max(bodyTopWidth, 0.5),
    0,
    0.5,
  );
  const handleStrokeWidth = clamp(options.handleWidth * scale, 6, 26);
  const handleAttachmentHeight = clamp(
    options.handleAttachmentDepth,
    0.25,
    safeHeight,
  );
  const handleCenters = [
    frontTopLeft3.x + (frontTopRight3.x - frontTopLeft3.x) * handleInsetRatio,
    frontTopRight3.x + (frontTopLeft3.x - frontTopRight3.x) * handleInsetRatio,
  ];
  const projectedHandles = ([
    { face: "front" as const, z: frontTopZ },
    { face: "back" as const, z: backTopZ },
  ]).map((handle) => {
    const from = project({ x: handleCenters[0], y: safeHeight, z: handle.z });
    const to = project({ x: handleCenters[1], y: safeHeight, z: handle.z });
    const controlFrom = project({
      x: handleCenters[0],
      y: safeHeight + handleHeight * 4 / 3,
      z: handle.z,
    });
    const controlTo = project({
      x: handleCenters[1],
      y: safeHeight + handleHeight * 4 / 3,
      z: handle.z,
    });
    return {
      ...handle,
      from,
      to,
      controlFrom,
      controlTo,
      depth: (from.depth + to.depth) / 2,
    };
  }).sort((left, right) => right.depth - left.depth);
  const viewDetail = yawDescription(normalizedYaw);
  const modelLabel = boxy ? "Boxy zipper bag" : closureLabels[closure];
  const title = `${modelLabel} — ${viewDetail}`;
  const accessibleDimensions = boxy
    ? `${formatInches(plan.finishedBaseWidth)} long by ${formatInches(plan.finishedDepth)} wide by ${formatInches(plan.finishedHeight)} high`
    : `${formatInches(plan.finishedBaseWidth)} wide by ${formatInches(plan.finishedHeight)} high by ${formatInches(plan.finishedDepth)} deep`;
  const outerBuildLabel = `${composition.modeLabel}${composition.design.mode !== "solid" ? ` on the ${composition.scopeLabel}` : ""}${composition.design.contrastEnabled ? ` with a ${formatInches(composition.design.contrastRise)} contrast bottom` : ""}`;
  const closureNote = boxy
    ? "This is the true four-corner boxy body: a full horizontal top face, centered structural zipper, vertical end walls, and equal top and bottom box corners. Flat-panel patch placement is shown as a proportional surface concept."
    : closure === "recessed-zipper"
    ? options.recessEndStyle === "boxed"
      ? "This is a generic recessed-plane concept view. The boxed end walls and fabric bulk are not modeled, and the vertical drop is only an estimate based on the selected panel depth."
      : "The floating zipper panel sits below the rim and stops short of both side seams by the measured end gaps; the vertical drop is approximate."
    : closureNotes[closure];

  const recessedEndRatio = clamp(
    (options.recessEndStyle === "boxed"
      ? standingTopWidth * 0.035
      : options.recessEndGap) / Math.max(standingTopWidth, 0.5),
    0,
    0.5,
  );
  const recessedY = safeHeight - Math.max(0, options.recessDepth);
  const recessFrontLeft = project({
    ...lerp3(frontTopLeft3, frontTopRight3, recessedEndRatio),
    y: recessedY,
  });
  const recessFrontRight = project({
    ...lerp3(frontTopRight3, frontTopLeft3, recessedEndRatio),
    y: recessedY,
  });
  const recessBackLeft = project({
    ...lerp3(backTopLeft3, backTopRight3, recessedEndRatio),
    y: recessedY,
  });
  const recessBackRight = project({
    ...lerp3(backTopRight3, backTopLeft3, recessedEndRatio),
    y: recessedY,
  });
  const recessZipFrom = lerp(recessFrontLeft, recessBackLeft, 0.48);
  const recessZipTo = lerp(recessFrontRight, recessBackRight, 0.48);

  // Boxy Bag short end faces: horizontal midpoint seam (flattened tube seam)
  const boxyLeftMidSeamFront = project({ x: -safeWidth / 2, y: safeHeight / 2, z: -safeDepth / 2 });
  const boxyLeftMidSeamBack = project({ x: -safeWidth / 2, y: safeHeight / 2, z: safeDepth / 2 });
  const boxyLeftMidSeamCenter = project({ x: -safeWidth / 2, y: safeHeight / 2, z: 0 });

  const boxyRightMidSeamFront = project({ x: safeWidth / 2, y: safeHeight / 2, z: -safeDepth / 2 });
  const boxyRightMidSeamBack = project({ x: safeWidth / 2, y: safeHeight / 2, z: safeDepth / 2 });
  const boxyRightMidSeamCenter = project({ x: safeWidth / 2, y: safeHeight / 2, z: 0 });

  // Boxy Side Carry Handle (curves out on the left end face)
  const boxyHandleFront = project({ x: -safeWidth / 2, y: safeHeight / 2, z: -safeDepth / 2 + 0.6 });
  const boxyHandleBack = project({ x: -safeWidth / 2, y: safeHeight / 2, z: safeDepth / 2 - 0.6 });
  const boxyHandleApex = project({ x: -safeWidth / 2 - 2.8, y: safeHeight / 2, z: 0 });

  // Boxy Pull Tab (right end face)
  const boxyTabStart = project({ x: safeWidth / 2, y: safeHeight / 2, z: 0 });
  const boxyTabEnd = project({ x: safeWidth / 2 + 1.2, y: safeHeight / 2, z: 0 });

  const zipperOnLeft = options.sideZipperSide === "left";
  const sideTop3 = zipperOnLeft ? leftMidTop3 : rightMidTop3;
  const sideBottom3 = zipperOnLeft ? leftMidBottom3 : rightMidBottom3;
  const sideSeamLength = Math.hypot(
    safeHeight,
    (bodyTopWidth - safeWidth) / 2,
  );
  const sideZipRatio = clamp(
    options.sideZipperLength / Math.max(sideSeamLength, 0.5),
    0,
    1,
  );
  const sideZipStart = project(sideTop3);
  const sideZipEnd = project(lerp3(sideTop3, sideBottom3, sideZipRatio));
  const sideZipperVisible = zipperOnLeft ? leftVisible : rightVisible;
  const visibleSideMidTop = rightVisible
    ? project(rightMidTop3)
    : leftVisible
      ? project(leftMidTop3)
      : null;
  const visibleSideMidBottom = rightVisible
    ? project(rightMidBottom3)
    : leftVisible
      ? project(leftMidBottom3)
      : null;
  const visibleFlatBottom = frontVisible
    ? [project(frontBottomLeft3), project(frontBottomRight3)] as const
    : backVisible
      ? [project(backBottomLeft3), project(backBottomRight3)] as const
      : null;
  const visibleDepthBottom = rightVisible
    ? [project(frontBottomRight3), project(backBottomRight3)] as const
    : leftVisible
      ? [project(frontBottomLeft3), project(backBottomLeft3)] as const
      : null;
  const handleFaceVisible = frontVisible ? "front" : backVisible ? "back" : null;
  const visibleHandleZ = handleFaceVisible === "front" ? frontTopZ : backTopZ;
  const attachmentQuads = handleFaceVisible
    ? handleCenters.map((center, index) => {
        const halfWidth = Math.max(0.1, options.handleWidth / 2);
        const quad = projectQuad(
          [
            { x: center - halfWidth, y: safeHeight, z: visibleHandleZ },
            { x: center + halfWidth, y: safeHeight, z: visibleHandleZ },
            { x: center + halfWidth, y: safeHeight - handleAttachmentHeight, z: visibleHandleZ },
            { x: center - halfWidth, y: safeHeight - handleAttachmentHeight, z: visibleHandleZ },
          ],
          normalizedYaw,
          scale,
          baseline,
        );
        return { index, quad };
      })
    : [];
  const openTopInset = projectQuad(
    [
      lerp3(frontTopLeft3, frontTopRight3, 0.07),
      lerp3(frontTopRight3, frontTopLeft3, 0.07),
      lerp3(backTopRight3, backTopLeft3, 0.07),
      lerp3(backTopLeft3, backTopRight3, 0.07),
    ],
    normalizedYaw,
    scale,
    baseline,
  );

  return (
    <section
      className={`${styles.outcomeSection} ${interactive ? "" : styles.outcomeThumbnail}`}
      aria-labelledby={interactive ? `outcome-title-${rawId}` : undefined}
    >
      {interactive ? <header className={styles.outcomeHeader}>
        <div>
          <p>Live 3D vector</p>
          <h2 id={`outcome-title-${rawId}`}>Finished outcome preview</h2>
          <span>Shaped from the same finished dimensions. Drag through a full 360° orbit, use arrow keys, or choose an exact side.</span>
        </div>
        <div className={styles.outcomeViewButtons} role="group" aria-label="Choose a 3D preview view">
          {viewChoices.map((choice) => (
            <button
              key={choice.id}
              ref={(node) => {
                viewButtonRefs.current[choice.id] = node;
              }}
              type="button"
              aria-pressed={circularAngleDistance(normalizedYaw, choice.yaw) < ANGLE_EPSILON}
              onClick={() => chooseYaw(choice.yaw)}
              onKeyDown={(event) => navigateViews(event, viewChoices.findIndex((candidate) => candidate.id === choice.id))}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </header> : null}

      <div
        className={`${styles.outcomeStage} ${isSpinning ? styles.outcomeStageSpinning : ""}`}
      >
        <svg
          className={styles.outcomeSvg}
          viewBox="0 0 720 430"
          role="img"
          focusable="false"
          aria-label={`${title}. ${accessibleDimensions}. Outer build: ${outerBuildLabel}.${closure === "open-tote" ? ` Handles are ${formatInches(options.handleWidth)} wide, centered ${formatInches(options.handleInset)} from each finished corner, and secured ${formatInches(options.handleAttachmentDepth)} below the rim.` : ""}${closure === "side-zipper" && !sideZipperVisible ? ` The ${options.sideZipperSide} side zipper is hidden at this angle.` : ""}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <title>{title}</title>
          <desc>{interactive
            ? "A dimension-driven, 36-position orbit showing the finished bag volume, physical front, back, left, and right surfaces, selected closure, and relevant measurements."
            : "A static saved-angle preview showing the finished bag volume, selected closure, handles, and outer-panel design."}</desc>
          <defs>
            <linearGradient id={frontGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9d8cff" />
              <stop offset="0.52" stopColor="#7466ce" />
              <stop offset="1" stopColor="#4d427f" />
            </linearGradient>
            <linearGradient id={sideGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#554a91" />
              <stop offset="1" stopColor="#2e294e" />
            </linearGradient>
            <linearGradient id={topGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#beb4ff" />
              <stop offset="1" stopColor="#7669c3" />
            </linearGradient>
            <pattern id={weaveId} width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 1 H 8 M 1 0 V 8" stroke="rgba(255,255,255,.16)" strokeWidth=".7" />
              <path d="M 0 5 H 8 M 5 0 V 8" stroke="rgba(16,25,45,.12)" strokeWidth=".7" />
            </pattern>
            <filter id={shadowId} x="-35%" y="-50%" width="170%" height="200%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
            <marker id={markerId} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M 1 5 L 9 1 L 9 9 Z" fill="#4fe3e6" />
            </marker>
          </defs>

          {interactive ? <g className={styles.outcomeGrid} aria-hidden="true">
            <path d="M 68 372 H 654" />
            <path d="M 118 395 L 213 346 M 228 395 L 323 346 M 338 395 L 433 346 M 448 395 L 543 346 M 558 395 L 653 346" />
          </g> : null}
          <ellipse cx="360" cy="360" rx={Math.max(105, orbitDiagonal * scale * 0.48)} ry="24" fill="rgba(0,0,0,.34)" filter={`url(#${shadowId})`} />

          {closure === "open-tote" ? (
            <path
              d={`M ${projectedHandles[0].from.x} ${projectedHandles[0].from.y} C ${projectedHandles[0].controlFrom.x} ${projectedHandles[0].controlFrom.y} ${projectedHandles[0].controlTo.x} ${projectedHandles[0].controlTo.y} ${projectedHandles[0].to.x} ${projectedHandles[0].to.y}`}
              className={styles.outcomeHandleBack}
              style={{
                strokeWidth: handleStrokeWidth,
                stroke: options.handleMaterial === "webbing" ? "#d8d2c1" : "#786bca",
              }}
            />
          ) : null}

          {!topCollapsesToZipper ? (
            <polygon
              points={points(topFace)}
              fill={closure === "open-tote" || closure === "recessed-zipper" ? "#162536" : `url(#${topGradientId})`}
              className={styles.outcomeTopFace}
            />
          ) : null}

          {closure === "open-tote" ? (
            <polygon
              points={points(openTopInset)}
              fill="#071019"
              stroke="#f6ba4c"
              strokeWidth="1.5"
              opacity=".92"
            />
          ) : null}

          {bodySurfaces.map((surface) => (
            <g key={surface.id}>
              <polygon
                points={points(surface.quad)}
                fill={`url(#${surface.side ? sideGradientId : frontGradientId})`}
                className={styles.outcomeFace}
              />
              <polygon points={points(surface.quad)} fill={`url(#${weaveId})`} className={styles.outcomeWeave} />
              <SurfaceBuild
                quad={surface.quad}
                composition={composition}
                plan={plan}
                window={surface.window}
                reverseColumns={surface.reverseColumns}
                face={surface.face}
              />
            </g>
          ))}

          {visibleSideMidTop && visibleSideMidBottom ? (
            <line
              className={styles.outcomeSideJoin}
              x1={visibleSideMidTop.x}
              y1={visibleSideMidTop.y}
              x2={visibleSideMidBottom.x}
              y2={visibleSideMidBottom.y}
            />
          ) : null}

          {/* Highlighted Structural Seam Lines matching fabric pattern */}
          <g aria-hidden="true">
            {!topCollapsesToZipper && closure !== "top-zipper" ? (
              <>
                <line
                  className={styles.outcomeStitchLine}
                  x1={project(frontTopLeft3).x}
                  y1={project(frontTopLeft3).y}
                  x2={project(frontTopRight3).x}
                  y2={project(frontTopRight3).y}
                />
                <line
                  className={styles.outcomeStitchLine}
                  x1={project(backTopLeft3).x}
                  y1={project(backTopLeft3).y}
                  x2={project(backTopRight3).x}
                  y2={project(backTopRight3).y}
                />
              </>
            ) : null}

            {boxy ? (
              <>
                {/* 4 Vertical Corner Box Seams */}
                <line
                  className={styles.outcomeBoxedSeam}
                  x1={project(frontTopLeft3).x}
                  y1={project(frontTopLeft3).y}
                  x2={project(frontBottomLeft3).x}
                  y2={project(frontBottomLeft3).y}
                />
                <line
                  className={styles.outcomeBoxedSeam}
                  x1={project(frontTopRight3).x}
                  y1={project(frontTopRight3).y}
                  x2={project(frontBottomRight3).x}
                  y2={project(frontBottomRight3).y}
                />
                {backVisible ? (
                  <>
                    <line
                      className={styles.outcomeBoxedSeam}
                      x1={project(backTopLeft3).x}
                      y1={project(backTopLeft3).y}
                      x2={project(backBottomLeft3).x}
                      y2={project(backBottomLeft3).y}
                    />
                    <line
                      className={styles.outcomeBoxedSeam}
                      x1={project(backTopRight3).x}
                      y1={project(backTopRight3).y}
                      x2={project(backBottomRight3).x}
                      y2={project(backBottomRight3).y}
                    />
                  </>
                ) : null}
                {/* Horizontal Midpoint Seams across short end faces (tube closure seam) */}
                {leftVisible ? (
                  <line
                    className={styles.outcomeBoxedSeam}
                    x1={boxyLeftMidSeamFront.x}
                    y1={boxyLeftMidSeamFront.y}
                    x2={boxyLeftMidSeamBack.x}
                    y2={boxyLeftMidSeamBack.y}
                  />
                ) : null}
                {rightVisible ? (
                  <line
                    className={styles.outcomeBoxedSeam}
                    x1={boxyRightMidSeamFront.x}
                    y1={boxyRightMidSeamFront.y}
                    x2={boxyRightMidSeamBack.x}
                    y2={boxyRightMidSeamBack.y}
                  />
                ) : null}
              </>
            ) : (
              <>
                {/* Tote Bottom Boxed Corners */}
                {leftVisible ? (
                  <line
                    className={styles.outcomeBoxedSeam}
                    x1={project(frontBottomLeft3).x}
                    y1={project(frontBottomLeft3).y}
                    x2={project(backBottomLeft3).x}
                    y2={project(backBottomLeft3).y}
                  />
                ) : null}
                {rightVisible ? (
                  <line
                    className={styles.outcomeBoxedSeam}
                    x1={project(frontBottomRight3).x}
                    y1={project(frontBottomRight3).y}
                    x2={project(backBottomRight3).x}
                    y2={project(backBottomRight3).y}
                  />
                ) : null}
              </>
            )}
          </g>

          {closure === "zipper-gusset" ? (
            <g aria-hidden="true">
              <polygon points={points(topFace)} fill="rgba(79,227,230,.12)" stroke="#4fe3e6" strokeWidth="1.5" strokeDasharray="5 4" />
              <line x1={gussetSeamA.from.x} y1={gussetSeamA.from.y} x2={gussetSeamA.to.x} y2={gussetSeamA.to.y} stroke="rgba(79,227,230,.76)" strokeWidth="1.5" />
              <line x1={gussetSeamB.from.x} y1={gussetSeamB.from.y} x2={gussetSeamB.to.x} y2={gussetSeamB.to.y} stroke="rgba(79,227,230,.76)" strokeWidth="1.5" />
              <ZipperLine from={topZipFrom} to={topZipTo} accent="#4fe3e6" label={`${formatInches(options.zipperGap)} REVEAL`} />
            </g>
          ) : null}

          {closure === "recessed-zipper" ? (
            <g aria-hidden="true">
              <line x1={project(frontTopLeft3).x} y1={project(frontTopLeft3).y} x2={recessFrontLeft.x} y2={recessFrontLeft.y} className={styles.outcomeRecessDrop} />
              <line x1={project(frontTopRight3).x} y1={project(frontTopRight3).y} x2={recessFrontRight.x} y2={recessFrontRight.y} className={styles.outcomeRecessDrop} />
              <polygon points={points([recessFrontLeft, recessFrontRight, recessBackRight, recessBackLeft])} fill="#101a27" stroke="#4fe3e6" strokeWidth="1.4" />
              <ZipperLine from={recessZipFrom} to={recessZipTo} accent="#4fe3e6" label={`~${formatInches(options.recessDepth)} DROP`} />
            </g>
          ) : null}

          {closure === "top-zipper" ? (
            <g aria-hidden="true">
              {/* Twin parallel topstitching along the zipper */}
              {boxy ? (
                <>
                  <line
                    x1={project({ x: -safeWidth / 2 + 0.8, y: safeHeight, z: -0.6 }).x}
                    y1={project({ x: -safeWidth / 2 + 0.8, y: safeHeight, z: -0.6 }).y}
                    x2={project({ x: safeWidth / 2 - 0.8, y: safeHeight, z: -0.6 }).x}
                    y2={project({ x: safeWidth / 2 - 0.8, y: safeHeight, z: -0.6 }).y}
                    stroke="rgba(255,255,255,.35)"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={project({ x: -safeWidth / 2 + 0.8, y: safeHeight, z: 0.6 }).x}
                    y1={project({ x: -safeWidth / 2 + 0.8, y: safeHeight, z: 0.6 }).y}
                    x2={project({ x: safeWidth / 2 - 0.8, y: safeHeight, z: 0.6 }).x}
                    y2={project({ x: safeWidth / 2 - 0.8, y: safeHeight, z: 0.6 }).y}
                    stroke="rgba(255,255,255,.35)"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                </>
              ) : null}

              {/* Zipper running centered across top spine */}
              <ZipperLine
                from={topZipFrom}
                to={topZipTo}
                label={boxy
                  ? `${formatInches(plan.finishedBaseWidth)} TOP ZIP`
                  : `${formatInches(plan.finishedTopOpening)} TOP ZIP`}
              />

              {boxy ? (
                <>
                  {/* Folded Zipper End Tabs */}
                  <polygon
                    points={points([
                      project({ x: -safeWidth / 2 - 0.1, y: safeHeight, z: -0.6 }),
                      project({ x: -safeWidth / 2 + 0.8, y: safeHeight, z: -0.6 }),
                      project({ x: -safeWidth / 2 + 0.8, y: safeHeight, z: 0.6 }),
                      project({ x: -safeWidth / 2 - 0.1, y: safeHeight, z: 0.6 }),
                    ])}
                    fill="#394b63"
                    stroke="#f6ba4c"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points={points([
                      project({ x: safeWidth / 2 - 0.8, y: safeHeight, z: -0.6 }),
                      project({ x: safeWidth / 2 + 0.1, y: safeHeight, z: -0.6 }),
                      project({ x: safeWidth / 2 + 0.1, y: safeHeight, z: 0.6 }),
                      project({ x: safeWidth / 2 - 0.8, y: safeHeight, z: 0.6 }),
                    ])}
                    fill="#394b63"
                    stroke="#f6ba4c"
                    strokeWidth="1.2"
                  />

                  {/* Left Side Carry Handle Loop spanning horizontally across end seam */}
                  {leftVisible ? (
                    <g aria-label="Side carry handle">
                      <path
                        d={`M ${boxyHandleFront.x} ${boxyHandleFront.y} Q ${boxyHandleApex.x} ${boxyHandleApex.y} ${boxyHandleBack.x} ${boxyHandleBack.y}`}
                        fill="none"
                        stroke="#f6ba4c"
                        strokeWidth={Math.max(6, scale * 0.9)}
                        strokeLinecap="round"
                        opacity=".95"
                      />
                      <path
                        d={`M ${boxyHandleFront.x} ${boxyHandleFront.y} Q ${boxyHandleApex.x} ${boxyHandleApex.y} ${boxyHandleBack.x} ${boxyHandleBack.y}`}
                        fill="none"
                        stroke="#1a2b3c"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </g>
                  ) : null}

                  {/* Right End Grab Tab centered over midpoint seam */}
                  {rightVisible ? (
                    <polygon
                      points={points([
                        project({ x: safeWidth / 2, y: safeHeight / 2 - 0.4, z: -0.4 }),
                        project({ x: safeWidth / 2 + 1.2, y: safeHeight / 2 - 0.4, z: -0.4 }),
                        project({ x: safeWidth / 2 + 1.2, y: safeHeight / 2 + 0.4, z: 0.4 }),
                        project({ x: safeWidth / 2, y: safeHeight / 2 + 0.4, z: 0.4 }),
                      ])}
                      fill="#f6ba4c"
                      stroke="#101a27"
                      strokeWidth="1.5"
                    />
                  ) : null}
                </>
              ) : null}
            </g>
          ) : null}

          {closure === "recessed-zipper" ? (
            <path d={`M ${project(frontTopLeft3).x} ${project(frontTopLeft3).y} L ${project(frontTopRight3).x} ${project(frontTopRight3).y}`} className={styles.outcomeRecessLip} aria-hidden="true" />
          ) : null}

          {closure === "open-tote" ? (
            <g aria-hidden="true">
              {attachmentQuads.map((attachment) => (
                <g key={attachment.index}>
                  <polygon
                    points={points(attachment.quad)}
                    fill={options.handleMaterial === "webbing" ? "rgba(239,233,215,.72)" : "rgba(41,33,77,.55)"}
                    stroke={options.handleMaterial === "webbing" ? "#fffaf0" : "#d4ceff"}
                    strokeWidth="1"
                  />
                  <line
                    x1={pointOnQuad(attachment.quad, 0.18, 0.4).x}
                    y1={pointOnQuad(attachment.quad, 0.18, 0.4).y}
                    x2={pointOnQuad(attachment.quad, 0.82, 0.78).x}
                    y2={pointOnQuad(attachment.quad, 0.82, 0.78).y}
                    stroke="#f6ba4c"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={pointOnQuad(attachment.quad, 0.82, 0.4).x}
                    y1={pointOnQuad(attachment.quad, 0.82, 0.4).y}
                    x2={pointOnQuad(attachment.quad, 0.18, 0.78).x}
                    y2={pointOnQuad(attachment.quad, 0.18, 0.78).y}
                    stroke="#f6ba4c"
                    strokeWidth="1.2"
                  />
                </g>
              ))}
              <path
                d={`M ${projectedHandles[1].from.x} ${projectedHandles[1].from.y} C ${projectedHandles[1].controlFrom.x} ${projectedHandles[1].controlFrom.y} ${projectedHandles[1].controlTo.x} ${projectedHandles[1].controlTo.y} ${projectedHandles[1].to.x} ${projectedHandles[1].to.y}`}
                className={styles.outcomeHandle}
                style={{
                  strokeWidth: handleStrokeWidth,
                  stroke: options.handleMaterial === "webbing" ? "#f1ecdd" : "#9f91f2",
                }}
              />
            </g>
          ) : null}

          {closure === "side-zipper" && sideZipperVisible ? (
            <ZipperLine from={sideZipStart} to={sideZipEnd} accent="#ff7194" label={`${formatInches(options.sideZipperLength)} SIDE ZIP`} />
          ) : null}

          {interactive && !isSpinning ? (
            <>
              {visibleFlatBottom && Math.abs(cosine) > 0.34 ? (
                <DimensionLine
                  from={add(visibleFlatBottom[0], { x: 0, y: 26 })}
                  to={add(visibleFlatBottom[1], { x: 0, y: 26 })}
                  label={`${formatInches(plan.finishedBaseWidth)} ${boxy ? "L" : "W"}`}
                  markerId={markerId}
                />
              ) : null}
              <DimensionLine
                from={{ x: verticalDimensionX, y: baseline - safeHeight * scale }}
                to={{ x: verticalDimensionX, y: baseline }}
                label={`${formatInches(plan.finishedHeight)} H`}
                markerId={markerId}
                textOffset={{ x: -15, y: 4 }}
              />
              {visibleDepthBottom && Math.abs(sine) > 0.34 ? (
                <DimensionLine
                  from={add(visibleDepthBottom[0], { x: 0, y: 18 })}
                  to={add(visibleDepthBottom[1], { x: 0, y: 18 })}
                  label={`${formatInches(plan.finishedDepth)} ${boxy ? "W" : "D"}`}
                  markerId={markerId}
                />
              ) : null}
            </>
          ) : null}
        </svg>

        {interactive && boxy ? (
          <div className={styles.outcomeFinishedBadge} aria-hidden="true">
            <span>Finished box</span>
            <strong>{formatInches(plan.finishedBaseWidth)} L × {formatInches(plan.finishedDepth)} W × {formatInches(plan.finishedHeight)} H</strong>
          </div>
        ) : null}

        {interactive ? <div
          className={styles.outcomeInteraction}
          role="slider"
          tabIndex={0}
          aria-label="Rotate finished bag preview"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={360 - ORBIT_STEP}
          aria-valuenow={normalizedYaw}
          aria-valuetext={`${viewDetail}, ${normalizedYaw} degrees around the bag`}
          aria-describedby={`outcome-spin-help-${rawId}`}
          onPointerDown={beginSpin}
          onPointerMove={continueSpin}
          onPointerUp={finishSpin}
          onPointerCancel={finishSpin}
          onLostPointerCapture={finishSpin}
          onKeyDown={rotateWithKeyboard}
        /> : null}

        {interactive ? <div className={styles.outcomeBadge} aria-hidden="true">
          <i /> live vector · {normalizedYaw}°
        </div> : null}
        {interactive ? <div className={styles.outcomeSpinHint} id={`outcome-spin-help-${rawId}`}>
          <i aria-hidden="true">↔</i> drag 360° · arrows adjust {ORBIT_STEP}°
        </div> : null}
      </div>

      {interactive ? <><div className={styles.outcomeReadout}>
        <div>
          <span>Finished shape</span>
          <strong>{boxy
            ? `${formatInches(plan.finishedBaseWidth)} L × ${formatInches(plan.finishedDepth)} W × ${formatInches(plan.finishedHeight)} H`
            : `${formatInches(plan.finishedBaseWidth)} W × ${formatInches(plan.finishedHeight)} H × ${formatInches(plan.finishedDepth)} D`}</strong>
        </div>
        <div>
          <span>{boxy ? "Raw zipper seam / finished zipper line" : topCollapsesToZipper ? "Closed ridge / open-rim estimate" : "Approx. rim / flat top seam"}</span>
          <strong>
            {boxy
              ? `${formatInches(plan.finishedFlatWidth)} / ${formatInches(plan.finishedBaseWidth)}`
              : topCollapsesToZipper
              ? `${formatInches(plan.finishedTopOpening)} / ${formatInches(standingTopWidth)}`
              : `${formatInches(standingTopWidth)} / ${formatInches(plan.finishedTopOpening)}`}
          </strong>
        </div>
        <div>
          <span>{boxy ? "Linked corners / raw square" : closure === "open-tote" ? "Handle width / inset / depth" : "Side angles"}</span>
          <strong>{boxy
            ? `4 per panel / ${formatInches(plan.cornerCut)}`
            : closure === "open-tote"
            ? `${formatInches(options.handleWidth)} / ${formatInches(options.handleInset)} / ${formatInches(options.handleAttachmentDepth)}`
            : `${formatDecimal(plan.leftTopAngle, 1)}° / ${formatDecimal(plan.rightTopAngle, 1)}°`}</strong>
        </div>
        <div className={styles.outcomeClosureReadout}>
          <span>{boxy ? "Body + outer build" : "Closure + outer build"}</span>
          <strong>{modelLabel} · {composition.modeLabel}{composition.design.contrastEnabled ? " + contrast" : ""}</strong>
        </div>
      </div>
      <p className={styles.outcomeNote}><strong>{closureNote}</strong> The surface preview follows the selected {outerBuildLabel.toLowerCase()}. This is a proportional concept view based on stitch-line dimensions; fabric drape, foam, and turn-of-cloth can change the sewn silhouette.</p></> : null}
    </section>
  );
}

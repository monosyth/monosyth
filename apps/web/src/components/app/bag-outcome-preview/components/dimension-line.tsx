import { startTransition, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "@/components/app/bag-outcome-preview.module.css";
import { calculatePanelStitchGeometry, clamp, formatDecimal, formatInches, type BagBodyRecipe, type BagClosure, type BagPatternPlan } from "@/lib/sewing/bag-pattern";
import type { OuterPanelComposition } from "@/lib/sewing/panel-composition";
import type { HandleMaterial } from "@/lib/sewing/tote-handle";
import { ORBIT_STEP } from "../isometric-math";
import { ORBIT_STEPS } from "../isometric-math";
import { PROJECTION_PITCH } from "../isometric-math";
import { ANGLE_EPSILON } from "../isometric-math";
import { Point3, Point, midpoint, points, pointOnQuad, shiftedSegment, projectPoint3, projectQuad, add } from "../isometric-math";
import { ProjectedPoint } from "../isometric-math";
import { SurfaceBuild } from "./surface-build";
import { ZipperLine } from "./zipper-line";

export function DimensionLine({
      from,
      to,
      label,
      markerId,
      textOffset = { x: 0, y: -8 },
    }: {
          from: Point;
          to: Point;
          label: string;
          markerId: string;
          textOffset?: Point;
        }) {
    const center = midpoint(from, to);
    return (
    <g className={styles.outcomeDimension} aria-hidden="true">
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`} />
      <text x={center.x + textOffset.x} y={center.y + textOffset.y}>{label}</text>
    </g>
    );
}

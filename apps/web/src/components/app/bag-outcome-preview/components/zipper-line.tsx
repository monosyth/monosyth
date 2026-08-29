import { lerp, calculateDistance } from "../isometric-math";
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

export function ZipperLine({
      from,
      to,
      accent = "#f6ba4c",
      label,
      showPull = true,
    }: {
          from: Point;
          to: Point;
          accent?: string;
          label?: string;
          showPull?: boolean;
        }) {
    const tapeA = shiftedSegment(from, to, -4.5);
    const tapeB = shiftedSegment(from, to, 4.5);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const normal = { x: (-dy / length) * 3.4, y: (dx / length) * 3.4 };
    const numTicks = Math.max(3, Math.round(length / 8));
    const ticks = Array.from({ length: numTicks }, (_, index) => {
            const center = lerp(from, to, (index + 0.5) / numTicks);
            return {
              from: { x: center.x - normal.x, y: center.y - normal.y },
              to: { x: center.x + normal.x, y: center.y + normal.y },
            };
          });
    const pull = lerp(from, to, 0.68);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return (
    <g aria-hidden="true">
      <line x1={tapeA.from.x} y1={tapeA.from.y} x2={tapeA.to.x} y2={tapeA.to.y} stroke="rgba(255,255,255,.42)" strokeWidth="3" strokeLinecap="round" />
      <line x1={tapeB.from.x} y1={tapeB.from.y} x2={tapeB.to.x} y2={tapeB.to.y} stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinecap="round" />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={accent} strokeWidth="2" strokeLinecap="round" />
      {ticks.map((tick, index) => (
        <line key={index} x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} stroke="#172638" strokeWidth="1.4" />
      ))}
      {showPull ? (
        <g transform={`translate(${pull.x} ${pull.y}) rotate(${angle})`}>
          <circle r="5" fill="#172638" stroke={accent} strokeWidth="1.6" />
          <path d="M 3 -1 L 12 -1 Q 15 -1 15 2 Q 15 5 12 5 L 8 5" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : null}
      {label ? (
        <text x={midpoint(from, to).x} y={midpoint(from, to).y - 12} className={styles.outcomeSvgLabel}>{label}</text>
      ) : null}
    </g>
    );
}

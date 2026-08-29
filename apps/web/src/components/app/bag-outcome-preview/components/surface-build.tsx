import { startTransition, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "@/components/app/bag-outcome-preview.module.css";
import { calculatePanelStitchGeometry, clamp, formatDecimal, formatInches, type BagBodyRecipe, type BagClosure, type BagPatternPlan } from "@/lib/sewing/bag-pattern";
import type { OuterPanelComposition } from "@/lib/sewing/panel-composition";
import type { HandleMaterial } from "@/lib/sewing/tote-handle";
import { ORBIT_STEP } from "../isometric-math";
import { ORBIT_STEPS } from "../isometric-math";
import { PROJECTION_PITCH } from "../isometric-math";
import { ANGLE_EPSILON } from "../isometric-math";
import { Point3, Point, SurfaceWindow, midpoint, points, pointOnQuad, shiftedSegment, projectPoint3, projectQuad, add } from "../isometric-math";
import { ProjectedPoint } from "../isometric-math";

export function SurfaceBuild({
      quad,
      composition,
      plan,
      window,
      reverseColumns = false,
      face,
    }: {
          quad: [Point, Point, Point, Point];
          composition: OuterPanelComposition;
          plan: BagPatternPlan;
          window: SurfaceWindow;
          reverseColumns?: boolean;
          face: "front" | "back";
        }) {
    const pieced = composition.design.mode !== "solid" &&
            (composition.design.scope === "both" ||
              composition.design.scope === face);
    const contrastRatio = composition.design.contrastEnabled
            ? clamp(
                1 -
                  composition.design.contrastRise /
                    Math.max(plan.finishedHeight, composition.design.contrastRise),
                0,
                1,
              )
            : 1;
    const colors = ["#b8abff", "#ff9ab3", "#68e5e6", "#f6c563", "#c8e982"];
    const rawColumnBoundaries = composition.design.mode === "vertical-strips" ||
            composition.design.mode === "block-grid"
              ? [0, ...composition.columnSeams, composition.targetWidth]
              : [0, composition.targetWidth];
    const piecedRawBottom = plan.topTakeUp + plan.finishedHeight * contrastRatio;
    const rawRowBoundaries = composition.design.mode === "horizontal-strips" ||
            composition.design.mode === "block-grid"
              ? [
                  0,
                  ...composition.rowSeams.filter(
                    (seam) => seam < piecedRawBottom - 0.001,
                  ),
                  piecedRawBottom,
                ]
              : [0, piecedRawBottom];
    const horizontalWindowMin = Math.min(
            window.top.start,
            window.top.end,
            window.bottom.start,
            window.bottom.end,
          );
    const horizontalWindowMax = Math.max(
            window.top.start,
            window.top.end,
            window.bottom.start,
            window.bottom.end,
          );
    const visibleColumnSegments = rawColumnBoundaries
            .slice(0, -1)
            .map((left, index) => ({
              left,
              right: rawColumnBoundaries[index + 1],
              globalIndex: index,
            }))
            .filter(
              (segment) =>
                segment.right > horizontalWindowMin + 0.001 &&
                segment.left < horizontalWindowMax - 0.001,
            );
    const visibleRowSegments = rawRowBoundaries
            .slice(0, -1)
            .map((top, index) => ({
              top,
              bottom: rawRowBoundaries[index + 1],
              globalIndex: index,
            }))
            .filter(
              (segment) =>
                segment.bottom > plan.topTakeUp + 0.001 &&
                segment.top < piecedRawBottom - 0.001,
            )
            .map((segment) => ({
              ...segment,
              topRatio: clamp(
                (Math.max(segment.top, plan.topTakeUp) - plan.topTakeUp) /
                  Math.max(0.001, plan.finishedHeight),
                0,
                contrastRatio,
              ),
              bottomRatio: clamp(
                (Math.min(segment.bottom, piecedRawBottom) - plan.topTakeUp) /
                  Math.max(0.001, plan.finishedHeight),
                0,
                contrastRatio,
              ),
            }));
    const cellPolygons: Array<{ key: string; corners: Point[]; color: string }> = [];
    const projectRawX = (rawX: number, down: number) => {
            const windowStart =
              window.top.start +
              (window.bottom.start - window.top.start) * down;
            const windowEnd =
              window.top.end +
              (window.bottom.end - window.top.end) * down;
            const rawWidth = windowEnd - windowStart;
            const safeWidth = Math.abs(rawWidth) < 0.001
              ? rawWidth < 0
                ? -0.001
                : 0.001
              : rawWidth;
            const ratio = clamp((rawX - windowStart) / safeWidth, 0, 1);
            return reverseColumns ? 1 - ratio : ratio;
          };
    if (pieced) {
    for (const row of visibleRowSegments) {
      for (const column of visibleColumnSegments) {
        cellPolygons.push({
          key: `cell-${row.globalIndex}-${column.globalIndex}`,
          corners: [
            pointOnQuad(
              quad,
              projectRawX(column.left, row.topRatio),
              row.topRatio,
            ),
            pointOnQuad(
              quad,
              projectRawX(column.right, row.topRatio),
              row.topRatio,
            ),
            pointOnQuad(
              quad,
              projectRawX(column.right, row.bottomRatio),
              row.bottomRatio,
            ),
            pointOnQuad(
              quad,
              projectRawX(column.left, row.bottomRatio),
              row.bottomRatio,
            ),
          ],
          color:
            colors[
              (row.globalIndex * 2 + column.globalIndex) % colors.length
            ],
        });
      }
    }
    }

    return (
    <g className={styles.outcomeSurfaceBuild} aria-hidden="true">
      {cellPolygons.map((cell) => (
        <polygon key={cell.key} points={points(cell.corners)} fill={cell.color} />
      ))}
      {pieced ? (
        <g aria-hidden="true">
          {visibleRowSegments.slice(1).map((row) => (
            <line
              key={`row-seam-${row.globalIndex}`}
              className={styles.outcomePiecingSeam}
              x1={pointOnQuad(quad, 0, row.topRatio).x}
              y1={pointOnQuad(quad, 0, row.topRatio).y}
              x2={pointOnQuad(quad, 1, row.topRatio).x}
              y2={pointOnQuad(quad, 1, row.topRatio).y}
            />
          ))}
          {visibleColumnSegments.slice(1).map((col) => (
            <line
              key={`col-seam-${col.globalIndex}`}
              className={styles.outcomePiecingSeam}
              x1={pointOnQuad(quad, projectRawX(col.left, 0), 0).x}
              y1={pointOnQuad(quad, projectRawX(col.left, 0), 0).y}
              x2={pointOnQuad(quad, projectRawX(col.left, 1), 1).x}
              y2={pointOnQuad(quad, projectRawX(col.left, 1), 1).y}
            />
          ))}
        </g>
      ) : null}
      {composition.design.contrastEnabled ? (
        <>
          <polygon
            className={styles.outcomeContrastFace}
            points={points([
              pointOnQuad(quad, 0, contrastRatio),
              pointOnQuad(quad, 1, contrastRatio),
              pointOnQuad(quad, 1, 1),
              pointOnQuad(quad, 0, 1),
            ])}
          />
          <line
            className={styles.outcomeContrastJoin}
            x1={pointOnQuad(quad, 0, contrastRatio).x}
            y1={pointOnQuad(quad, 0, contrastRatio).y}
            x2={pointOnQuad(quad, 1, contrastRatio).x}
            y2={pointOnQuad(quad, 1, contrastRatio).y}
          />
        </>
      ) : null}
    </g>
    );
}

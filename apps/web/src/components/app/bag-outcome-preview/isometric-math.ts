import { startTransition, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "@/components/app/bag-outcome-preview.module.css";
import { calculatePanelStitchGeometry, clamp, formatDecimal, formatInches, type BagBodyRecipe, type BagClosure, type BagPatternPlan } from "@/lib/sewing/bag-pattern";
import type { OuterPanelComposition } from "@/lib/sewing/panel-composition";
import type { HandleMaterial } from "@/lib/sewing/tote-handle";

export const ORBIT_STEP = 10;
export const ORBIT_STEPS = 360 / ORBIT_STEP;
export const PROJECTION_PITCH = 0.3;
export const ANGLE_EPSILON = 0.0001;

export type Point3 = Point & {
      z: number;
    };
export type ProjectedPoint = Point & {
      depth: number;
    };
export type Point = { x: number; y: number; };

export function add(point: Point, vector: Point): Point {
    return { x: point.x + vector.x, y: point.y + vector.y };
}

export function lerp(from: Point, to: Point, amount: number): Point {
    return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    };
}

export function midpoint(from: Point, to: Point): Point {
    return lerp(from, to, 0.5);
}

export function points(pointsToJoin: Point[]) {
    return pointsToJoin.map((point) => `${point.x},${point.y}`).join(" ");
}

export function pointOnQuad(quad: [Point, Point, Point, Point], across: number, down: number) {
    const left = lerp(quad[0], quad[3], down);
    const right = lerp(quad[1], quad[2], down);
    return lerp(left, right, across);
}

export function shiftedSegment(from: Point, to: Point, distance: number) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const shift = { x: (-dy / length) * distance, y: (dx / length) * distance };
    return { from: add(from, shift), to: add(to, shift) };
}

export function normalizeYaw(value: number) {
    const finite = Number.isFinite(value) ? value : 0;
    return ((finite % 360) + 360) % 360;
}

export function quantizeYaw(value: number) {
    return normalizeYaw(Math.round(normalizeYaw(value) / ORBIT_STEP) * ORBIT_STEP);
}

export function circularAngleDistance(left: number, right: number) {
    return Math.abs(((normalizeYaw(left) - normalizeYaw(right) + 540) % 360) - 180);
}

export function lerp3(from: Point3, to: Point3, amount: number): Point3 {
    return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    z: from.z + (to.z - from.z) * amount,
    };
}

export function projectPoint3(point: Point3, yaw: number, scale: number, baseline: number): ProjectedPoint {
    const radians = (yaw * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const rotatedX = point.x * cosine + point.z * sine;
    const depth = -point.x * sine + point.z * cosine;
    return {
    x: 360 + rotatedX * scale,
    y: baseline - point.y * scale - depth * PROJECTION_PITCH * scale,
    depth,
    };
}

export function projectQuad(quad: [Point3, Point3, Point3, Point3], yaw: number, scale: number, baseline: number): [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint] {
    return quad.map((point) =>
    projectPoint3(point, yaw, scale, baseline)
    ) as [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
}

export function averageDepth(pointsToAverage: ProjectedPoint[]) {
    return pointsToAverage.reduce((total, point) => total + point.depth, 0) /
    Math.max(1, pointsToAverage.length);
}

export function yawDescription(value: number) {
    const yaw = quantizeYaw(value);
    const exact = viewChoices.find(
            (choice) => circularAngleDistance(choice.yaw, yaw) < ANGLE_EPSILON,
          );
    if (exact) return exact.detail;
    if (yaw < 90) return `front-right orbit view, ${yaw}° from front`;
    if (yaw < 180) return `back-right orbit view, ${180 - yaw}° from back`;
    if (yaw < 270) return `back-left orbit view, ${yaw - 180}° from back`;
    return `front-left orbit view, ${360 - yaw}° from front`;
}
export type SurfaceWindow = { top: { start: number; end: number }; bottom: { start: number; end: number }; };

export function calculateDistance(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export const viewChoices: ReadonlyArray<{
  id: string;
  yaw: number;
  label: string;
  detail: string;
}> = [
  { id: "front", yaw: 0, label: "Front", detail: "front view" },
  { id: "front-right", yaw: 45, label: "Front Right", detail: "front-right orbit view" },
  { id: "right", yaw: 90, label: "Right", detail: "right side view" },
  { id: "back-right", yaw: 135, label: "Back Right", detail: "back-right orbit view" },
  { id: "back", yaw: 180, label: "Back", detail: "back view" },
  { id: "back-left", yaw: 225, label: "Back Left", detail: "back-left orbit view" },
  { id: "left", yaw: 270, label: "Left", detail: "left side view" },
  { id: "front-left", yaw: 315, label: "Front Left", detail: "front-left orbit view" },
];

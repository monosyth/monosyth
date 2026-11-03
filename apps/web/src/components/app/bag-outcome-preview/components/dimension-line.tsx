import styles from "@/components/app/bag-outcome-preview.module.css";
import { Point, midpoint } from "../isometric-math";

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

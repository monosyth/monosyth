import { type KeyboardEvent, type PointerEvent } from "react";
import styles from "@/app/app/bag-studio/bag-studio.module.css";

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

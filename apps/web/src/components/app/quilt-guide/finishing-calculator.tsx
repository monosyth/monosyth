"use client";

import { useMemo, useState } from "react";

import { backingPlans, bindingPlan, formatInches, formatYards } from "@/lib/quilting/math";

import { BackingDiagram } from "./diagrams";
import styles from "./quilt-guide.module.css";

export function FinishingCalculator() {
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(72);
  const [usableWof, setUsableWof] = useState(40);
  const [margin, setMargin] = useState(4);
  const [bindingWidth, setBindingWidth] = useState(2.5);
  const backing = useMemo(() => backingPlans({ quiltWidth: width, quiltHeight: height, usableWidth: usableWof, marginEachSide: margin }), [width, height, usableWof, margin]);
  const binding = useMemo(() => bindingPlan({ quiltWidth: width, quiltHeight: height, usableWidth: usableWof, stripWidth: bindingWidth }), [width, height, usableWof, bindingWidth]);
  const alternate = backing.recommended.orientation === "vertical" ? backing.horizontal : backing.vertical;

  return (
    <section className={styles.calculatorCard} aria-labelledby="finishing-calc-title">
      <div className={styles.calculatorHead}>
        <div><p className={styles.eyebrow}>Quilt sandwich + edge</p><h2 id="finishing-calc-title">Backing & binding calculator</h2></div>
        <span className={styles.calculatorBadge}>Compare both grain directions</span>
      </div>
      <div className={styles.inputGridFive}>
        <FinishInput label="Top width" value={width} onChange={setWidth} />
        <FinishInput label="Top height" value={height} onChange={setHeight} />
        <FinishInput label="Usable WOF" value={usableWof} onChange={setUsableWof} min={12} max={120} />
        <FinishInput label="Margin / side" value={margin} onChange={setMargin} min={0} max={20} />
        <FinishInput label="Binding cut width" value={bindingWidth} onChange={setBindingWidth} step={0.25} min={0.5} max={6} />
      </div>
      <div className={styles.finishingResults} aria-live="polite">
        <article className={styles.backingResult}>
          <div>
            <span className={styles.finishLabel}>BACKING TARGET</span>
            <h3>{formatInches(backing.requiredWidth)} × {formatInches(backing.requiredHeight)}</h3>
            <p>Includes {formatInches(margin)} beyond every quilt-top edge.</p>
          </div>
          <BackingDiagram panels={backing.recommended.panels} orientation={backing.recommended.orientation} />
          <div className={styles.backingOptions}>
            <div className={styles.recommendedOption}><span>RECOMMENDED</span><strong>{backing.recommended.panels} {backing.recommended.orientation} panels</strong><b>{formatYards(backing.recommended.yardage)}</b><small>cut {backing.recommended.panels} lengths at {formatInches(backing.recommended.panelLength)}</small></div>
            <div><span>ALTERNATE</span><strong>{alternate.panels} {alternate.orientation} panels</strong><b>{formatYards(alternate.yardage)}</b><small>cut {alternate.panels} lengths at {formatInches(alternate.panelLength)}</small></div>
          </div>
        </article>
        <article className={styles.bindingResult}>
          <span className={styles.cutLabel}>BINDING · CUT</span>
          <strong>{binding.strips} strips × {formatInches(binding.stripWidth)} WOF</strong>
          <h3>{formatYards(binding.yardage)}</h3>
          <p>Plan for {formatInches(binding.totalLength)}: quilt perimeter plus a 20″ corner-and-tail buffer. These strips yield about {formatInches(binding.joinedYield)} after diagonal joins.</p>
          <div className={styles.bindingCoil} aria-hidden="true"><i /><i /><i /><i /></div>
          <small>The count starts from your editable usable WOF and subtracts one strip width at every diagonal join. Buy the next safe shop increment if the result is close.</small>
        </article>
      </div>
      <div className={styles.warningBand}><strong>Before buying:</strong> directional prints, matching repeats, shrinkage, wide-back widths, and your longarmer’s own margin can change the answer. Remove selvages before piecing backing with ½″ seams.</div>
    </section>
  );
}

function FinishInput({ label, value, onChange, step = 1, min = 0.5, max = 300 }: { label: string; value: number; onChange: (value: number) => void; step?: number; min?: number; max?: number }) {
  return <label className={styles.fieldLabel}><span>{label}</span><div className={styles.inputWithUnit}><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} /><b>in</b></div></label>;
}

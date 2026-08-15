"use client";

import { useMemo, useState } from "react";

import { formatInches } from "@/lib/quilting/math";

import styles from "./quilt-guide.module.css";

const WIDTH_PRESETS = [1.5, 2.25, 2.5, 3, 5, 6.5] as const;

export function RulerSlotPlanner() {
  const [pieceWidth, setPieceWidth] = useState(2.5);
  const [quantity, setQuantity] = useState(16);
  const [slotSpan, setSlotSpan] = useState(20);

  const plan = useMemo(() => {
    const width = Math.max(0.25, pieceWidth);
    const span = Math.max(1, slotSpan);
    const requested = Math.max(1, Math.ceil(quantity));
    const piecesPerSetup = Math.floor(span / width);
    const valid = piecesPerSetup > 0;
    const firstSetupPieces = valid ? Math.min(requested, piecesPerSetup) : 0;
    const slots = Array.from(
      { length: firstSetupPieces + 1 },
      (_, index) => index * width,
    );
    const setups = valid ? Math.ceil(requested / piecesPerSetup) : 0;
    const lastSetupPieces = valid
      ? requested - piecesPerSetup * Math.max(0, setups - 1)
      : 0;

    return {
      firstSetupPieces,
      lastSetupPieces,
      piecesPerSetup,
      requested,
      setups,
      slots,
      valid,
      width,
    };
  }, [pieceWidth, quantity, slotSpan]);

  return (
    <section className={styles.calculatorCard} aria-labelledby="slot-planner-title">
      <div className={styles.calculatorHead}>
        <div>
          <p className={styles.eyebrow}>Original slot ticket</p>
          <h2 id="slot-planner-title">Which slots do I cut?</h2>
        </div>
        <span className={styles.calculatorBadge}>Quarter-inch inputs welcome</span>
      </div>

      <div className={styles.segmentedControl} aria-label="Common piece widths">
        {WIDTH_PRESETS.map((width) => (
          <button
            type="button"
            key={width}
            aria-pressed={pieceWidth === width}
            className={pieceWidth === width ? styles.segmentedActive : ""}
            onClick={() => setPieceWidth(width)}
          >
            {formatInches(width)}
          </button>
        ))}
      </div>

      <div className={styles.inputGridThree}>
        <label className={styles.fieldLabel}>
          <span>Piece or strip width</span>
          <div className={styles.inputWithUnit}>
            <input type="number" min="0.25" max="20" step="0.25" value={pieceWidth} onChange={(event) => setPieceWidth(Math.min(20, Math.max(0.25, Number(event.target.value) || 0.25)))} />
            <b>in</b>
          </div>
        </label>
        <label className={styles.fieldLabel}>
          <span>Pieces needed</span>
          <input type="number" min="1" max="1000" step="1" value={quantity} onChange={(event) => setQuantity(Math.min(1000, Math.max(1, Math.round(Number(event.target.value) || 1))))} />
        </label>
        <label className={styles.fieldLabel}>
          <span>Last numbered slot available</span>
          <div className={styles.inputWithUnit}>
            <input type="number" min="1" max="30" step="0.25" value={slotSpan} onChange={(event) => setSlotSpan(Math.min(30, Math.max(1, Number(event.target.value) || 1)))} />
            <b>in</b>
          </div>
        </label>
      </div>

      <div className={styles.resultStrip} aria-live="polite">
        <div><span>First setup yields</span><strong>{plan.valid ? plan.firstSetupPieces : "—"}</strong></div>
        <div><span>Total setups</span><strong>{plan.valid ? plan.setups : "—"}</strong></div>
        <div><span>Last setup yields</span><strong>{plan.valid ? plan.lastSetupPieces : "—"}</strong></div>
      </div>

      {plan.valid ? (
        <div className={styles.solutionGrid}>
          <article>
            <span className={styles.cutLabel}>FIRST SETUP · CUT</span>
            <h3>Square at 0, then cut every {formatInches(plan.width)}</h3>
            <div className={styles.slotCode} aria-label={`Cut slots ${plan.slots.map((slot) => formatInches(slot)).join(", ")}`}>
              {plan.slots.map((slot, index) => (
                <span key={slot} style={{ display: "contents" }}>
                  <b>{formatInches(slot)}</b>
                  {index < plan.slots.length - 1 ? <i aria-hidden="true" /> : null}
                </span>
              ))}
            </div>
            <p>Put the slightly uneven raw edge just left of the 0 slot. The 0 cut establishes the reference edge; the later slots create equal widths.</p>
          </article>
          <article>
            <span className={styles.trimLabel}>RESET AFTER</span>
            <h3>{plan.piecesPerSetup} {plan.piecesPerSetup === 1 ? "piece" : "pieces"} per full setup</h3>
            <p>When the next slot would exceed your ruler’s usable span, move the remaining fabric, put the last clean cut just left of 0, and repeat. The final setup needs {plan.lastSetupPieces} {plan.lastSetupPieces === 1 ? "piece" : "pieces"}.</p>
          </article>
        </div>
      ) : (
        <div className={styles.warningBand} role="alert"><strong>That width will not fit.</strong> Enter the actual numbered span available on your ruler, or cut this piece with a standard long ruler.</div>
      )}

      <p className={styles.calculatorFootnote}>The 20″ default is a conservative first ticket for your Stripology XL; change it when a specific cut uses more or less of the ruler. This plans equal straight cuts from a squared edge. The ruler’s own quarter-inch chart, blade instructions, and your comfortable layer count still control the physical cut.</p>
    </section>
  );
}

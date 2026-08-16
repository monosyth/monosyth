"use client";

import { useMemo, useState } from "react";

import { formatInches } from "@/lib/quilting/math";
import { getRulerProfile, RULER_PROFILES, rulerCutPlan, type RulerProfile } from "@/lib/quilting/rulers";

import styles from "./quilt-guide.module.css";

const WIDTH_PRESETS = [1.5, 2.25, 2.5, 3, 5, 6.5] as const;

export function RulerSlotPlanner() {
  const [rulerId, setRulerId] = useState<RulerProfile["id"]>("stripology-mini");
  const [pieceWidth, setPieceWidth] = useState(2.5);
  const [quantity, setQuantity] = useState(16);
  const [customSpan, setCustomSpan] = useState(12);
  const [customSlotInterval, setCustomSlotInterval] = useState(0.5);

  const ruler = getRulerProfile(rulerId);
  const span = rulerId === "custom-slotted" ? customSpan : ruler.planningSpan;
  const slotInterval = rulerId === "custom-slotted" ? customSlotInterval : ruler.slotInterval;

  const plan = useMemo(
    () => rulerCutPlan({ ruler, pieceWidth, quantity, planningSpan: span, slotInterval }),
    [pieceWidth, quantity, ruler, slotInterval, span],
  );

  return (
    <section className={styles.calculatorCard} aria-labelledby="slot-planner-title">
      <div className={styles.calculatorHead}>
        <div>
          <p className={styles.eyebrow}>Ruler-aware cutting ticket</p>
          <h2 id="slot-planner-title">Which marks or slots do I use?</h2>
        </div>
        <span className={styles.calculatorBadge}>Your Mini is the default</span>
      </div>

      <div className={styles.rulerChooser}>
        <label className={styles.fieldLabel}>
          <span>Ruler in your hand</span>
          <select value={rulerId} onChange={(event) => setRulerId(event.target.value as RulerProfile["id"])}>
            {RULER_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.owned ? "OWNED · " : ""}{profile.name} · {profile.model}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.rulerProfileReadout} aria-live="polite">
          <span>{ruler.owned ? "IN YOUR RULER KIT" : "REFERENCE PROFILE"}</span>
          <strong>{ruler.name}</strong>
          <p>{ruler.detail}</p>
          <small>
            {ruler.kind === "slotted"
              ? `Ticket uses a conservative ${formatInches(span)} numbered span${slotInterval ? ` and ${formatInches(slotInterval)} slot spacing` : ""}.`
              : "This is an edge-guided ruler, so every cut requires a new measurement."}
          </small>
        </div>
      </div>

      {rulerId === "custom-slotted" ? (
        <div className={styles.inputGridTwo}>
          <label className={styles.fieldLabel}>
            <span>Usable numbered span</span>
            <div className={styles.inputWithUnit}>
              <input type="number" min="0.25" max="30" step="0.25" value={customSpan} onChange={(event) => setCustomSpan(Math.min(30, Math.max(0.25, Number(event.target.value) || 0.25)))} />
              <b>in</b>
            </div>
          </label>
          <label className={styles.fieldLabel}>
            <span>Distance between slots</span>
            <div className={styles.inputWithUnit}>
              <input type="number" min="0.125" max="1" step="0.125" value={customSlotInterval} onChange={(event) => setCustomSlotInterval(Math.min(1, Math.max(0.125, Number(event.target.value) || 0.125)))} />
              <b>in</b>
            </div>
          </label>
        </div>
      ) : null}

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

      <div className={styles.inputGridTwo}>
        <label className={styles.fieldLabel}>
          <span>Piece or strip width</span>
          <div className={styles.inputWithUnit}>
            <input type="number" min="0.125" max="24" step="0.125" value={pieceWidth} onChange={(event) => setPieceWidth(Math.min(24, Math.max(0.125, Number(event.target.value) || 0.125)))} />
            <b>in</b>
          </div>
        </label>
        <label className={styles.fieldLabel}>
          <span>Pieces needed</span>
          <input type="number" min="1" max="1000" step="1" value={quantity} onChange={(event) => setQuantity(Math.min(1000, Math.max(1, Math.round(Number(event.target.value) || 1))))} />
        </label>
      </div>

      <div className={styles.resultStrip} aria-live="polite">
        <div><span>{plan.directSlots ? "First setup yields" : "Pieces per move"}</span><strong>{plan.valid ? plan.firstSetupPieces : "—"}</strong></div>
        <div><span>{plan.directSlots ? "Total setups" : "Measure + cut moves"}</span><strong>{plan.valid ? plan.setups : "—"}</strong></div>
        <div><span>Usable ruler span</span><strong>{formatInches(span)}</strong></div>
      </div>

      {plan.valid && plan.directSlots ? (
        <div className={styles.solutionGrid}>
          <article>
            <span className={styles.cutLabel}>DIRECT SLOT BATCH · CUT</span>
            <h3>Square at 0, then cut every {formatInches(plan.width)}</h3>
            <div className={styles.slotCode} aria-label={`Cut slots ${plan.slots.map((slot) => formatInches(slot)).join(", ")}`}>
              {plan.slots.map((slot, index) => (
                <span key={slot} style={{ display: "contents" }}>
                  <b>{formatInches(slot)}</b>
                  {index < plan.slots.length - 1 ? <i aria-hidden="true" /> : null}
                </span>
              ))}
            </div>
            <p>Put the slightly uneven raw edge just left of the 0 slot. Cut at 0 to establish the reference edge, then use the listed slots without moving the ruler.</p>
          </article>
          <article>
            <span className={styles.trimLabel}>RESET AFTER</span>
            <h3>{plan.piecesPerSetup} {plan.piecesPerSetup === 1 ? "piece" : "pieces"} per full setup</h3>
            <p>Lift the ruler, move the remaining fabric, put the last clean cut just left of 0, and repeat. The final setup needs {plan.lastSetupPieces} {plan.lastSetupPieces === 1 ? "piece" : "pieces"}.</p>
          </article>
        </div>
      ) : null}

      {plan.valid && plan.supportedOffset ? (
        <div className={styles.solutionGrid}>
          <article>
            <span className={styles.cutLabel}>OFFSET CUT · ONE AT A TIME</span>
            <h3>Set the offset guide, then cut {formatInches(plan.width)}</h3>
            <div className={styles.slotCode}><b>ALIGN</b><i /><b>{formatInches(plan.width)}</b><i /><b>RESET</b></div>
            <p>This width is not a whole multiple of the ruler’s {formatInches(slotInterval ?? 0.5)} slot spacing. Use the printed quarter/eighth offset method for one piece, then reset the clean edge for the next piece.</p>
          </article>
          <article>
            <span className={styles.trimLabel}>WHY NOT A SLOT SEQUENCE?</span>
            <h3>Do not mark 0, {formatInches(plan.width)}, {formatInches(plan.width * 2)}…</h3>
            <p>Those marks do not all land on physical slots in the same ruler orientation. The offset guides make the width accurately, but they do not turn it into a multi-slot batch.</p>
          </article>
        </div>
      ) : null}

      {plan.valid && plan.standard ? (
        <div className={styles.solutionGrid}>
          <article>
            <span className={styles.cutLabel}>STANDARD RULER · MEASURE</span>
            <h3>Measure {formatInches(plan.width)} from the clean edge</h3>
            <div className={styles.slotCode}><b>SQUARE</b><i /><b>MEASURE {formatInches(plan.width)}</b><i /><b>CUT</b></div>
            <p>Keep one horizontal line parallel to the fabric fold or strip edge. Cut once, move the ruler, and measure again from the new clean edge.</p>
          </article>
          <article>
            <span className={styles.trimLabel}>REPEAT</span>
            <h3>{plan.requested} measured cuts</h3>
            <p>This ruler has no cutting slots. It is slower for a repeated batch, but it is the right tool when the fabric or required reach does not fit your Mini.</p>
          </article>
        </div>
      ) : null}

      {!plan.valid ? (
        <div className={styles.warningBand} role="alert">
          <strong>{plan.fits ? "That spacing is not available in one setup." : "That width is beyond this ruler’s working span."}</strong>
          {plan.fits
            ? " Choose a ruler with the needed slot interval, follow that ruler’s documented offset method, or make the cut with a standard ruler."
            : ` Choose a larger ruler or make the ${formatInches(plan.width)} cut with a long straight ruler.`}
        </div>
      ) : null}

      <p className={styles.calculatorFootnote}>The selected profile changes the ticket; it does not pretend the rulers are interchangeable. Manufacturer dimensions and markings set the starting profile. Your ruler instructions, rotary-cutter instructions, fabric thickness, and comfortable layer count control the physical cut.</p>
    </section>
  );
}

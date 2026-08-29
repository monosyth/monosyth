import Link from "next/link";
import { memo, startTransition, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import styles from "@/app/app/bag-studio/bag-studio.module.css";
import { BagOutcomePreview } from "@/components/app/bag-outcome-preview/bag-outcome-preview";
import { BagPanelComposer } from "@/components/app/bag-panel-composer";
import { useAuth } from "@/components/auth/auth-provider";
import { calculateBagPatternPlan, calculateBodyFabricLayout, calculateFatQuarterPieceLayout, calculateInterfacingPlan, calculatePanelStitchGeometry, calculatePocketPlan, clamp, draftFromFinishedSize, formatDecimal, formatInches, formatYards, snapMeasurement, type BagBodyRecipe, type BagClosure, type BagPatternDraft, type BagPatternPlan, type InterfacingPlan, type PocketPlan } from "@/lib/sewing/bag-pattern";
import { boxyBagFormulaText, calculateBoxyBagKit, calculateBoxyBagPlan, draftFromFinishedBoxyBag } from "@/lib/sewing/boxy-bag";
import { calculateOuterPanelComposition, defaultOuterPanelDesign, type OuterPanelComposition, type OuterPanelDesign } from "@/lib/sewing/panel-composition";
import { calculateToteHandlePlan, handlePlacementInstruction, type ToteHandleOptions, type ToteHandlePlan } from "@/lib/sewing/tote-handle";
import { BAG_STUDIO_SCHEMA_VERSION, MAX_SAVED_BAGS, createSavedBagId, decodeBagStudioShare, encodeBagStudioShare, readBagStudioState, writeBagStudioState, type BagBoxyBoxingMethod, type BagBoxyHandleStyle, type BagPocketStyle, type BagStructureFeel, type BagStudioClosureOptions, type BagStudioFabricSettings, type BagStudioSizeBasis, type BagStudioSnapshot, type BagStudioSnapStep, type BagStudioStoredState, type BagStudioTab, type BagStudioToolMode, type SavedBagDesign } from "@/lib/sewing/bag-studio-storage";
import { calculateRecessedZipperKit, recessedPanelFinishedLength } from "@/lib/sewing/recessed-zipper";
import { calculateFrenchCornerPlan } from "@/lib/sewing/corner-construction";
import { closureChoices, bodyRecipeChoices, seamPresets, cornerPresets, sizePresets, structureChoices, pocketChoices, boxyHandleChoices, boxyBoxingChoices, studioSteps, defaultDraft, defaultBoxyDraft, defaultClosureOptions, defaultFabricSettings, defaultStudioSnapshot, SizeBasis, BodyRecipe, ToolMode, SnapStep, StudioStep, DragHandle, ClosureOptions, CutPiece } from "../constants";
import { outerDesignForBody, cleanInput, savedBagCopyName, formatSavedBagTime, standingTopRimWidth, finishedSideSeamLength, getCutPieces, zipperNote, closureTeaching, boxyBagSewingSteps, toteBagSewingSteps, buildPlanText, downloadPatternSvg, downloadBoxyPatternSvg } from "../utils";
import { MeasurementField } from "./measurement-field";
import { Handle } from "./handle";
import { PatternCanvas } from "./pattern-canvas";
import { BoxyPatternCanvas } from "./boxy-pattern-canvas";
import { FatQuarterLayoutDiagram } from "./fat-quarter-layout-diagram";

export function FabricLayoutPanel({
      plan,
      composition,
      settings,
      onSettingsChange,
    }: {
          plan: BagPatternPlan;
          composition: OuterPanelComposition;
          settings: BagStudioFabricSettings;
          onSettingsChange: (settings: BagStudioFabricSettings) => void;
        }) {
    const {
            source,
            fatQuarterWidth,
            fatQuarterLength,
            allowFatQuarterRotation,
          } = settings;
    const layout = calculateBodyFabricLayout(plan);
    const customOuter = composition.design.mode !== "solid" ||
            composition.design.contrastEnabled;
    const fatQuarterPieceSpecs: Array<{
        material: "outer" | "contrast" | "lining";
        name: string;
        quantity: number;
        width: number;
        height: number;
        }> = [
            ...composition.cutPieces.map((piece) => ({
              material: piece.material,
              name: piece.name,
              quantity: piece.quantity,
              width: piece.width,
              height: piece.height,
            })),
            {
              material: "lining",
              name: "Lining body panel",
              quantity: 2,
              width: plan.boundingCutWidth,
              height: plan.cutHeight,
            },
          ];
    const fatQuarterRows = fatQuarterPieceSpecs.map((piece) => {
            const fit = calculateFatQuarterPieceLayout({
              usableWidth: fatQuarterWidth,
              usableLength: fatQuarterLength,
              pieceWidth: piece.width,
              pieceHeight: piece.height,
              quantity: piece.quantity,
              allowRotation: allowFatQuarterRotation,
            });
            const fitWithRotation = calculateFatQuarterPieceLayout({
              usableWidth: fatQuarterWidth,
              usableLength: fatQuarterLength,
              pieceWidth: piece.width,
              pieceHeight: piece.height,
              quantity: piece.quantity,
              allowRotation: true,
            });
            return {
              ...piece,
              fit,
              fitsOnlyRotated:
                !fit.fits &&
                !allowFatQuarterRotation &&
                fitWithRotation.fits &&
                fitWithRotation.rotated,
            };
          });
    const roleLabels = {
            outer: customOuter ? "Outer fabric groups" : "Outer fabric",
            contrast: "Contrast fabric",
            lining: "Lining fabric",
          } as const;
    const fatQuarterRoles = (["outer", "contrast", "lining"] as const)
            .map((material) => {
              const rows = fatQuarterRows.filter((row) => row.material === material);
              const fits = rows.every((row) => row.fit.fits);
              return {
                material,
                label: roleLabels[material],
                rows,
                fits,
                count: fits
                  ? rows.reduce((total, row) => total + row.fit.fatQuartersNeeded, 0)
                  : 0,
              };
            })
            .filter((role) => role.rows.length > 0);
    const allFatQuarterPiecesFit = fatQuarterRows.every((row) => row.fit.fits);
    const fatQuarterTotal = fatQuarterRoles.reduce(
            (total, role) => total + role.count,
            0,
          );
    const conservativeFatQuarterEstimate = fatQuarterRoles.some(
            (role) => role.rows.length > 1,
          );
    const fatQuarterRoleSummary = fatQuarterRoles
            .map((role) => `${role.rows.length > 1 ? "up to " : ""}${role.count} ${role.material === "outer" ? "outer" : role.material}`)
            .join(" + ");
    const tightFatQuarterRows = fatQuarterRows.filter(
            (row) => {
              if (!row.fit.fits || row.fit.quantity === 0) return false;
              const placedWidth = row.fit.rotated ? row.fit.pieceHeight : row.fit.pieceWidth;
              const placedHeight = row.fit.rotated ? row.fit.pieceWidth : row.fit.pieceHeight;
              const firstSheetCount = Math.min(
                row.fit.quantity,
                row.fit.piecesPerFatQuarter,
              );
              const usedColumns = Math.min(row.fit.piecesAcross, firstSheetCount);
              const usedRows = Math.ceil(firstSheetCount / row.fit.piecesAcross);
              const actualWidthClearance = row.fit.usableWidth - usedColumns * placedWidth;
              const actualLengthClearance = row.fit.usableLength - usedRows * placedHeight;
              return Math.min(actualWidthClearance, actualLengthClearance) < 0.25;
            },
          );
    const rotatedFatQuarterRows = fatQuarterRows.filter(
            (row) => row.fit.rotated,
          );
    const pieceStyle = {
            "--piece-ratio": `${Math.max(0.5, Math.min(2.2, plan.boundingCutWidth / plan.cutHeight))}`,
            "--piece-width": `${Math.min(96, Math.max(24, (plan.boundingCutWidth / Math.max(layout.usableWidth, 1)) * 100))}%`,
          } as CSSProperties;
    return (
    <section className={styles.fabricSection} aria-labelledby="fabric-layout-title">
      <header className={styles.sectionHeader}>
        <div>
          <p>03 / Fabric map</p>
          <h2 id="fabric-layout-title">
            {source === "bolt" ? "Start at the bolt" : "Start with fat quarters"}
          </h2>
        </div>
        <div className={styles.yardageReadout}>
          <span>
            {source === "bolt"
              ? customOuter ? "Lining panels" : "Body fabric"
              : "Separate fabric totals"}
          </span>
          <strong>
            {source === "bolt"
              ? layout.fits ? formatYards(layout.buyYards) : "too narrow"
              : allFatQuarterPiecesFit
                ? `${conservativeFatQuarterEstimate ? "up to " : ""}${fatQuarterTotal} FQ${fatQuarterTotal === 1 ? "" : "s"}${conservativeFatQuarterEstimate ? " conservative" : " total"}`
                : "check fit"}
          </strong>
          {source === "fat-quarters" ? (
            <small>{allFatQuarterPiecesFit ? fatQuarterRoleSummary : "Follow the fit cards below"}</small>
          ) : null}
        </div>
      </header>

      <div className={styles.fabricSourceControls}>
        <div className={styles.fabricSourceToggle} role="group" aria-label="Fabric purchasing format">
          <button
            type="button"
            aria-pressed={source === "bolt"}
            onClick={() => onSettingsChange({ ...settings, source: "bolt" })}
          >
            <strong>Bolt yardage</strong>
            <small>continuous width of fabric</small>
          </button>
          <button
            type="button"
            aria-pressed={source === "fat-quarters"}
            onClick={() =>
              onSettingsChange({ ...settings, source: "fat-quarters" })
            }
          >
            <strong>Fat quarters</strong>
            <small>finite precut rectangles</small>
          </button>
        </div>

        {source === "fat-quarters" ? (
          <div className={styles.fatQuarterSettings}>
            <MeasurementField
              label="Usable width"
              hint="across the fat quarter"
              value={fatQuarterWidth}
              min={1}
              onChange={(value) =>
                onSettingsChange({
                  ...settings,
                  fatQuarterWidth: Math.max(1, value),
                })
              }
            />
            <MeasurementField
              label="Usable length"
              hint="along the lengthwise grain"
              value={fatQuarterLength}
              min={1}
              onChange={(value) =>
                onSettingsChange({
                  ...settings,
                  fatQuarterLength: Math.max(1, value),
                })
              }
            />
            <div className={styles.fatQuarterOrientation} role="group" aria-label="Fat-quarter piece orientation">
              <button
                type="button"
                aria-pressed={!allowFatQuarterRotation}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    allowFatQuarterRotation: false,
                  })
                }
              >
                Keep grain upright
              </button>
              <button
                type="button"
                aria-pressed={allowFatQuarterRotation}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    allowFatQuarterRotation: true,
                  })
                }
              >
                Rotation allowed
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {source === "bolt" ? (
        layout.fits ? (
          <div className={styles.fabricGrid}>
            {customOuter ? (
              <article className={styles.fabricRoll}>
                <div className={styles.fabricRollHead}>
                  <strong>Outer build recipe</strong>
                  <span>Cut by fabric group · quantities include selected faces</span>
                </div>
                <div className={styles.fabricRecipeRows}>
                  {composition.cutPieces.map((piece) => (
                    <div key={`${piece.material}-${piece.name}`}>
                      <span className={styles[`material_${piece.material}`]}>{piece.quantity}×</span>
                      <strong>{piece.name}</strong>
                      <b>{formatInches(piece.width)} × {formatInches(piece.height)}</b>
                    </div>
                  ))}
                </div>
                <footer>
                  <span>Assemble before shaping</span>
                  <strong>Trim to {formatInches(composition.targetWidth)} × {formatInches(composition.targetHeight)}</strong>
                </footer>
              </article>
            ) : (
              <article className={styles.fabricRoll}>
                <div className={styles.fabricRollHead}>
                  <strong>Outer fabric</strong>
                  <span>{formatInches(plan.fabricWidth)} bolt · {formatInches(layout.usableWidth)} usable</span>
                </div>
                <div className={`${styles.fabricBed} ${layout.piecesAcross === 2 ? styles.fabricAcross : styles.fabricStacked}`}>
                  <span className={styles.selvageLeft}>selvage</span>
                  <span className={styles.selvageRight}>selvage</span>
                  {[1, 2].map((piece) => (
                    <div className={styles.fabricPiece} style={pieceStyle} key={piece}>
                      <span>Panel {piece}</span>
                      <small>{formatInches(plan.boundingCutWidth)} × {formatInches(plan.cutHeight)}</small>
                      <i>grain ↑</i>
                    </div>
                  ))}
                  <span className={styles.offcutNote}>Closure pieces can usually nest in the offcuts; handles may require more length.</span>
                </div>
                <footer>
                  <span>{layout.piecesAcross === 2 ? "2 panels across" : "1 panel across · 2 rows"}</span>
                  <strong>{formatInches(layout.lengthInches)} minimum length</strong>
                </footer>
              </article>
            )}

            <article className={styles.fabricRoll}>
              <div className={styles.fabricRollHead}>
                <strong>Lining fabric</strong>
                <span>{formatInches(plan.fabricWidth)} bolt · {formatInches(layout.usableWidth)} usable</span>
              </div>
              <div className={`${styles.fabricBed} ${layout.piecesAcross === 2 ? styles.fabricAcross : styles.fabricStacked}`}>
                <span className={styles.selvageLeft}>selvage</span>
                <span className={styles.selvageRight}>selvage</span>
                {[1, 2].map((piece) => (
                  <div className={styles.fabricPiece} style={pieceStyle} key={piece}>
                    <span>Panel {piece}</span>
                    <small>{formatInches(plan.boundingCutWidth)} × {formatInches(plan.cutHeight)}</small>
                    <i>grain ↑</i>
                  </div>
                ))}
                <span className={styles.offcutNote}>Keep both lining panels on the same grain direction.</span>
              </div>
              <footer>
                <span>{layout.piecesAcross === 2 ? "2 panels across" : "1 panel across · 2 rows"}</span>
                <strong>{formatInches(layout.lengthInches)} minimum length</strong>
              </footer>
            </article>
          </div>
        ) : (
          <div className={styles.fabricWarning}>
            <strong>This panel is wider than the usable fabric.</strong>
            <p>Choose wider fabric, piece the panel, or rotate only if the print, nap, and grain allow it.</p>
          </div>
        )
      ) : (
        <>
          <div className={styles.fatQuarterIntro}>
            <span>Standard: 18″ × 22″ nominal · starts at about 18″ × 21″ usable</span>
            <strong>{formatInches(fatQuarterWidth)} wide × {formatInches(fatQuarterLength)} long usable</strong>
            <small>Measure after removing selvage, squaring, or prewashing. Grain is assumed to run along the usable length.</small>
          </div>
          <div className={styles.fatQuarterGrid}>
            {fatQuarterRoles.map((role) => (
              <article className={styles.fatQuarterCard} key={role.material}>
                <div className={styles.fabricRollHead}>
                  <strong>{role.label}</strong>
                  <span>{role.fits ? `${role.rows.length > 1 ? "up to " : ""}${role.count} FQ${role.count === 1 ? "" : "s"}` : "check fit"}</span>
                </div>
                <div className={styles.fatQuarterRows}>
                  {role.rows.map((row) => (
                    <section className={styles.fatQuarterPiecePlan} key={`${row.material}-${row.name}`}>
                      <div className={styles.fatQuarterPieceSummary}>
                        <span className={styles[`material_${row.material}`]}>{row.quantity}×</span>
                        <div>
                          <strong>{row.name}</strong>
                          <small>{formatInches(row.width)} × {formatInches(row.height)} each</small>
                        </div>
                        <b>
                          {row.fit.fits
                            ? `${row.fit.piecesPerFatQuarter}/FQ · ${row.fit.fatQuartersNeeded} needed`
                            : "no single FQ fits"}
                        </b>
                        <em>
                          {row.fit.rotated
                            ? "turned 90° as one uniform grid"
                            : row.fitsOnlyRotated
                              ? "fits only if rotation is allowed"
                              : row.fit.fits
                                ? `${row.fit.piecesAcross} across × ${row.fit.rows} row${row.fit.rows === 1 ? "" : "s"}`
                                : "use yardage or piece this section"}
                        </em>
                      </div>
                      <FatQuarterLayoutDiagram name={row.name} fit={row.fit} />
                    </section>
                  ))}
                </div>
                <footer>
                  <span>{formatInches(fatQuarterWidth)} × {formatInches(fatQuarterLength)} usable</span>
                  <strong>{role.rows.length > 1 ? "Conservative counts · offcuts not shared" : "Uniform-piece fit"}</strong>
                </footer>
              </article>
            ))}
          </div>

          {!allFatQuarterPiecesFit ? (
            <div className={styles.fabricWarning}>
              <strong>Some pieces do not fit one fat quarter.</strong>
              {fatQuarterRows.filter((row) => !row.fit.fits).map((row) => (
                <p key={`${row.material}-${row.name}`}>
                  {row.name}: {row.fitsOnlyRotated
                    ? "it fits only when turned 90°. Allow rotation only when sideways grain or motif placement is intentional."
                    : `the ${formatInches(row.width)} × ${formatInches(row.height)} cut needs yardage, a larger precut, or piecing.`}
                </p>
              ))}
            </div>
          ) : null}

          {rotatedFatQuarterRows.length || tightFatQuarterRows.length ? (
            <div className={styles.fabricAdvisory}>
              {rotatedFatQuarterRows.length ? <p><strong>Rotated pieces:</strong> check grain, nap, and directional motifs before cutting.</p> : null}
              {tightFatQuarterRows.length ? <p><strong>Tight fit:</strong> less than ¼″ remains in one direction, so measure the actual fat quarter before relying on the count.</p> : null}
            </div>
          ) : null}
        </>
      )}

      <p className={styles.fabricFinePrint}>
        {source === "bolt"
          ? customOuter
            ? "The yardage readout covers the two full lining panels. Outer piecing can use scraps, precuts, or several fabrics, so use the exact cut groups above rather than one misleading bolt total. "
            : "Conservative body-panel estimate, rounded up to the next ⅛ yard. "
          : `${customOuter ? "Bolt lining option" : "Bolt option for outer and lining separately"}: ${layout.fits ? formatYards(layout.buyYards) : "the current bolt is too narrow"}${customOuter ? "" : " each"}. Fat-quarter counts cover body pieces only; long handles and closure parts may require yardage or webbing. ${customOuter ? "Multiple outer cut groups are estimated separately without recombining their offcuts. " : ""}`}
        Directional prints, repeats, straps, matching, and shrinkage can require more.
      </p>
    </section>
    );
}

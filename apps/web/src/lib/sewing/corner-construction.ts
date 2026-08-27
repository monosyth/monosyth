import { formatInches } from "./bag-pattern";

export type BagCornerMethod = "precut-square" | "pinch-french";

export type FrenchCornerPlan = {
  targetSpan: number;
  targetHeight: number;
  bodySeamAllowance: number;
  enclosingPassAllowance: number;
  firstPassSpan: number;
  firstPassHeight: number;
  trimAllowance: number;
  valid: boolean;
  warnings: string[];
  guidance: string[];
};

/**
 * Calculates compensated stitch lines for a pinched, French-finished boxed corner.
 *
 * In a boxed corner, the finished box depth is targetSpan = 2 * cornerCut, with
 * triangle height targetHeight = cornerCut.
 *
 * If Pass 1 is sewn directly on the target line and Pass 2 is sewn inside it,
 * the enclosing second pass makes the bag deeper and robs height/length.
 *
 * To ensure the enclosing Pass 2 lands PRECISELY on the target line:
 * - Pass 1 is placed closer to the apex:
 *     firstPassHeight = targetHeight - enclosingPassAllowance
 *     firstPassSpan   = targetSpan - 2 * enclosingPassAllowance
 * - The raw point is trimmed 1/8″ outside Pass 1.
 * - Pass 2 is sewn from the inside with enclosingPassAllowance, landing
 *   exactly at targetHeight / targetSpan.
 */
export function calculateFrenchCornerPlan(
  targetSpan: number,
  bodySeamAllowance: number,
): FrenchCornerPlan {
  const safeTarget = Number.isFinite(targetSpan) ? Math.max(0, targetSpan) : 0;
  const safeAllowance = Number.isFinite(bodySeamAllowance)
    ? Math.max(0, bodySeamAllowance)
    : 0.25;

  const targetHeight = safeTarget / 2;
  const enclosingPassAllowance = safeAllowance;
  const trimAllowance = 0.125; // 1/8″ close trim

  const firstPassHeight = Math.max(0, targetHeight - enclosingPassAllowance);
  const firstPassSpan = Math.max(0, safeTarget - 2 * enclosingPassAllowance);

  const warnings: string[] = [];
  if (safeAllowance < 0.25) {
    warnings.push(
      "A French-seam corner needs at least a 1/4″ seam allowance to enclose raw edges cleanly.",
    );
  }
  if (firstPassSpan <= 0.5) {
    warnings.push(
      "This corner is too shallow for two enclosing French passes. Use the pre-cut square method or increase corner depth.",
    );
  }

  const guidance = [
    `Pass 1 (Right-side out): Mark and stitch at ${formatInches(firstPassSpan)} span (${formatInches(firstPassHeight)} from apex).`,
    `Trim: Cut triangle tip ${formatInches(trimAllowance)} outside the Pass 1 stitch line (do not cut threads).`,
    `Pass 2 (Inside out): Stitch at ${formatInches(enclosingPassAllowance)} from folded edge. This lands exactly at the ${formatInches(safeTarget)} target line.`,
  ];

  return {
    targetSpan: safeTarget,
    targetHeight,
    bodySeamAllowance: safeAllowance,
    enclosingPassAllowance,
    firstPassSpan,
    firstPassHeight,
    trimAllowance,
    valid: warnings.length === 0,
    warnings,
    guidance,
  };
}

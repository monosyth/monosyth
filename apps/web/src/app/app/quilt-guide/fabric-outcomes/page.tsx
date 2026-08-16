import Link from "next/link";

import { FabricOutcomeCalculator, SquareSubcutCalculator, StripSetOutcomeCalculator } from "@/components/app/quilt-guide/fabric-outcome-calculator";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";
import { fabricOutcomePlan, formatInches } from "@/lib/quilting/math";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Fabric Outcomes" };

const STARTING_SQUARES = [
  [10, "10″ layer square"],
  [5, "5″ charm"],
  [2.5, "2½″ mini charm"],
] as const;

function result(size: number, method: "hst-two" | "hst-four" | "hst-eight" | "qst") {
  const plan = fabricOutcomePlan({ startSize: size, startCount: 2, method, easyIncrement: 0.5 });
  if (plan.practicalFinished < 1) return "Not recommended";
  return `${plan.yieldPerBatch} at ${formatInches(plan.practicalFinished)} finished · trim ${formatInches(plan.trimTo)}`;
}

export default function FabricOutcomesPage() {
  return (
    <>
      <PageIntro
        chapter="01A"
        eyebrow="Fabric-first calculator"
        title="Start with the pieces you have"
        intro="Enter the cut size and quantity already on your table. The calculator works forward through unit yield, trim size, one-block dimensions, and the finished patchwork center—without requiring a target quilt size first."
      >
        <div className={styles.pageIntroFormula}>
          <span>CHARM EXAMPLE · 8 AT A TIME</span>
          <strong>2 × 5″ → 8 HSTs</strong>
          <small>trim 2″ · each finishes at 1½″</small>
        </div>
      </PageIntro>

      <section className={styles.contentSection}>
        <FabricOutcomeCalculator />
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading
          eyebrow="Common starting squares"
          title="Reliable outcomes at a glance"
          description="These are intentionally easy, trim-friendly results rounded down to a ½-inch finished measurement. The geometric maximum is larger, but it leaves less room for sewing and squaring variation."
        />
        <div className={styles.quickTableWrap}>
          <table className={styles.quickTable}>
            <thead><tr><th>START WITH</th><th>WHOLE PATCH</th><th>2 HSTs</th><th>4 HSTs</th><th>8 HSTs</th><th>2 QSTs</th></tr></thead>
            <tbody>
              {STARTING_SQUARES.map(([size, label]) => (
                <tr key={size}>
                  <th>{label}</th>
                  <td>{formatInches(size - 0.5)} finished</td>
                  <td>{result(size, "hst-two")}</td>
                  <td>{result(size, "hst-four")}</td>
                  <td>{result(size, "hst-eight")}</td>
                  <td>{result(size, "qst")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note title="Why the layout controls matter" tone="gold">
          A yield such as “eight HSTs” is not a block size. Eight 1½″-finished HSTs can form a 3″ × 6″ rectangle in a 2 × 4 layout, or they can surround one plain 1½″ cell to form a 4½″ square 3 × 3 block. The calculator keeps unit layout and final block layout separate so it never guesses silently.
        </Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Subcut squares" title="Cut a layer square or charm into smaller patches" description="This is cutting yield only. The result also shows what each smaller square contributes after its outside seams." />
        <SquareSubcutCalculator />
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Jelly-roll and custom strips" title="Sew a strip set and see the result" description="Enter the measured strip width, usable straightened length, and number of strips. The calculator shows the strip-set width and repeated square rail-unit yield." />
        <StripSetOutcomeCalculator />
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Related instructions" title="Continue from the calculated result" />
        <p className={styles.auditFooterLink}>
          Use the <Link href="/app/quilt-guide/triangle-school">triangle-unit instructions</Link> for marking, sewing, cutting, pressing, and trimming. Use the <Link href="/app/quilt-guide/precut-library">precut reference</Link> for pack sizes and mixing different cuts.
        </p>
      </section>
    </>
  );
}

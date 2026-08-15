import { FinishingCalculator } from "@/components/app/quilt-guide/finishing-calculator";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Borders, Backing & Binding" };

export default function FinishingPage() {
  return (
    <>
      <PageIntro chapter="07" eyebrow="Borders, backing, and binding" title="Calculate finishing measurements from the sewn top" intro="Calculate backing in both panel orientations, conservative binding strips and yardage, and borders that fit the quilt you actually sewed—not only the dimensions the pattern predicted.">
        <div className={styles.pageIntroFormula}><span>BACKING DEFAULT</span><strong>TOP + 4″ / SIDE</strong><small>editable · your longarmer’s requirement wins</small></div>
      </PageIntro>
      <section className={styles.contentSection}><FinishingCalculator /></section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Border sequence" title="Measure through the center to prevent waves" description="Never cut long border strips from one outside edge measurement. The center of the quilt controls the border length." />
        <div className={styles.borderWorkflow}>
          <article><span>01</span><div><h2>Measure three heights</h2><p>Measure left, center, and right through the quilt top. Average them. Cut both side borders to that same raw length.</p></div><strong>SIDES FIRST</strong></article>
          <article><span>02</span><div><h2>Pin center and quarters</h2><p>Fold the quilt and border to mark midpoints and quarters. Match those marks, then ease only the small difference between pins.</p></div><strong>NO STRETCHING</strong></article>
          <article><span>03</span><div><h2>Attach and press</h2><p>Sew both side borders with the fuller layer against the feed dogs if gentle easing is required. Press toward the border.</p></div><strong>REMEASURE</strong></article>
          <article><span>04</span><div><h2>Measure three widths</h2><p>Now measure top, center, and bottom across the bordered top. Average and cut both top/bottom borders to that length.</p></div><strong>TOP + BOTTOM</strong></article>
        </div>
        <Note title="Border cut width">A border meant to finish at 3″ is cut 3½″ wide. Its length comes from the actual raw quilt measurement after the prior border is attached.</Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Backing choices" title="Two orientations, one real-world decision" />
        <div className={styles.finishInfoGrid}>
          <article><span>VERTICAL PANELS</span><h2>Long seams follow quilt height</h2><p>Often straightforward for tall quilts. Each panel length is backing target height. Center a seam or use three panels to avoid a seam directly under the quilt center.</p></article>
          <article><span>HORIZONTAL PANELS</span><h2>Crosswise seams can save yardage</h2><p>Often efficient for 40″–60″ wide quilts. Each piece length is backing target width; a directional print rotates relative to vertical panels.</p></article>
          <article><span>WIDEBACK</span><h2>One piece, check width first</h2><p>108″-style backing can eliminate seams, but still add the requested margin on every side and allow for squaring or shrinkage.</p></article>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.darkSection}`}>
        <SectionHeading eyebrow="Binding steps" title="Straight-grain double-fold binding" />
        <div className={styles.bindingSteps}>
          <article><b>1</b><strong>Find perimeter</strong><p>2 × (finished width + finished height).</p></article>
          <article><b>2</b><strong>Add working buffer</strong><p>This guide adds 20″ for four corners, joins, overlap, and tails.</p></article>
          <article><b>3</b><strong>Allow for every join</strong><p>The calculator uses your entered usable WOF (40″ by default), then subtracts one strip width of length for each diagonal join before rounding up.</p></article>
          <article><b>4</b><strong>Convert to yardage</strong><p>Strip count × cut width ÷ 36; round upward to a safe shop increment.</p></article>
          <article><b>5</b><strong>Join diagonally</strong><p>Offset 90° ends, sew the diagonal, trim to ¼″, and press joins open.</p></article>
          <article><b>6</b><strong>Test before trimming tails</strong><p>Walk the prepared binding around the quilt so no join lands at a corner.</p></article>
        </div>
        <Note title="Curves and scallops need bias" tone="tomato">The calculator is for straight-grain binding on straight-edged quilts. Curved edges require true bias binding and a separate yield plan.</Note>
      </section>
    </>
  );
}

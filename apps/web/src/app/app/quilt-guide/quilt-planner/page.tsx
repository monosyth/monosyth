import { QuiltPlanner } from "@/components/app/quilt-guide/quilt-planner";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Quilt Planner" };

const ONE_PACK_GRIDS = [
  { precut: "10″ squares", grid: "6 × 7", count: "42", size: "57″ × 66½″" },
  { precut: "5″ charms", grid: "6 × 7", count: "42", size: "27″ × 31½″" },
  { precut: "2½″ minis", grid: "6 × 7", count: "42", size: "12″ × 14″" },
] as const;

export default function QuiltPlannerPage() {
  return (
    <>
      <PageIntro chapter="05" eyebrow="Quilt size planner" title="Calculate a quilt from the finished size" intro="Enter the finished top you want, choose a block and optional sashing or border, then get the closest practical grid, actual dimensions, block count, precut pieces, and pack count.">
        <div className={styles.pageIntroFormula}><span>CORE WIDTH</span><strong>BLOCKS + SASHING</strong><small>then add finished borders to both sides</small></div>
      </PageIntro>
      <section className={styles.contentSection}><QuiltPlanner /></section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Whole-precut examples" title="Finished sizes from one 42-piece pack" description="These grids use a nominal 42-piece square pack with no sashing or borders. Actual pack counts remain editable in the planner." />
        <div className={styles.onePackGrid}>
          {ONE_PACK_GRIDS.map((item) => <article key={item.precut}><span>{item.count} PIECES</span><h2>{item.precut}</h2><strong>{item.size}</strong><p>{item.grid} plain grid · ¼″ seams</p></article>)}
        </div>
        <Note title="Example: turn 42 large squares into exactly 60″ × 72″" tone="gold">A 6 × 7 grid of whole 10″ squares finishes at 57″ × 66½″. Add 1½″ finished side borders and 2¾″ finished top/bottom borders—cut at 2″ and 3¼″ wide respectively.</Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Sashing piece count" title="Calculate the pieces between blocks" />
        <div className={styles.formulaCardGrid}>
          <article><span>VERTICAL SHORT SASHES</span><strong>rows × (columns − 1)</strong><p>Each is the raw block height long and cut at finished sashing width + ½″.</p></article>
          <article><span>HORIZONTAL SHORT SASHES</span><strong>columns × (rows − 1)</strong><p>Use this count when assembling with cornerstones at every intersection.</p></article>
          <article><span>CORNERSTONES</span><strong>(columns − 1) × (rows − 1)</strong><p>Cut squares at finished sashing width + ½″.</p></article>
          <article><span>FULL-WIDTH BANDS</span><strong>rows − 1</strong><p>Without cornerstones, build each block row, measure it, and cut full-width bands to that actual raw length.</p></article>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.darkSection}`}>
        <SectionHeading eyebrow="Planning sequence" title="From target size to cutting list" />
        <ol className={styles.largeSteps}>
          <li><span>01</span><div><strong>Choose the real target</strong><p>Measure the bed, wall, person, or existing quilt—not just the category name.</p></div></li>
          <li><span>02</span><div><strong>Choose a finished block</strong><p>Use the block recipe’s FINISHES AT size, never its raw square-up size.</p></div></li>
          <li><span>03</span><div><strong>Decide under or over</strong><p>Let the grid land below target for a custom border, or meet/exceed with whole blocks.</p></div></li>
          <li><span>04</span><div><strong>Add sashing and borders</strong><p>Enter finished widths. The planner automatically adds the ½″ needed when cutting.</p></div></li>
          <li><span>05</span><div><strong>Count the real pack</strong><p>Enter actual bundle count and pieces needed per block; duplicates and directional fabric can affect usable yield.</p></div></li>
        </ol>
      </section>
    </>
  );
}

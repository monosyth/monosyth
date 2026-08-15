import Image from "next/image";

import { PrecutNestingDiagram } from "@/components/app/quilt-guide/diagrams";
import { PrecutGridCalculator, PrecutMixer } from "@/components/app/quilt-guide/precut-tools";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";
import { PRECUTS } from "@/lib/quilting/data";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Precut Sizes and Conversions" };

export default function PrecutLibraryPage() {
  return (
    <>
      <PageIntro chapter="01" eyebrow="Precut fabric" title="Precut sizes and conversions" intro="Standard cut sizes, finished patch sizes, pack-count differences, efficient subcuts, and calculations for mixing 10″, 5″, and 2½″ squares.">
        <div className={styles.pageIntroFormula}><span>ORDINARY PATCH</span><strong>CUT − ½″ = FINISH</strong><small>when all four sides enter ¼″ seams</small></div>
      </PageIntro>

      <figure className={styles.chapterPhoto}>
        <Image src="/quilt-guide/real-quilting-tools.jpg" alt="Real rotary cutter, scissors, measuring tape, pins, thread, and sewing notions arranged on a green cutting mat" fill priority sizes="100vw" />
        <figcaption>Real workbench · Photo by <a href="https://www.pexels.com/photo/assorted-color-sewing-machine-1409217/" target="_blank" rel="noreferrer">Adonyi Gábor / Pexels ↗</a>. Actual precut products vary in count, pinking, and usable dimensions.</figcaption>
      </figure>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Standard sizes" title="Common quilting precuts" description="Brand names are included for recognition. The dimension—not the nickname—is the calculator input." />
        <div className={styles.precutCardGrid}>
          {PRECUTS.map((precut, index) => (
            <article className={`${styles.precutCard} ${styles[`precut${precut.color[0].toUpperCase()}${precut.color.slice(1)}`]}`} key={precut.id}>
              <div><span>{String(index + 1).padStart(2, "0")}</span><small>{precut.familiarName}</small></div>
              <strong>{precut.cut}</strong>
              <h2>{precut.genericName}</h2>
              <p>{precut.description}</p>
              <dl><div><dt>DIRECT FINISH</dt><dd>{precut.directFinish}</dd></div><div><dt>MODA GUIDE COUNT</dt><dd>{precut.modaCount}</dd></div></dl>
            </article>
          ))}
        </div>
        <Note title="Counts are manufacturer-specific" tone="tomato">Moda’s guide lists 42 Layer Cake squares, 42 charms, 42 mini charms, and 40 Jelly Roll strips, but collections and other manufacturers vary. Enter the count printed on your bundle.</Note>
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Cutting equivalence" title="Subcutting large squares into smaller squares" description="Area equivalence applies before sewing. Once the small pieces are joined, every new seam changes the finished footprint." />
        <PrecutNestingDiagram />
        <div className={styles.equivalenceGrid}>
          <article><span>CUTTING AREA</span><strong>1 × 10″</strong><b>= 4 × 5″ = 16 × 2½″</b><p>True when subcutting the original square.</p></article>
          <article><span>SEWN FOOTPRINT</span><strong>9½″ vs. 9″ vs. 8″</strong><b>not interchangeable</b><p>One whole 10″ patch versus 2 × 2 charms versus 4 × 4 minis, all after outside seams.</p></article>
          <article><span>RESTORE THE MATCH</span><strong>1″ cut sashing</strong><b>finishes at ½″</b><p>Add it at every internal subdivision seam, or trim the larger unpieced patch.</p></article>
        </div>
      </section>

      <section className={styles.contentSection}><PrecutMixer /></section>
      <section className={styles.contentSection}><PrecutGridCalculator /></section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Precut reference chart" title="Common cuts and sewn results" />
        <div className={styles.quickTableWrap}>
          <table className={styles.quickTable}>
            <thead><tr><th>START WITH</th><th>CUT / METHOD</th><th>GET</th><th>FINISHED RESULT</th></tr></thead>
            <tbody>
              <tr><th>2 × 5″ charms</th><td>HST · 2 at a time</td><td>2 units, trim 4½″</td><td>4″ HSTs</td></tr>
              <tr><th>2 × 10″ squares</th><td>HST · 8 at a time</td><td>8 units, trim 4½″</td><td>4″ HSTs</td></tr>
              <tr><th>1 × 10″ square</th><td>Quarter twice each way</td><td>16 mini-size squares</td><td>2″ each after seams</td></tr>
              <tr><th>1 × 5″ charm</th><td>Quarter once each way</td><td>4 mini-size squares</td><td>2″ each after seams</td></tr>
              <tr><th>1 × 2½″ strip</th><td>Crosscut every 2½″</td><td>up to 16 squares from 40″ usable</td><td>2″ each after seams</td></tr>
              <tr><th>3 × 2½″ strips</th><td>Sew strip set; crosscut 6½″</td><td>6½″ raw rail units</td><td>6″ square rail units</td></tr>
            </tbody>
          </table>
        </div>
        <Note title="Pinked edges need one consistent convention">For Moda pinked strips, the manufacturer advises aligning from the outer points and testing a very scant ¼″ seam. Other brands can use different pinking conventions—measure and run a three-strip seam test first.</Note>
      </section>
    </>
  );
}

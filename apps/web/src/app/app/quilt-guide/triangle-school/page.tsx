import { HstMethodDiagram } from "@/components/app/quilt-guide/diagrams";
import { TriangleCalculator } from "@/components/app/quilt-guide/triangle-calculator";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";
import { QUICK_HST_CHART } from "@/lib/quilting/data";
import { formatInches } from "@/lib/quilting/math";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Triangle School" };

export default function TriangleSchoolPage() {
  return (
    <>
      <PageIntro chapter="02" eyebrow="Triangle school" title="Make the point. Keep the seam allowance." intro="Choose a finished unit and quantity. The guide gives a trim-friendly starting cut, exact benchmark, batch yield, trimming target, and construction map for HSTs, QSTs, and Flying Geese.">
        <div className={styles.pageIntroFormula}><span>HST · 2 AT ONCE</span><strong>FINISH + 1″</strong><small>trim-friendly start · trim to finish + ½″</small></div>
      </PageIntro>

      <section className={styles.contentSection}><TriangleCalculator /></section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="HST methods" title="Pick the batch that fits the job" description="Two-at-a-time is the everyday default. Eight-at-a-time is efficient for repeats. Four-at-a-time uses bias outer edges and rewards careful handling." />
        <div className={styles.methodCardGrid}>
          <article><span>01</span><HstMethodDiagram method="two" /><h2>Two at a time</h2><p>Mark one diagonal, sew ¼″ on both sides, cut the marked line, press, and trim. Two equal squares make two HSTs.</p><strong>CUT · F + 1″ trim-friendly</strong></article>
          <article><span>02</span><HstMethodDiagram method="eight" /><h2>Eight at a time</h2><p>Mark both diagonals, sew beside both, then cut the square in half vertically, horizontally, and on both diagonals.</p><strong>CUT · 2 × (F + 1″)</strong></article>
          <article><span>03</span><HstMethodDiagram method="four" /><h2>Four at a time</h2><p>Sew all four outer edges and cut both diagonals. Fast, but every outside edge is bias. Starch, press without dragging, and trim.</p><strong>USE CALCULATOR · geometric start</strong></article>
        </div>
        <Note title="The .64 shortcut is only an approximation" tone="tomato">The calculator uses the actual four-at-a-time geometry plus a trim buffer, then rounds upward to the next ¼″. This avoids undersized small units and makes the rounding decision visible.</Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="HST bench chart" title="Common finished sizes at a glance" description="All starting cuts shown here are the trim-friendly values used by the calculator." />
        <div className={styles.quickTableWrap}>
          <table className={styles.quickTable}>
            <thead><tr><th>FINISHES AT</th><th>TRIM TO</th><th>2 AT A TIME · CUT</th><th>4 AT A TIME · CUT</th><th>8 AT A TIME · CUT</th></tr></thead>
            <tbody>{QUICK_HST_CHART.map(([finished, trim, two, four, eight]) => <tr key={finished}><th>{formatInches(finished)}</th><td>{formatInches(trim)}</td><td>{formatInches(two)}</td><td>{formatInches(four)}</td><td>{formatInches(eight)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Unit choreography" title="The three sequences to memorize" />
        <div className={styles.sequenceGrid}>
          <article>
            <div className={styles.sequenceIcon}><i className={styles.hstShape} /></div>
            <span>HST · 2 AT ONCE</span><h2>Mark → sew both sides → cut → trim</h2>
            <ol><li>Layer two equal squares right sides together.</li><li>Mark one diagonal on the wrong side of the lighter fabric.</li><li>Sew a scant ¼″ on both sides of the line.</li><li>Cut the line, press toward dark, and trim with the 45° ruler line on the seam.</li></ol>
          </article>
          <article>
            <div className={styles.sequenceIcon}><i className={styles.qstShape} /></div>
            <span>QST / HOURGLASS</span><h2>Make HSTs → oppose seams → sew again</h2>
            <ol><li>Make two oversized HSTs from a contrasting pair.</li><li>Place HSTs right sides together with colors opposite and seams nested.</li><li>Mark the other diagonal, sew on both sides, and cut.</li><li>Press; trim to F + ½″ with the intersection at exact center.</li></ol>
          </article>
          <article>
            <div className={styles.sequenceIcon}><i className={styles.gooseShape} /></div>
            <span>FLYING GEESE · 4 AT ONCE</span><h2>Two sky squares → split → repeat → trim</h2>
            <ol><li>Place two marked sky squares on opposite corners of the large goose square.</li><li>Sew beside both sides of the line and cut on it.</li><li>Press heart-shaped units; add one sky square to each.</li><li>Sew, split, press, and trim four geese to W + ½″ by H + ½″.</li></ol>
          </article>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.darkSection}`}>
        <SectionHeading eyebrow="Point preservation" title="Four checks before the unit enters a block" />
        <div className={styles.checkGrid}>
          <div><b>01</b><strong>Diagonal hits corners</strong><p>The HST seam or QST diagonal runs precisely corner to corner after trimming.</p></div>
          <div><b>02</b><strong>¼″ beyond the point</strong><p>A Flying Goose tip sits ¼″ below the raw edge so the next seam lands above it.</p></div>
          <div><b>03</b><strong>Correct raw size</strong><p>The unit is always ½″ larger than the size it will finish inside the quilt.</p></div>
          <div><b>04</b><strong>Bias stays relaxed</strong><p>Press up and down—do not iron side to side—when the outside edge is on bias.</p></div>
        </div>
      </section>
    </>
  );
}

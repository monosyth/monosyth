import Link from "next/link";

import { RulerCutDiagram, RulerJobDiagram, RulerProfileDiagram } from "@/components/app/quilt-guide/diagrams";
import { RulerSlotPlanner } from "@/components/app/quilt-guide/ruler-slot-planner";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Efficient Ruler Cutting" };

export default function RulerCuttingPage() {
  return (
    <>
      <PageIntro chapter="05" eyebrow="Ruler cutting" title="Square once. Cut the whole batch." intro="Efficient workflows for a standard long quilting ruler and for slotted rulers such as Stripology®: align the fold, establish one clean edge, cut repeated widths, rotate the strip set, and subcut without doing arithmetic at every slot.">
        <div className={styles.pageIntroFormula}><span>BATCH RULE</span><strong>SQUARE → STRIP → SUBCUT</strong><small>keep the fabric still as long as possible</small></div>
      </PageIntro>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Your ruler kit" title="Three rulers, three jobs—no duplicate measuring" description="These are the exact models in your sewing room. Start with the tool listed for the job, then use the other two only when their size or markings make the next cut easier." />
        <div className={styles.rulerKitGrid}>
          <article>
            <div><span>01 · PRIMARY BATCH TOOL</span><strong>Stripology® XL</strong><small>CGRGE1XL · 22″ × 17¾″</small></div>
            <RulerProfileDiagram kind="stripology-xl" />
            <h2>Reach for it first</h2>
            <p>Batch-cut WOF strips, turn strip sets into repeated squares or rectangles, work from 10″ precuts, cut diamonds or triangles, and square blocks up to 12½″.</p>
            <strong>Best handoff → use the 6½″ × 12½″ ruler to inspect or trim individual units.</strong>
            <a href="https://gequiltdesigns.com/products/stripology-xl-ruler-by-ge-designs" target="_blank" rel="noreferrer">Official ruler details ↗</a>
          </article>
          <article>
            <div><span>02 · PRECISION BENCH TOOL</span><strong>Creative Grids® rectangle</strong><small>CGR612 · 6½″ × 12½″</small></div>
            <RulerProfileDiagram kind="creative-grids-612" />
            <h2>Reach for it to finish</h2>
            <p>Subcut short strips, trim blocks, center fussy cuts, check ¼″ seam allowances, and use the 45° lines for HSTs, Flying Geese, or on-point squares. Its 30°/60° line handles diamonds.</p>
            <strong>Best handoff → batch first on the XL; verify the first unit here before cutting the rest.</strong>
            <a href="https://www.creativegridsusa.com/products/CGR612" target="_blank" rel="noreferrer">Official ruler details ↗</a>
          </article>
          <article>
            <div><span>03 · LONG STRAIGHTEDGE</span><strong>Fiskars® sewing ruler</strong><small>1066148 · 6″ × 24″</small></div>
            <RulerProfileDiagram kind="fiskars-624" />
            <h2>Reach for it for length</h2>
            <p>Establish a long reference edge on folded yardage, make a single WOF strip, cut borders, and check long strip sets. Two-tone gridlines and 30°, 45°, and 60° guides stay useful on busy fabric.</p>
            <strong>Best handoff → use it when one clean long cut is faster than setting up the slotted ruler.</strong>
            <a href="https://www.amazon.com/dp/B0C8BMVL93" target="_blank" rel="noreferrer">Your exact model listing ↗</a>
          </article>
        </div>
        <Note title="Your default workflow" tone="gold">Use the Fiskars ruler to check or establish a long fold-aligned edge, the Stripology XL to make the repeated batch, and the Creative Grids 6½″ × 12½″ to trim and inspect the first sewn unit. You do not need all three for every cut.</Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Slotted-ruler sequence" title="Four moves from yardage to repeatable pieces" description="The drawings use a generic slotted acrylic ruler. Read your ruler’s included instructions for its exact marks, safe layer count, and cutter compatibility." />
        <div className={styles.rulerStepGrid}>
          {[1, 2, 3, 4].map((stage) => (
            <article key={stage}>
              <header><span>{String(stage).padStart(2, "0")}</span><h2>{stage === 1 ? "Press, fold, align" : stage === 2 ? "Square, then slot-cut" : stage === 3 ? "Rotate the strip set" : "Subcut the batch"}</h2></header>
              <RulerCutDiagram stage={stage as 1 | 2 | 3 | 4} />
              <p>{stage === 1 ? "Press out hard creases. Fold selvage to selvage, then fold again only if your ruler, cutter, and comfort safely allow the layer count. Put the lower fold closest to you and align both folded edges parallel to a horizontal ruler line." : stage === 2 ? "Place the slightly uneven raw edge just left of 0. Cut upward through the 0 slot to establish a square edge, stopping near the closed end, then cut every marked width without shifting the fabric." : stage === 3 ? "Lift the ruler, not the fabric. Rotate the mat or intact strip set 90°, align the clean edge—or a sewn seam—with a horizontal line, and verify it stays straight across the full batch." : "Place removable stickers above only the slots on the ticket. Subcut the repeated squares or rectangles from the clean edge, then count the pieces before moving the remaining fabric."}</p>
            </article>
          ))}
        </div>
        <Note title="Stripology® XL manufacturer capability" tone="teal">The 22″ × 17¾″ XL ruler has 14¾″ cutting slots at ½″ intervals, with additional quarter-inch markings. GE Designs says it can cut up to eight 2½″ strips or fourteen 1½″ strips without moving the ruler. Treat those as this product’s capabilities, not a universal layer or safety limit.</Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="No-math cutting ticket" title="Tell the XL what you need" description="Enter the piece width and quantity. The ticket lists every cut for the first setup and tells you how many times to reset the fabric." />
        <RulerSlotPlanner />
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Six jobs on your XL" title="Set up once for the work in front of you" description="Each picture is an original bench diagram—not a reproduction of a book or pattern. Exact quarter-inch offsets and specialty marks should still be read from the chart supplied with your ruler." />
        <div className={styles.methodCardGrid}>
          <article><span>01</span><RulerJobDiagram job="wof-strips" /><h2>Yardage → WOF strips</h2><p>Put the lower fold closest to you. Align both folds to one horizontal ruler line, leave the uneven raw edge just left of 0, cut 0 upward, then follow the marked slot ticket.</p><strong>CHECK · Open the first strip. A V at the fold means realign before batch cutting.</strong></article>
          <article><span>02</span><RulerJobDiagram job="subcut-strips" /><h2>Loose strips → pieces</h2><p>Stack only a comfortable number of equal-width strips. Align their clean ends just left of 0, then subcut the largest required rectangles before smaller leftovers.</p><strong>CHECK · Count every piece before shifting the remaining strip stack.</strong></article>
          <article><span>03</span><RulerJobDiagram job="strip-set" /><h2>Sewn strip set → units</h2><p>Press the set flat. Align one long seam—not a wavy outside edge—with a horizontal line, square the leading end at 0, and crosscut the unit width from the ticket.</p><strong>CHECK · A seam that drifts from the ruler line needs pressing or resewing first.</strong></article>
          <article><span>04</span><RulerJobDiagram job="ten-square" /><h2>Trim a 10″ square</h2><p>Use the ruler’s 10″ square-up reference. Align two fabric edges, shave only what is needed, rotate the square 180°, then place the clean edges on the target guides and trim the last two.</p><strong>CHECK · Measure the result before treating every precut in the pack the same way.</strong></article>
          <article><span>05</span><RulerJobDiagram job="square-block" /><h2>Square a sewn block</h2><p>Center the block in its target-size box, matching useful seams or diagonals to printed guides. Share the trim across opposing sides; trim two, rotate, and finish the other two.</p><strong>CHECK · Your XL supports blocks through 12½″; use the CGR612 for smaller units.</strong></article>
          <article><span>06</span><RulerJobDiagram job="diamonds" /><h2>Cut 45° or 60° diamonds</h2><p>Cut the strip to the pattern’s stated height first. Align the required angle guide with the strip edge, establish one bias edge, then make parallel cuts at the pattern’s stated width.</p><strong>CHECK · Bias edges stretch. Lift and press—never drag—the cut diamonds.</strong></article>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Fast cut tickets" title="Mark the slots—not the fabric" description="Place a removable ruler sticker or dry-erase mark above each target slot. Read the sequence left to right before the rotary cutter opens." />
        <div className={styles.cutTicketExamples}>
          <article><span>JELLY-ROLL WIDTH</span><h2>2½″ strips</h2><div className={styles.slotCode}><b>0</b><i /><b>2½</b><i /><b>5</b><i /><b>7½</b><i /><b>10</b></div><p>Cut at every 2½″ interval. With the XL product, square first, then use its square-marked 2½″ sequence.</p></article>
          <article><span>CHARM-STYLE SQUARES</span><h2>5″ × 5″</h2><div className={styles.slotCode}><b>0</b><i /><b>5</b><i /><b>10</b><i /><b>15</b><i /><b>20</b></div><p>Cut 5″ WOF strips first. Rotate the strip stack and subcut at 5″ intervals.</p></article>
          <article><span>HST STARTS</span><h2>5″ squares → 4″ HST</h2><div className={styles.slotCode}><b>0</b><i /><b>5</b><i /><b>10</b><i /><b>15</b></div><p>Subcut 5″ pairs, mark one diagonal, make two at a time, and trim each unit to 4½″.</p></article>
          <article><span>RAIL FENCE</span><h2>3 strips → 6½″ units</h2><div className={styles.slotCode}><b>0</b><i /><b>6½</b><i /><b>13</b><i /><b>19½</b></div><p>Sew three 2½″ strips, press, measure the actual set, then crosscut square units at 6½″.</p></article>
        </div>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Standard long ruler" title="The same production logic without slots" />
        <div className={styles.standardRulerGrid}>
          <article><b>1</b><h3>Square a reference edge</h3><p>Place a horizontal ruler line on the fabric fold. Trim the left edge. If the cut makes a V at the fold, realign and square again.</p></article>
          <article><b>2</b><h3>Measure from the new edge</h3><p>Move the ruler to the required width; keep one long line on the fold. Apply pressure with the non-cutting hand spread safely across the ruler.</p></article>
          <article><b>3</b><h3>Walk your hand</h3><p>For a long cut, stop the cutter while it remains against the ruler. Reposition your ruler hand higher, then continue—never reach beyond stable control.</p></article>
          <article><b>4</b><h3>Subcut from one end</h3><p>Stack only a comfortable number of identical strips, square their ends together, and subcut the largest pieces before the smallest.</p></article>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.darkSection}`}>
        <SectionHeading eyebrow="Accuracy + safety" title="What keeps a fast batch usable" />
        <div className={styles.checkGrid}>
          <div><b>01</b><strong>Fresh blade</strong><p>A dull blade makes you recut slots, shift layers, and press harder than necessary.</p></div>
          <div><b>02</b><strong>Comfortable layers</strong><p>The manufacturer may state a maximum; your fabric, cutter, hand strength, and blade decide the safe working stack.</p></div>
          <div><b>03</b><strong>Parallel folds</strong><p>A fold that angles away from the selvage creates V-shaped strips even when every slot is exact.</p></div>
          <div><b>04</b><strong>Closed cutter</strong><p>Close or retract the blade every time it leaves the mat. Cut away from your body and keep fingers out of the travel path.</p></div>
        </div>
        <div className={styles.officialLinkBand}><span>PRODUCT-SPECIFIC HELP</span><p>Use the creator’s free tutorial for exact ruler markings and technique.</p><Link href="https://gequiltdesigns.com/pages/stripology-101-video-tutorials" target="_blank" rel="noreferrer">Open GE Designs Stripology 101 ↗</Link></div>
      </section>
    </>
  );
}

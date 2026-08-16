import Link from "next/link";

import { RulerCutDiagram, RulerJobDiagram, RulerProfileDiagram } from "@/components/app/quilt-guide/diagrams";
import { RulerSlotPlanner } from "@/components/app/quilt-guide/ruler-slot-planner";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Efficient Ruler Cutting" };

export default function RulerCuttingPage() {
  return (
    <>
      <PageIntro chapter="06" eyebrow="Ruler cutting" title="Cut strips and repeated pieces accurately" intro="Efficient workflows for a standard long quilting ruler and for slotted rulers such as Stripology®: align the fold, establish one clean edge, cut repeated widths, rotate the strip set, and subcut without doing arithmetic at every slot.">
        <div className={styles.pageIntroFormula}><span>BATCH RULE</span><strong>SQUARE → STRIP → SUBCUT</strong><small>keep the fabric still as long as possible</small></div>
      </PageIntro>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Your ruler kit" title="The three rulers you actually own" description="The Mini handles small repeated cuts and unit trimming. The long Fiskars ruler establishes WOF-length edges and strips. The 6½″ × 12½″ Creative Grids ruler checks individual pieces and diagonals." />
        <div className={styles.rulerKitGrid}>
          <article>
            <div><span>01 · SMALL BATCH TOOL</span><strong>Stripology® Squared Mini</strong><small>CGRGE3 · 8½″ × 12½″</small></div>
            <RulerProfileDiagram kind="stripology-mini" />
            <h2>Use it for small repeated pieces</h2>
            <p>Cut folded fat quarters or fat eighths into strips, subcut strips and small precuts, use quarter/eighth offset markings, and square sewn units through 6½″. Its slits are 9½″ long.</p>
            <strong>Best handoff → make long WOF cuts with the Fiskars ruler, then use the Mini for repeated subcuts.</strong>
            <a href="https://www.creativegridsusa.com/products/CGRGE3" target="_blank" rel="noreferrer">Official CGRGE3 details ↗</a>
          </article>
          <article>
            <div><span>02 · PRECISION BENCH TOOL</span><strong>Creative Grids® rectangle</strong><small>CGR612 · 6½″ × 12½″</small></div>
            <RulerProfileDiagram kind="creative-grids-612" />
            <h2>Reach for it to finish</h2>
            <p>Subcut short strips, trim blocks, center fussy cuts, check ¼″ seam allowances, and use the 45° lines for HSTs, Flying Geese, or on-point squares. Its 30°/60° line handles diamonds.</p>
            <strong>Best handoff → batch small pieces on the Mini; verify the first sewn unit here before cutting the rest.</strong>
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
        <Note title="Your default workflow" tone="gold">Use the Fiskars ruler for a long fold-aligned edge or WOF strip. Move the resulting strip, fat quarter, or small precut to the Stripology Mini for repeated subcuts. Use the Creative Grids 6½″ × 12½″ ruler to trim and inspect the first sewn unit. You do not need all three for every cut.</Note>
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
        <Note title="Your Stripology® Mini’s working range" tone="teal">The CGRGE3 measures 8½″ × 12½″, has 9½″-long slits at ½″ intervals, includes quarter-, eighth-, and three-eighth offset markings, and squares units through 6½″. GE Designs says it can cut four 1½″ strips without moving the ruler. Those are Mini-specific capabilities—not XL capacities.</Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Ruler selector + cutting ticket" title="Choose the ruler that is on your mat" description="Your Stripology Mini is selected first. Change rulers and the ticket recalculates the usable span, physical slot spacing, offset-cut method, and number of resets." />
        <RulerSlotPlanner />
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Six useful cutting jobs" title="Use the Mini where its size helps" description="These are original bench diagrams, not reproductions of a book. The examples below are sized for your Mini; select a different ruler in the calculator when the material or required reach is larger." />
        <div className={styles.methodCardGrid}>
          <article><span>01</span><RulerJobDiagram job="wof-strips" /><h2>Fat quarter → strips</h2><p>Follow the CGRGE3 fold diagram: fold the fat quarter lengthwise, then into four layers. Align the lower fold at 0, keep the upper fold parallel, square the raw end, and cut the selected slots.</p><strong>CHECK · Open the first strip. A V at a fold means realign before batch cutting.</strong></article>
          <article><span>02</span><RulerJobDiagram job="subcut-strips" /><h2>Loose strips → pieces</h2><p>Stack only a comfortable number of equal-width strips. Align their clean ends just left of 0, then subcut the largest required rectangles before smaller leftovers.</p><strong>CHECK · Count every piece before shifting the remaining strip stack.</strong></article>
          <article><span>03</span><RulerJobDiagram job="strip-set" /><h2>Sewn strip set → units</h2><p>Press the set flat. Align one long seam—not a wavy outside edge—with a horizontal line, square the leading end at 0, and crosscut the unit width from the ticket.</p><strong>CHECK · A seam that drifts from the ruler line needs pressing or resewing first.</strong></article>
          <article><span>04</span><RulerJobDiagram job="ten-square" /><h2>Trim a 5″ square</h2><p>Center the nominal charm inside the Mini’s 5″ guides. Shave only what is necessary, rotate 180°, align the two clean edges, and trim the remaining sides.</p><strong>CHECK · Measure pinked precuts before deciding whether any trimming is needed.</strong></article>
          <article><span>05</span><RulerJobDiagram job="square-block" /><h2>Square a sewn unit</h2><p>Center the unit in its target-size box, matching seams or diagonals to the printed guides. Trim two opposing sides, rotate, and trim the other two.</p><strong>CHECK · Your Mini squares whole-inch units through 6″ and half-inch units through 6½″.</strong></article>
          <article><span>06</span><RulerJobDiagram job="diamonds" /><h2>Cut a 45° angle</h2><p>Cut the strip to the pattern’s stated height first. Align the Mini’s 45° guide with the strip edge, establish one bias edge, then make the next parallel cut at the required width.</p><strong>CHECK · Use your long ruler for 60° work; bias edges stretch, so lift instead of dragging.</strong></article>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Fast cut tickets" title="Mark the slots—not the fabric" description="Place a removable ruler sticker or dry-erase mark above each target slot. Read the sequence left to right before the rotary cutter opens." />
        <div className={styles.cutTicketExamples}>
          <article><span>MINI · DIRECT SLOTS</span><h2>2½″ strips</h2><div className={styles.slotCode}><b>0</b><i /><b>2½</b><i /><b>5</b></div><p>The Mini yields two 2½″ widths in this conservative setup. Reset the clean edge at 0 for the next pair.</p></article>
          <article><span>MINI · ONE PER SETUP</span><h2>5″ × 5″</h2><div className={styles.slotCode}><b>0</b><i /><b>5</b><i /><b>RESET</b></div><p>Cut a 5″ strip first, rotate it, square at 0, and subcut one 5″ square before resetting.</p></article>
          <article><span>MINI · QUARTER OFFSET</span><h2>2¼″ square</h2><div className={styles.slotCode}><b>ALIGN ¼</b><i /><b>CUT 2¼</b><i /><b>RESET</b></div><p>Turn to the quarter-cut side and follow the printed dotted-line setup. This is one offset cut at a time, not a 0–2¼–4½ multi-slot batch.</p></article>
          <article><span>MINI · FULL REACH</span><h2>6½″ unit</h2><div className={styles.slotCode}><b>0</b><i /><b>6½</b></div><p>Press and measure the strip set, square its leading edge at 0, then crosscut one 6½″ unit per setup.</p></article>
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

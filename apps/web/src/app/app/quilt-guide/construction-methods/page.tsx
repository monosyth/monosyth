import Link from "next/link";

import { FusibleGridStepDiagram } from "@/components/app/quilt-guide/fusible-grid-diagrams";
import { FusibleGridPlanner } from "@/components/app/quilt-guide/fusible-grid-planner";
import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Patchwork Construction Methods" };

const STEPS = [
  {
    title: "Match the squares to the grid",
    phase: "Plan and test",
    instruction: "Read the package before cutting. A printed 2½″ placement grid takes 2½″ cut squares; a 2″ grid takes 2″ squares. If you mark plain lightweight fusible interfacing yourself, the line spacing must equal the cut-square size.",
    details: ["Pre-test one fabric and one interfacing scrap with the manufacturer’s stated heat, steam, press cloth, and dwell time.", "Count the exact columns and rows before cutting the interfacing. Borders are added after the grid panel is sewn."],
    checkpoint: "The grid spacing, cut-square size, and product instructions agree.",
  },
  {
    title: "Arrange every square before fusing",
    phase: "Cut and place",
    instruction: "Lay the interfacing rough or adhesive side up. Place every fabric square right side up in its grid position. Photograph the layout before pressing so a shifted color is easy to spot.",
    details: ["Keep directional prints upright if the design requires it.", "Start at one corner and compare each row with the plan before moving to the next row."],
    checkpoint: "Every grid position is filled and the color layout matches the plan.",
  },
  {
    title: "Fuse without pushing the pieces",
    phase: "Fuse",
    instruction: "Use the heat and moisture method required by the interfacing. Lower the iron, hold it in place, lift it, and set it down on the next area. Do not slide the iron across loose squares.",
    details: ["Use a pressing sheet or the specified press cloth to protect the iron from exposed adhesive.", "Let the panel cool flat, then lift one edge gently to confirm every square is attached."],
    checkpoint: "No square shifts when the cooled panel is lifted carefully.",
  },
  {
    title: "Sew all folds in the first direction",
    phase: "First seams",
    instruction: "Fold the panel exactly on the first printed line with fabric right sides together. Sew a consistent ¼″ from the fold. Repeat every parallel line before changing direction. For a long runner, sew the seams that run along its length first.",
    details: ["Keep the fold against the same guide or presser-foot reference for every seam.", "Before sewing past each patch, check that its raw edges are inside the seam rather than folded away from the needle."],
    checkpoint: "There are no skipped grid lines and every seam catches both neighboring squares.",
  },
  {
    title: "Clip the intersections, not the stitches",
    phase: "Clip and press",
    instruction: "From the back, clip the interfacing and seam allowance at each perpendicular grid line. Cut up to—but never through—the sewn line. The clips let separate sections of one long seam turn in opposite directions.",
    details: ["Use small sharp snips and stop as soon as their tip reaches the seam.", "Press the seam section in one row left, the next row right, then continue alternating."],
    checkpoint: "Adjacent seam sections point opposite ways and the sewn line remains intact.",
  },
  {
    title: "Nest and sew the second direction",
    phase: "Cross seams",
    instruction: "Fold on the first perpendicular grid line. At every intersection, push the opposing seam allowances together until the ridges lock. Sew ¼″ from the fold and repeat all remaining cross seams.",
    details: ["Pause with the needle down just before an intersection and confirm the seam allowances still oppose each other.", "Do not stretch the panel to make an intersection meet; reopen and reposition it."],
    checkpoint: "The seam ridges nest without a gap or doubled stack at each crossing.",
  },
  {
    title: "Press, measure, and finish the runner",
    phase: "Final check",
    instruction: "Press the second-direction seams as directed by the product, then press the front without dragging. Measure the raw panel at the center and both ends. Add borders only after using the panel’s actual measurement.",
    details: ["A grid of equal squares has a raw measurement ½″ larger than its final enclosed footprint in each direction.", "Layer with batting and backing, quilt, square the sandwich, and bind. Check the batting maker’s maximum quilting distance."],
    checkpoint: "The panel lies flat and its raw width and length match the calculated checkpoint before borders.",
  },
] as const;

export default function ConstructionMethodsPage() {
  return (
    <>
      <PageIntro chapter="04" eyebrow="Patchwork construction" title="Fusible-grid piecing and standard row piecing" intro="Use the method that fits the project. This chapter explains what the fusible grid changes, what it does not change, and the exact sequence for building an accurate patchwork table runner with a ¼″ seam.">
        <div className={styles.pageIntroFormula}><span>EQUAL-SQUARE GRID</span><strong>CUT − ½″ = VISIBLE</strong><small>for each patch enclosed by seams</small></div>
      </PageIntro>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Method comparison" title="Standard piecing compared with fusible-grid piecing" description="Both methods use the same seam allowance and finish-size math. The difference is how the pieces are held, handled, and sewn." />
        <div className={styles.quickTableWrap}>
          <table className={styles.quickTable}>
            <thead><tr><th>DECISION</th><th>STANDARD ROW OR CHAIN PIECING</th><th>FUSIBLE-GRID PIECING</th></tr></thead>
            <tbody>
              <tr><th>Layout control</th><td>Pieces stay loose until sewn; labels, stacks, or a design wall preserve order.</td><td>The complete layout is fixed before sewing, which is useful for many small squares.</td></tr>
              <tr><th>Hand and machine work</th><td>Many short seams, then rows; easy to repair or replace one unit.</td><td>A smaller number of full-length fold seams; the panel becomes bulkier as it is sewn.</td></tr>
              <tr><th>Feel</th><td>Softest and lightest result.</td><td>Interfacing adds body, weight, and some stiffness.</td></tr>
              <tr><th>Best uses</th><td>Bed quilts, soft throws, blocks with varied unit sizes, and projects where drape matters.</td><td>Table runners, placemats, bags, pillows, pixel quilts, postage-stamp layouts, and small-square designs.</td></tr>
              <tr><th>Main risk</th><td>Order can change; accumulated seam error can move intersections.</td><td>Incorrect fusing can distort or stiffen fabric; missed clips create bulky intersections.</td></tr>
            </tbody>
          </table>
        </div>
        <Note title="This method does not erase seam loss" tone="gold">A 2½″ square still shows 2″ after a ¼″ seam encloses both sides. Fusing improves placement and lets you sew whole grid lines; it does not preserve the original cut dimension.</Note>
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Fusible-grid instructions" title="Fusible-grid piecing, step by step" description="These steps synthesize the Pellon, Quiltsmart, and TenSisters workflows. The heat setting, moisture, dwell time, grid spacing, and maximum panel size still come from the exact product package." />
        <div className={styles.stepCardGrid}>
          {STEPS.map((step, index) => (
            <article className={styles.stepCard} key={step.title}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{step.phase}</small><h3>{step.title}</h3></div></header>
              <div className={styles.stepDiagramPanel}><FusibleGridStepDiagram stage={(index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7} /></div>
              <div className={styles.stepInstructionBody}><p>{step.instruction}</p><ul>{step.details.map((detail) => <li key={detail}>{detail}</li>)}</ul></div>
              <div className={styles.stepCheckpoint}><span>CHECK BEFORE CONTINUING</span><strong>{step.checkpoint}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.contentSection}><FusibleGridPlanner /></section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Problem diagnosis" title="If the panel is not flat or the intersections miss" />
        <div className={styles.quickTableWrap}>
          <table className={styles.quickTable}>
            <thead><tr><th>WHAT YOU SEE</th><th>LIKELY CAUSE</th><th>WHAT TO DO NEXT</th></tr></thead>
            <tbody>
              <tr><th>Intersections offset</th><td>Seam allowances were not pressed in opposing directions, or they moved before the needle crossed.</td><td>Unpick only across that intersection, nest the ridges, pin or glue-baste locally, and resew.</td></tr>
              <tr><th>Panel bows or ripples</th><td>The iron slid during fusing or pressing, the panel was stretched, or the seam allowance varied.</td><td>Let it cool flat, press up and down from the center outward, then compare three width measurements before trimming.</td></tr>
              <tr><th>Hard lumps at crossings</th><td>An intersection was not clipped far enough, or all seam sections were pressed the same way.</td><td>From the back, verify each clip stops at the stitching and redirect alternating seam sections.</td></tr>
              <tr><th>A square lifts</th><td>The adhesive did not receive the product’s required heat, moisture, or time.</td><td>Stop sewing, protect the iron, re-fuse according to the package, and allow the area to cool before testing.</td></tr>
              <tr><th>A patch misses the seam</th><td>The inner raw edge folded away when the panel was creased.</td><td>Unpick that section, flatten the patch, refold on the grid line, and confirm both raw edges enter the ¼″ seam.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.darkSection}`}>
        <SectionHeading eyebrow="Source check" title="Original instructions used for this method" description="The guide paraphrases the construction sequence and supplies original diagrams; it does not reproduce book pages or tutorial photographs." />
        <div className={styles.sourceLinkList}>
          <a href="https://www.pellonprojects.com/wp-content/uploads/2013/02/P00820WHT045010.pdf" target="_blank" rel="noreferrer"><strong>Pellon 820 Quilter’s Grid</strong><span>Manufacturer fusing, fold-sewing, clipping, pressing, and long-panel guidance →</span></a>
          <a href="https://media.rainpos.com/8837/quiltsmart_grid_instructions_v2.pdf" target="_blank" rel="noreferrer"><strong>Quiltsmart Grid instructions</strong><span>Manufacturer sequence, panel-handling limits, and intersection nesting →</span></a>
          <a href="https://tensisters.com/" target="_blank" rel="noreferrer"><strong>TenSisters EasyPiecing Grid</strong><span>Manufacturer cut-and-place, fold-and-sew, and press workflow →</span></a>
          <a href="https://extension.usu.edu/juab/files/Patchwork_Hot_Pad_Instructions_13.pdf" target="_blank" rel="noreferrer"><strong>Utah State University Extension</strong><span>Measured 2½″-square project confirming the finished grid math →</span></a>
        </div>
        <div className={styles.officialLinkBand}><span>NEXT STEP</span><p>Use your calculated raw center measurement before cutting borders.</p><Link href="/app/quilt-guide/finishing">Open borders, backing, and binding →</Link></div>
      </section>
    </>
  );
}

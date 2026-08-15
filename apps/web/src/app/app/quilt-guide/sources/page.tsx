import { GuideLinkCard, Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";
import { RESEARCH_SOURCES } from "@/lib/quilting/data";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Sources, Terms & Scope" };

const SOURCE_GROUPS = [
  {
    eyebrow: "Precuts + piecing",
    title: "Nominal sizes, pack counts, and the ¼-inch seam",
    description:
      "These references support the familiar Moda precut names, typical pack counts, pinked-edge handling, and the scant-seam accuracy check used throughout the guide.",
    sources: RESEARCH_SOURCES.slice(0, 4),
  },
  {
    eyebrow: "Triangle units",
    title: "HST, QST, and no-waste Flying Geese methods",
    description:
      "The calculator formulas are tied to published construction methods. Trim-friendly values deliberately add working room beyond a tight theoretical cut.",
    sources: RESEARCH_SOURCES.slice(4, 8),
  },
  {
    eyebrow: "Finishing",
    title: "Backing orientation and straight-grain binding",
    description:
      "These sources inform the backing-panel comparison, added working margin, effective width-of-fabric assumption, and strip-count workflow.",
    sources: RESEARCH_SOURCES.slice(8, 10),
  },
  {
    eyebrow: "Efficient cutting",
    title: "Your Stripology®, Creative Grids®, and Fiskars® rulers",
    description:
      "Product dimensions, markings, and stated capacity are kept model-specific. The cutting chapter identifies the three exact rulers in Scott’s kit while keeping safety limits tied to each manufacturer.",
    sources: RESEARCH_SOURCES.slice(10, 14),
  },
  {
    eyebrow: "Construction methods",
    title: "Fusible-grid piecing",
    description:
      "These manufacturer and extension references support the place, fuse, fold, sew, clip, alternate, and cross-sew sequence used for the table-runner method.",
    sources: RESEARCH_SOURCES.slice(14, 18),
  },
] as const;

const GLOSSARY = [
  ["CUT SIZE", "The measurement placed under the ruler before a seam is sewn."],
  ["UNFINISHED / TRIM TO", "The unit size after construction and squaring, before it is sewn into the next unit."],
  ["FINISHED SIZE", "The visible size after seams enclose the unit on all sides—usually ½″ smaller than an ordinary unfinished square."],
  ["WOF", "Width of fabric: the usable crosswise width from selvage to selvage after unusable selvage is excluded."],
  ["HST / QST", "Half-square triangle / quarter-square triangle: pieced square units whose seam lines divide the square diagonally."],
  ["SCANT ¼″", "A seam sewn a thread or two narrower than a measured quarter inch so the fold and thread take-up do not shrink the finished unit."],
  ["BIAS EDGE", "An edge cut diagonally across the grain. It stretches more readily and should be handled, pressed, and transported gently."],
  ["DOG EARS", "Small triangle points extending beyond a trimmed unit. Remove them before assembly to reduce bulk and improve alignment."],
] as const;

const FORMULA_SCOPE = [
  ["Ordinary patch", "cut = finished + ½″", "Applies to a square or rectangle enclosed by a ¼″ seam on both opposing sides."],
  ["HST · 2 at a time", "exact start = F + ⅞″", "The guide also offers F + 1″ as a trim-friendly start."],
  ["HST · 8 at a time", "exact start = 2 × (F + ⅞″)", "Use 2 × (F + 1″) when you want comfortable squaring room."],
  ["QST hourglass", "exact start = F + 1¼″", "The guide uses F + 1½″ for a trim-friendly start."],
  ["No-waste geese", "large = W + 1¼″ · small = H + ⅞″", "W and H are the Flying Geese unit’s finished width and height."],
  ["Straight binding", "2 × (W + H) + 20″", "A conservative planning buffer; curved edges require bias binding and different yield math."],
] as const;

export default function SourcesPage() {
  return (
    <>
      <PageIntro
        chapter="08"
        eyebrow="Sources, terms + scope"
        title="Sources, definitions, and formula limits"
        intro="The guide combines manufacturer documentation, established quilting instruction, and transparent geometry. This page shows which claims come from which source—and where the fabric in front of you must overrule a nominal label."
      >
        <div className={styles.pageIntroFormula}>
          <span>REFERENCE RULE</span>
          <strong>MEASURE THE FABRIC</strong>
          <small>nominal names are a starting point, not a guarantee</small>
        </div>
      </PageIntro>

      <section className={styles.contentSection}>
        <SectionHeading
          eyebrow="Research shelf"
          title="Primary and technique references by chapter"
          description="Links open the original publisher, manufacturer, or creator page. The note beside each source states exactly what this guide takes from it."
        />
        {SOURCE_GROUPS.map((group) => (
          <div key={group.title} className={styles.quickTableWrap}>
            <table className={styles.quickTable}>
              <caption>
                <span>{group.eyebrow}</span>
                <strong>{group.title}</strong>
                <small>{group.description}</small>
              </caption>
              <thead>
                <tr>
                  <th>ORIGINAL SOURCE</th>
                  <th>USED IN THIS GUIDE FOR</th>
                </tr>
              </thead>
              <tbody>
                {group.sources.map((source) => (
                  <tr key={source.url}>
                    <th>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title} ↗
                      </a>
                    </th>
                    <td>{source.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading
          eyebrow="Formula ledger"
          title="The assumptions behind the quick answers"
          description="F means finished unit size. W and H mean the finished width and height. Every trim-friendly start is intentionally larger than the tight geometric minimum."
        />
        <div className={styles.quickTableWrap}>
          <table className={styles.quickTable}>
            <thead>
              <tr>
                <th>UNIT</th>
                <th>GUIDE FORMULA</th>
                <th>SCOPE</th>
              </tr>
            </thead>
            <tbody>
              {FORMULA_SCOPE.map(([unit, formula, scope]) => (
                <tr key={unit}>
                  <th>{unit}</th>
                  <td>{formula}</td>
                  <td>{scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note title="Test one unit before batch cutting" tone="gold">
          Fabric thickness, thread, pressing direction, ruler line placement, and machine setup all change the result by small amounts. Sew, press, and measure one complete test unit before committing the full stack.
        </Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Cutting-table language" title="Terms used on every recipe" />
        <div className={styles.standardRulerGrid}>
          {GLOSSARY.map(([term, definition], index) => (
            <article key={term}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <h3>{term}</h3>
              <p>{definition}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.darkSection}`}>
        <SectionHeading eyebrow="Read before cutting" title="Where this field guide stops" />
        <div className={styles.checkGrid}>
          <div><b>01</b><strong>Precuts are nominal</strong><p>Pack counts, dimensions, pinking, and usable edges vary by manufacturer, collection, and package. Enter or measure the quantity you actually own.</p></div>
          <div><b>02</b><strong>WOF is editable</strong><p>Yardage calculations use a conservative usable width. Directional prints, fussy cutting, shrinkage, flaws, or unusually narrow fabric need extra yardage.</p></div>
          <div><b>03</b><strong>Your finisher decides margin</strong><p>The backing calculator starts with 4″ on every side. A longarmer’s or quilting method’s stated requirement always wins.</p></div>
          <div><b>04</b><strong>Tools are not interchangeable</strong><p>Use the instructions supplied with your ruler and rotary cutter for exact slots, layer capacity, hand position, blade type, and safety practice.</p></div>
        </div>
        <Note title="Independent guide · trademark notice" tone="tomato">
          This is an independent educational reference and is not sponsored, endorsed, or affiliated with the cited companies. Layer Cake® and Jelly Roll® are associated with Moda Fabrics; Stripology® is associated with GE Designs. All product names and trademarks belong to their respective owners.
        </Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Back to the bench" title="Use the research in context" />
        <div className={styles.guideLinkGrid}>
          <GuideLinkCard href="/app/quilt-guide" number="00" title="Open the workbench" body="Return to the at-a-glance charts and full guide map." meta="All chapters" accent="gold" />
          <GuideLinkCard href="/app/quilt-guide/triangle-school" number="02" title="Check triangle math" body="Compare exact and trim-friendly HST, QST, and Flying Geese starts." meta="Formula calculators" accent="teal" />
          <GuideLinkCard href="/app/quilt-guide/ruler-cutting" number="06" title="Set up a cutting batch" body="Follow standard-ruler and generic slotted-ruler workflows safely." meta="Square · strip · subcut" accent="tomato" />
        </div>
      </section>
    </>
  );
}

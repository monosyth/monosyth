import Link from "next/link";

import { Note, PageIntro, SectionHeading } from "@/components/app/quilt-guide/ui";
import { auditBlockLibrary } from "@/lib/quilting/block-geometry";
import { QUILT_BLOCKS } from "@/lib/quilting/data";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Quilt Geometry Audit" };

const COVERAGE_DEFINITIONS = [
  ["Diagram + units", "The final map, HST/QST count, production yield, assembly grid, raw size, and finished size are checked from one shared specification."],
  ["Units", "Triangle or Flying Geese yield and trim targets are checked in addition to the complete assembly dimensions."],
  ["Structure", "Every row, column, grid, or numbered log is measured through its actual ¼-inch joining seams."],
  ["Boundary", "The outside dimensions are checked, but an oversized or improvised interior still depends on the stated trim checkpoint."],
] as const;

export default function GeometryAuditPage() {
  const audits = auditBlockLibrary(QUILT_BLOCKS);
  const passed = audits.filter((audit) => audit.status === "pass").length;
  const sharedMaps = audits.filter((audit) => audit.coverage === "diagram + units").length;
  const unitChecked = audits.filter((audit) => audit.coverage === "units" || audit.coverage === "diagram + units").length;

  return (
    <>
      <PageIntro
        chapter="A"
        eyebrow="Internal accuracy check"
        title="Geometry audit"
        intro="This is the machine-readable proof behind the block library. A production build stops if an advertised size, ¼-inch seam deduction, HST or QST yield, Flying Geese count, log length, assembly dimension, or shared diagram map fails."
      >
        <div className={styles.pageIntroStats} aria-label="Current geometry audit results">
          <div><strong>{passed}/{audits.length}</strong><span>BLOCKS PASS</span></div>
          <div><strong>{unitChecked}</strong><span>UNIT CHECKS</span></div>
          <div><strong>{sharedMaps}</strong><span>SHARED MAPS</span></div>
        </div>
      </PageIntro>

      <section className={styles.contentSection}>
        <SectionHeading
          eyebrow="What the result means"
          title="Four levels of proof"
          description="A pass is never allowed to hide the depth of the check. Boundary-only recipes are identified plainly so they can be strengthened as the geometry model expands."
        />
        <div className={styles.auditCoverageGrid}>
          {COVERAGE_DEFINITIONS.map(([title, description]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <Note title="Fabric still gets the final vote" tone="gold">
          The audit proves the arithmetic and the intended map. It cannot see a thick thread, a stretched bias edge, a worn ruler line, or a seam that pressed narrower than planned. Every batch still begins with one sewn, pressed, measured test unit.
        </Note>
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading
          eyebrow="Block-by-block ledger"
          title="Every current proof"
          description="Open a block name to compare its cut list and illustrated steps with the calculated result. The proof notes below are generated from the same specification used during the build."
        />
        <div className={styles.quickTableWrap}>
          <table className={`${styles.quickTable} ${styles.auditTable}`}>
            <thead>
              <tr>
                <th>BLOCK</th>
                <th>RESULT</th>
                <th>COVERAGE</th>
                <th>CALCULATED PROOF</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.slug}>
                  <th scope="row">
                    <Link href={`/app/quilt-guide/block-library/${audit.slug}`}>{audit.name} →</Link>
                    <small>{audit.advertised}</small>
                  </th>
                  <td>
                    <strong className={audit.status === "pass" ? styles.auditPass : styles.auditFail}>
                      {audit.status === "pass" ? "PASS" : "FAIL"}
                    </strong>
                  </td>
                  <td className={styles.auditCoverage}>{audit.coverage}</td>
                  <td>
                    <ul className={styles.auditProofList}>
                      {audit.proofs.map((proof) => <li key={proof}>{proof}</li>)}
                      {audit.errors.map((error) => <li key={error} className={styles.auditError}>{error}</li>)}
                    </ul>
                    {audit.note ? <p className={styles.auditNote}>{audit.note}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Research and arithmetic" title="See the supporting record" />
        <p className={styles.auditFooterLink}>
          The <Link href="/app/quilt-guide/sources">sources and terms page</Link> records the published tutorial attached to each block and the scope of every core formula.
        </p>
      </section>
    </>
  );
}

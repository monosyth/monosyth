import Image from "next/image";
import Link from "next/link";

import { BlockDiagram, SeamMathDiagram } from "@/components/app/quilt-guide/diagrams";
import { GuideLinkCard, Metric, Note, SectionHeading } from "@/components/app/quilt-guide/ui";
import { PRECUTS, QUICK_HST_CHART, QUILT_BLOCKS } from "@/lib/quilting/data";
import { formatInches } from "@/lib/quilting/math";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export default function QuiltGuideHome() {
  const referenceChecked = QUILT_BLOCKS.filter((block) => block.sources?.length).length;

  return (
    <>
      <section className={styles.homeHero}>
        <div className={styles.homeHeroCopy}>
          <p className={styles.eyebrow}><span>00</span>Quilt reference guide</p>
          <h1>Quilt calculations and block instructions</h1>
          <p>Look up starting cuts, trim sizes, unit yields, precut conversions, finished quilt dimensions, and illustrated block instructions using a ¼″ seam allowance.</p>
          <div className={styles.heroActions}>
            <Link href="/app/quilt-guide/quilt-planner" className={styles.primaryAction}>Plan a quilt <span>→</span></Link>
            <Link href="/app/quilt-guide/block-library" className={styles.secondaryAction}>Browse {QUILT_BLOCKS.length} blocks</Link>
          </div>
          <div className={styles.heroProof}>
            <span><i />{referenceChecked} source-checked blocks</span>
            <span><i />7 precut formats</span>
            <span><i />Research-linked formulas</span>
          </div>
        </div>
        <figure className={styles.homeHeroImage}>
          <Image src="/quilt-guide/real-quilting-tools.jpg" alt="Real rotary cutter, scissors, measuring tape, pins, thread, and sewing notions arranged on a green cutting mat" fill priority sizes="(max-width: 900px) 100vw, 52vw" />
          <figcaption><span>Real workbench</span> Photo by <a href="https://www.pexels.com/photo/assorted-color-sewing-machine-1409217/" target="_blank" rel="noreferrer">Adonyi Gábor / Pexels ↗</a></figcaption>
        </figure>
      </section>

      <section className={styles.quickAnswerBand}>
        <div><span>10″ SQUARE</span><strong>9½″</strong><small>finished whole</small></div>
        <div><span>5″ CHARM</span><strong>4½″</strong><small>finished whole</small></div>
        <div><span>2½″ MINI / STRIP</span><strong>2″</strong><small>finished width</small></div>
        <div><span>UNIT RULE</span><strong>+ ½″</strong><small>finish → ordinary cut</small></div>
        <div><span>HST · 2 AT ONCE</span><strong>+ 1″</strong><small>trim-friendly start</small></div>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="Guide sections" title="Choose a subject" description="Each section starts with quick-reference information and continues with detailed instructions and calculators." />
        <div className={styles.guideLinkGrid}>
          <GuideLinkCard href="/app/quilt-guide/precut-library" number="01" title="I have precuts" body="See direct finished sizes, cut equivalence, seam-loss traps, pack grids, and mix-and-match fixes." meta="Layer · charm · mini · strips" accent="tomato">
            <div className={styles.miniPrecuts}><i /><i /><i /><i /></div>
          </GuideLinkCard>
          <GuideLinkCard href="/app/quilt-guide/triangle-school" number="02" title="I need triangle units" body="Calculate 2-, 4-, or 8-at-a-time HSTs, QST hourglasses, and no-waste Flying Geese." meta="Cut · sew · trim" accent="teal">
            <div className={styles.miniHst}><i /><i /></div>
          </GuideLinkCard>
          <GuideLinkCard href="/app/quilt-guide/block-library" number="03" title="I want a named block" body="Traditional and modern block recipes with cut lists, unit diagrams, pressing directions, checkpoints, and source links." meta={`${referenceChecked} source-checked · ${QUILT_BLOCKS.length} total`} accent="gold">
            <BlockDiagram slug="sawtooth-star" name="Sawtooth Star" />
          </GuideLinkCard>
          <GuideLinkCard href="/app/quilt-guide/construction-methods" number="04" title="I need a construction method" body="Compare standard row piecing with fusible-grid piecing, then plan a measured patchwork table runner." meta="Place · fuse · fold · sew" accent="tomato">
            <div className={styles.miniGrid}>{Array.from({ length: 20 }, (_, i) => <i key={i} />)}</div>
          </GuideLinkCard>
          <GuideLinkCard href="/app/quilt-guide/quilt-planner" number="05" title="I know the final size" body="Enter the target top, block size, sashing, and border. Get a grid, exact result, pieces, and packs." meta="Target → blocks → packs" accent="lilac">
            <div className={styles.miniGrid}>{Array.from({ length: 20 }, (_, i) => <i key={i} />)}</div>
          </GuideLinkCard>
          <GuideLinkCard href="/app/quilt-guide/ruler-cutting" number="06" title="I need to cut efficiently" body="Standard long-ruler and slotted-ruler workflows for WOF strips, repeated subcuts, and unit trimming." meta="Align · slot-cut · rotate" accent="teal">
            <div className={styles.miniRuler}>{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div>
          </GuideLinkCard>
          <GuideLinkCard href="/app/quilt-guide/finishing" number="07" title="I need to finish it" body="Calculate measured borders, backing panels in both orientations, and conservative binding yardage." meta="Borders · backing · binding" accent="tomato">
            <div className={styles.miniBinding}><i /><i /><i /></div>
          </GuideLinkCard>
        </div>
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <SectionHeading eyebrow="Measurement terms" title="Cut, unfinished, and finished sizes" description="CUT is the piece under your ruler. TRIM TO is the unit before assembly. FINISHES AT is what remains after the next seams." />
        <SeamMathDiagram />
        <div className={styles.metricGridFour}>
          <Metric label="SEAM" value="¼″" note="on each enclosed side" tone="tomato" />
          <Metric label="CUT → FINISH" value="− ½″" note="ordinary square or rectangle" tone="teal" />
          <Metric label="FINISH → CUT" value="+ ½″" note="ordinary square or rectangle" tone="gold" />
          <Metric label="HST TRIM" value="F + ½″" note="unfinished square target" tone="lilac" />
        </div>
        <Note title="Seam loss when sizes are mixed" tone="gold">Four 5″ charms have the same cutting area as one 10″ square, but a sewn 2 × 2 charm grid finishes at 9″—not 9½″. The precut section shows when to trim the large patch or add 1″-cut internal sashing.</Note>
      </section>

      <section className={styles.contentSection}>
        <SectionHeading eyebrow="HST quick chart" title="Trim-friendly starting squares" description="These starts deliberately include room to square up. The triangle section also shows exact tight-cut values and batch math." />
        <div className={styles.quickTableWrap}>
          <table className={styles.quickTable}>
            <thead><tr><th>FINISHES AT</th><th>TRIM TO</th><th>2 AT A TIME · CUT</th><th>4 AT A TIME · CUT</th><th>8 AT A TIME · CUT</th></tr></thead>
            <tbody>{QUICK_HST_CHART.map(([finished, trim, two, four, eight]) => <tr key={finished}><th>{formatInches(finished)}</th><td>{formatInches(trim)}</td><td>{formatInches(two)}</td><td>{formatInches(four)}</td><td>{formatInches(eight)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className={styles.homeBottomGrid}>
          <article className={styles.stackNote}>
            <p className={styles.eyebrow}>Precut snapshot</p>
            <h2>Know what is nominal</h2>
            <div>{PRECUTS.slice(0, 4).map((precut) => <p key={precut.id}><span>{precut.cut}</span><strong>{precut.genericName}</strong><small>{precut.directFinish}</small></p>)}</div>
          </article>
          <article className={styles.ruleCard}>
            <span>FIELD RULE · 01</span>
            <blockquote>Measure the fabric in front of you. A product name is not a dimension guarantee.</blockquote>
            <p>Pack counts, pinked edges, and usable WOF vary. Every calculator exposes the values most likely to change.</p>
            <Link href="/app/quilt-guide/sources">Read the sourcing notes →</Link>
          </article>
        </div>
      </section>
    </>
  );
}

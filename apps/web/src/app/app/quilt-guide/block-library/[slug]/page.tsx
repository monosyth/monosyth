import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlockDiagram, BlockStepDiagram } from "@/components/app/quilt-guide/diagrams";
import { Label, Note } from "@/components/app/quilt-guide/ui";
import { getBlock, QUILT_BLOCKS } from "@/lib/quilting/data";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

type BlockPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return QUILT_BLOCKS.map((block) => ({ slug: block.slug }));
}

export async function generateMetadata({ params }: BlockPageProps): Promise<Metadata> {
  const { slug } = await params;
  const block = getBlock(slug);
  return { title: block?.name ?? "Block recipe", description: block?.summary };
}

export default async function BlockRecipePage({ params }: BlockPageProps) {
  const { slug } = await params;
  const block = getBlock(slug);
  if (!block) notFound();
  const currentIndex = QUILT_BLOCKS.findIndex((item) => item.slug === block.slug);
  const previous = QUILT_BLOCKS[(currentIndex - 1 + QUILT_BLOCKS.length) % QUILT_BLOCKS.length];
  const next = QUILT_BLOCKS[(currentIndex + 1) % QUILT_BLOCKS.length];

  return (
    <>
      <section className={styles.blockRecipeHero}>
        <div className={styles.blockRecipeCopy}>
          <Link href="/app/quilt-guide/block-library" className={styles.backToLibrary}>← All named blocks</Link>
          <div className={styles.blockRecipeLabels}><Label tone={block.family === "modern" ? "teal" : "tomato"}>{block.family}</Label><Label>{block.difficulty}</Label></div>
          <h1>{block.name}</h1>
          <p>{block.summary}</p>
          <dl className={styles.blockHeroMetrics}>
            <div><dt>FINISHES AT</dt><dd>{block.finishedSize}</dd></div>
            <div><dt>RAW BLOCK</dt><dd>{block.unfinishedSize}</dd></div>
            <div><dt>CORE BUILD</dt><dd>{block.unitType}</dd></div>
          </dl>
        </div>
        <div className={styles.blockRecipeVisual}><BlockDiagram slug={block.diagram} name={block.name} /><span>Final assembly map</span></div>
      </section>

      <section className={styles.contentSection}>
        <header className={styles.recipeSectionHead}><div><p className={styles.eyebrow}>01 · Cutting ticket</p><h2>Cut every piece before assembly</h2></div><p>All dimensions are raw <strong>CUT</strong> sizes and already include ¼″ seam allowance where required.</p></header>
        <div className={styles.cutTicketGrid}>
          {block.cuts.map((group, index) => (
            <article key={`${group.fabric}-${index}`} className={styles[`cutGroup${group.color[0].toUpperCase()}${group.color.slice(1)}`]}>
              <span>{String.fromCharCode(65 + index)}</span>
              <h3>{group.fabric}</h3>
              <ul>{group.cuts.map((cut) => <li key={cut}>{cut}</li>)}</ul>
            </article>
          ))}
        </div>
        <Note title="Precut route" tone="gold">{block.precutNote}</Note>
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <header className={styles.recipeSectionHead}><div><p className={styles.eyebrow}>02 · Construction</p><h2>Make {block.name}, one checkpoint at a time</h2></div><p>Do not continue if a checkpoint size is off. Fixing a unit is easier than fixing the finished block.</p></header>
        <div className={styles.stepCardGrid}>
          {block.steps.map((step, index) => (
            <article className={styles.stepCard} key={step.title}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{index === 0 ? "CUT / PREP" : index === block.steps.length - 1 ? "FINAL ASSEMBLY" : "BUILD UNIT"}</small><h3>{step.title}</h3></div></header>
              <BlockStepDiagram slug={block.diagram} name={block.name} unitType={block.unitType} stage={index} />
              <p>{step.instruction}</p>
              <div><span>CHECKPOINT</span><strong>{step.checkpoint}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.recipeFinishGrid}>
          <article><p className={styles.eyebrow}>Accuracy note</p><h2>Before the last seam</h2><p>{block.accuracyNote}</p><ul><li>Verify the block matches {block.unfinishedSize} raw.</li><li>Check point tips retain ¼″ beyond the visible intersection.</li><li>Press from the front after setting each seam from the back.</li></ul></article>
          <div className={styles.finalBlockPanel}><BlockDiagram slug={block.diagram} name={block.name} /><p><span>FINISHES AT</span><strong>{block.finishedSize}</strong><small>after it enters the quilt</small></p></div>
        </div>
        <nav className={styles.blockPager} aria-label="Adjacent block recipes">
          <Link href={`/app/quilt-guide/block-library/${previous.slug}`}><span>← Previous</span><strong>{previous.name}</strong></Link>
          <Link href="/app/quilt-guide/block-library"><span>Library</span><strong>All {QUILT_BLOCKS.length} blocks</strong></Link>
          <Link href={`/app/quilt-guide/block-library/${next.slug}`}><span>Next →</span><strong>{next.name}</strong></Link>
        </nav>
      </section>
    </>
  );
}

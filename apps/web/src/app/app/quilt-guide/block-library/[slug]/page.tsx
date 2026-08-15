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
  const exactRecipe = block.sourceScope !== "construction method";

  return (
    <>
      <section className={styles.blockRecipeHero}>
        <div className={styles.blockRecipeCopy}>
          <Link href="/app/quilt-guide/block-library" className={styles.backToLibrary}>← Quilt block instructions</Link>
          <div className={styles.blockRecipeLabels}><Label tone={block.family === "modern" ? "teal" : "tomato"}>{block.family}</Label><Label>{block.difficulty}</Label>{block.sources?.length ? <Label tone="teal">{exactRecipe ? "recipe checked" : "method checked"}</Label> : null}</div>
          <h1>{block.name}</h1>
          <p>{block.summary}</p>
          <dl className={styles.blockHeroMetrics}>
            <div><dt>FINISHES AT</dt><dd>{block.finishedSize}</dd></div>
            <div><dt>RAW BLOCK</dt><dd>{block.unfinishedSize}</dd></div>
            <div><dt>STANDARD METHOD</dt><dd>{block.unitType}</dd></div>
          </dl>
        </div>
        <div className={styles.blockRecipeVisual}><BlockDiagram slug={block.diagram} name={block.name} /><span>Finished block map</span></div>
      </section>

      <section className={styles.contentSection}>
        <header className={styles.recipeSectionHead}><div><p className={styles.eyebrow}>01 · Cutting</p><h2>Cutting list</h2></div><p>All dimensions are raw <strong>cut sizes</strong>. Use a ¼″ seam allowance throughout unless a step says otherwise.</p></header>
        <div className={styles.cutTicketGrid}>
          {block.cuts.map((group, index) => (
            <article key={`${group.fabric}-${index}`} className={styles[`cutGroup${group.color[0].toUpperCase()}${group.color.slice(1)}`]}>
              <span>{String.fromCharCode(65 + index)}</span>
              <h3>{group.fabric}</h3>
              <ul>{group.cuts.map((cut) => <li key={cut}>{cut}</li>)}</ul>
            </article>
          ))}
        </div>
        <Note title="Using precuts" tone="gold">{block.precutNote}</Note>
        {block.sources?.length ? (
          <aside className={styles.recipeSources} aria-label="Tutorial sources used to verify this block">
            <div><strong>{exactRecipe ? "Exact recipe check" : "Construction-method check"}</strong><p>{block.sourceNote ?? (exactRecipe ? "The cut sizes, unit method, orientation, and final block map were checked against the linked tutorial. The diagrams here are original teaching diagrams, not copied tutorial images." : "This is a Monosyth-drafted layout. The geometry was checked independently, and the linked tutorials verify the construction method rather than this exact arrangement.")}</p></div>
            <ul>{block.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>
          </aside>
        ) : (
          <aside className={`${styles.recipeSources} ${styles.recipeSourcesPending}`}><div><strong>Reference review pending</strong><p>This recipe has been checked mathematically, but an outside photo tutorial has not yet been attached. Make one test block before batch cutting.</p></div></aside>
        )}
      </section>

      <section className={`${styles.contentSection} ${styles.paperSection}`}>
        <header className={styles.recipeSectionHead}><div><p className={styles.eyebrow}>02 · Sewing</p><h2>Construction steps</h2></div><p>Complete the checkpoint at the end of each step before continuing. Measurements refer to the unit before it is sewn into the next seam.</p></header>
        <div className={styles.stepCardGrid}>
          {block.steps.map((step, index) => (
            <article className={styles.stepCard} key={step.title}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{step.phase ?? (index === 0 ? "Prepare" : index === block.steps.length - 1 ? "Check" : "Sew")}</small><h3>{step.title}</h3></div></header>
              <div className={styles.stepDiagramPanel}><BlockStepDiagram slug={block.diagram} name={block.name} unitType={block.unitType} stage={index} diagram={step.diagram} /></div>
              <div className={styles.stepInstructionBody}>
                <p>{step.instruction}</p>
                {step.details?.length ? <ul>{step.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
                {step.pressing ? <p className={styles.pressingNote}><strong>Pressing:</strong> {step.pressing}</p> : null}
              </div>
              <div className={styles.stepCheckpoint}><span>CHECK BEFORE CONTINUING</span><strong>{step.checkpoint}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.recipeFinishGrid}>
          <article><p className={styles.eyebrow}>03 · Final check</p><h2>Final size check</h2><p>{block.accuracyNote}</p><ul><li>Verify the block measures {block.unfinishedSize} before it is joined to another block.</li><li>Check that visible point tips have a ¼″ seam allowance beyond them.</li><li>Set the final seams, then press the block flat without stretching it.</li></ul></article>
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

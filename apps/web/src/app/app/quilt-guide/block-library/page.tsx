import { BlockBrowser } from "@/components/app/quilt-guide/block-browser";
import { PageIntro } from "@/components/app/quilt-guide/ui";
import { QUILT_BLOCKS } from "@/lib/quilting/data";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Block Library" };

export default function BlockLibraryPage() {
  const traditional = QUILT_BLOCKS.filter((block) => block.family === "traditional").length;
  const modern = QUILT_BLOCKS.length - traditional;
  const checked = QUILT_BLOCKS.filter((block) => block.sources?.length).length;
  return (
    <>
      <PageIntro chapter="03" eyebrow="Quilt block instructions" title="Traditional and modern quilt blocks" intro={`All ${checked} recipes include linked sources, cut sizes, construction diagrams, pressing notes, and measurements to check. Exact-recipe pages follow a published cut list and map; method-checked pages use a Monosyth layout built from a documented construction method.`}>
        <div className={styles.pageIntroStats}><div><strong>{traditional}</strong><span>traditional</span></div><div><strong>{modern}</strong><span>modern</span></div><div><strong>{checked}</strong><span>source checked</span></div></div>
      </PageIntro>
      <section className={styles.contentSection}><BlockBrowser blocks={QUILT_BLOCKS} /></section>
    </>
  );
}

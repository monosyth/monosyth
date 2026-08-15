import Image from "next/image";

import { BlockBrowser } from "@/components/app/quilt-guide/block-browser";
import { PageIntro } from "@/components/app/quilt-guide/ui";
import { QUILT_BLOCKS } from "@/lib/quilting/data";

import styles from "@/components/app/quilt-guide/quilt-guide.module.css";

export const metadata = { title: "Block Library" };

export default function BlockLibraryPage() {
  const traditional = QUILT_BLOCKS.filter((block) => block.family === "traditional").length;
  const modern = QUILT_BLOCKS.length - traditional;
  return (
    <>
      <PageIntro chapter="03" eyebrow="Named block library" title="See the name. See every cut. Build it in order." intro={`${QUILT_BLOCKS.length} complete recipes—${traditional} traditional and ${modern} modern—redrawn as original diagrams with fixed finished sizes, cut lists, unit checkpoints, and numbered construction steps.`}>
        <div className={styles.pageIntroStats}><div><strong>{traditional}</strong><span>traditional</span></div><div><strong>{modern}</strong><span>modern</span></div><div><strong>4</strong><span>visual steps each</span></div></div>
      </PageIntro>
      <figure className={styles.chapterPhotoTall}>
        <Image src="/quilt-guide/block-sampler.png" alt="Six photoreal quilting cotton blocks arranged on pale linen, including a pinwheel, star, nine patch, churn dash, rail block, and economy-style block" fill priority sizes="100vw" />
        <figcaption>Original studio image · Use the diagrams—not the decorative photograph—for cut geometry.</figcaption>
      </figure>
      <section className={styles.contentSection}><BlockBrowser blocks={QUILT_BLOCKS} /></section>
    </>
  );
}

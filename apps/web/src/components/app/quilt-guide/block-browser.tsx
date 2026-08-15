"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { QuiltBlock } from "@/lib/quilting/data";

import { BlockDiagram } from "./diagrams";
import styles from "./quilt-guide.module.css";

type Filter = "all" | "checked" | "traditional" | "modern";

export function BlockBrowser({ blocks }: { blocks: readonly QuiltBlock[] }) {
  const [filter, setFilter] = useState<Filter>("checked");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => blocks.filter((block) => {
    const matchesFamily = filter === "all" || (filter === "checked" ? Boolean(block.sources?.length) : block.family === filter);
    const haystack = `${block.name} ${block.unitType} ${block.summary}`.toLowerCase();
    return matchesFamily && haystack.includes(query.trim().toLowerCase());
  }), [blocks, filter, query]);

  return (
    <section>
      <div className={styles.libraryControls}>
        <div className={styles.segmentedControl} aria-label="Filter block family">
          {(["all", "checked", "traditional", "modern"] as const).map((item) => <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={filter === item ? styles.segmentedActive : ""}>{item === "all" ? "All blocks" : item === "checked" ? "Source checked" : item}</button>)}
        </div>
        <label className={styles.searchField}><span className={styles.srOnly}>Search quilt blocks</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or unit…" /><b aria-hidden="true">⌕</b></label>
      </div>
      <p className={styles.libraryCount} aria-live="polite"><strong>{visible.length}</strong> named recipes shown · every card opens a full cutting and construction page.</p>
      <div className={styles.blockGrid}>
        {visible.map((block, index) => (
          <Link href={`/app/quilt-guide/block-library/${block.slug}`} className={styles.blockCard} key={block.slug}>
            <div className={styles.blockCardVisual}><BlockDiagram slug={block.diagram} name={block.name} /></div>
            <div className={styles.blockCardBody}>
              <div><span>{String(index + 1).padStart(2, "0")}</span><b>{block.family}</b></div>
              <h2>{block.name}</h2>
              {block.sources?.length ? <span className={styles.blockSourceStatus}>{block.sourceScope === "construction method" ? "Method checked · studio layout" : "Exact recipe checked"}</span> : null}
              <p>{block.summary}</p>
              <dl><div><dt>FINISHES</dt><dd>{block.finishedSize}</dd></div><div><dt>BUILD</dt><dd>{block.unitType}</dd></div></dl>
            </div>
            <span className={styles.blockCardArrow} aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
      {!visible.length ? <div className={styles.emptyState}><strong>No block matches that search.</strong><button type="button" onClick={() => { setQuery(""); setFilter("checked"); }}>Show source-checked blocks</button></div> : null}
    </section>
  );
}

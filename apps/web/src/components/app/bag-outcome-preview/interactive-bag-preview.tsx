"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import type { BagOutcomePreviewProps } from "./bag-outcome-preview";
import styles from "./preview-3d.module.css";

const BagPreview3D = dynamic(() => import("./bag-preview-3d"), {
  ssr: false,
  loading: () => <div className={styles.loading} role="status">Preparing your 3D bag…</div>,
});

class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <><p className={styles.fallbackNote}>3D isn’t available on this device. Your vector preview and cutting plan still work.</p>{this.props.fallback}</> : this.props.children;
  }
}

export function InteractiveBagPreview({ fallback, ...props }: BagOutcomePreviewProps & { fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "200px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={host}>
    <div className={styles.screenOnly}>
      <PreviewBoundary fallback={fallback}>
        {visible ? <BagPreview3D {...props} /> : <div className={styles.loading}>3D bag preview</div>}
      </PreviewBoundary>
    </div>
    <div className={styles.printOnly}>{fallback}</div>
  </div>;
}

import styles from "@/app/weather/weather.module.css";

function LoadingCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="border border-stone-300 bg-white px-6 py-5">
      <div className="h-5 w-40 animate-pulse rounded-full bg-stone-200" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-t border-stone-200 pt-3 first:border-t-0 first:pt-0"
          >
            <div className="h-4 w-28 animate-pulse rounded-full bg-stone-200" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className="h-3 w-44 animate-pulse rounded-full bg-white/20" />
              <div className="h-14 max-w-4xl animate-pulse rounded-[1.75rem] bg-white/14" />
              <div className="h-6 max-w-2xl animate-pulse rounded-full bg-white/12" />
              <div className={styles.tabStatusBadge}>
                <span className={styles.tabStatusDot} aria-hidden="true" />
                <span>Loading station data</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.tabShell}>
          <div className={styles.tabInner}>
            <div className="flex gap-3 overflow-hidden border-b border-white/20 pb-2">
              <div className="h-8 w-24 animate-pulse rounded-full bg-white/16" />
              <div className="h-8 w-20 animate-pulse rounded-full bg-white/16" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-white/16" />
              <div className="h-8 w-20 animate-pulse rounded-full bg-white/16" />
            </div>
            <div className="mt-3 flex gap-3 overflow-hidden">
              <div className="h-7 w-28 animate-pulse rounded-full bg-white/14" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-white/14" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-white/14" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-white/14" />
            </div>
            <div className={`${styles.tabStatusRow} ${styles.tabStatusRowVisible}`}>
              <div className={styles.tabStatusBadge}>
                <span className={styles.tabStatusDot} aria-hidden="true" />
                <span>Rendering weather panels</span>
              </div>
              <div className={styles.tabStatusTrack} aria-hidden="true">
                <span className={styles.tabStatusBar} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.contentShell}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LoadingCard lines={4} />
          <LoadingCard lines={4} />
          <LoadingCard lines={4} />
          <LoadingCard lines={5} />
          <LoadingCard lines={5} />
          <LoadingCard lines={5} />
        </div>
      </div>
    </main>
  );
}

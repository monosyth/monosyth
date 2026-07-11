import styles from "./page.module.css";

const memories = {
  first: {
    title: "TIRED OF WAITE-ING...",
    src: "/videos/iwannahavefun/memory-01.mp4",
  },
} as const;

type MemoryKey = keyof typeof memories;

export default async function IWantToHaveFunPage({
  searchParams,
}: PageProps<"/iwannahavefun">) {
  const requestedMemory = (await searchParams).memory;
  const memoryKey: MemoryKey =
    typeof requestedMemory === "string" &&
    Object.hasOwn(memories, requestedMemory)
      ? (requestedMemory as MemoryKey)
      : "first";
  const memory = memories[memoryKey];

  return (
    <main className={styles.partyPage}>
      <section className={styles.videoFrame} aria-labelledby="memory-title">
        <h1 id="memory-title" className={styles.titleSticker}>
          {memory.title}
        </h1>

        <video
          className={styles.memoryVideo}
          controls
          playsInline
          preload="metadata"
          aria-label={memory.title}
        >
          <source src={memory.src} type="video/mp4" />
          Your browser does not support HTML video.
        </video>

        <span
          className={`${styles.corner} ${styles.cornerTop}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.corner} ${styles.cornerBottom}`}
          aria-hidden="true"
        />
      </section>
    </main>
  );
}

import Link from "next/link";
import styles from "./shop.module.css";

export default function PatternNotFound() {
  return <div className={styles.orderPage}><section className={styles.orderCard}><p className={styles.eyebrow}>A missing piece</p><h1>Pattern not found</h1><p>That pattern isn’t in the shop. Explore the collection to find your next project.</p><Link className={styles.primaryButton} href="/shop">Browse quilt patterns →</Link></section></div>;
}

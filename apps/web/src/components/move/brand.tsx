import Link from "next/link";
import styles from "./identity.module.css";

export function MoveBrand() {
  return <Link href="/move" className={styles.wordmark} aria-label="MoveMorrow home">Move<span>Morrow</span></Link>;
}

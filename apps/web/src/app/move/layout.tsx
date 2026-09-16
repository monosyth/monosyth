import { Archivo_Black, IBM_Plex_Sans } from "next/font/google";
import styles from "@/components/move/identity.module.css";

const display = Archivo_Black({
  variable: "--font-move-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const sans = IBM_Plex_Sans({
  variable: "--font-move-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function MoveLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${sans.variable} ${styles.identity}`}>{children}</div>;
}

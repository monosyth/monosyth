import type { Metadata } from "next";
import { OrderDownloads } from "@/components/shop/order-downloads";
import styles from "../shop.module.css";

export const metadata: Metadata = { title: "Your pattern downloads", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ session_id?: string; key?: string }> }) {
  const params = await searchParams;
  return <div className={styles.orderPage}><OrderDownloads sessionId={typeof params.session_id === "string" ? params.session_id : ""} orderKey={typeof params.key === "string" ? params.key : ""} support={process.env.SHOP_SUPPORT_EMAIL?.trim() || ""} /></div>;
}

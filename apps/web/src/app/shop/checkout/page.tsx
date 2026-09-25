import type { Metadata } from "next";
import { CartPage } from "@/components/shop/cart-page";
import { formCheckoutEnabled } from "@/lib/shop/config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure checkout", robots: { index: false, follow: false } };
export default function Page() { return <CartPage available={formCheckoutEnabled()} checkout />; }

import type { Metadata } from "next";
import WeddingGallery from "./wedding-gallery";

export const metadata: Metadata = {
  title: "Dallas & Scott · A little Vegas, a whole lot of love",
  description: "The vows, the lights, and our favorite people. Relive Dallas and Scott’s Las Vegas wedding, one photograph at a time.",
  robots: { index: false, follow: false, noarchive: true, googleBot: { index: false, follow: false, noimageindex: true } },
  openGraph: { title: "Dallas & Scott · Our wedding in Vegas", description: "A little Vegas. A whole lot of love. The wedding photo collection.", url: "/dallas-and-scott", siteName: "Dallas & Scott", type: "website" },
  twitter: { card: "summary", title: "Dallas & Scott · Our wedding in Vegas", description: "The wedding photo collection" },
};

export default function Page() {
  return <WeddingGallery />;
}

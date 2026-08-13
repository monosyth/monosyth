import type { Metadata } from "next";

import { BoxyBagBuilder } from "@/components/app/boxy-bag-builder";

export const metadata: Metadata = {
  title: "Boxy Bag Builder · Monosyth Studio",
  description: "A private sewing calculator for custom boxy zipper bags.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BoxyBagPage() {
  return <BoxyBagBuilder />;
}

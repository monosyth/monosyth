import type { Metadata } from "next";

import { BagPatternStudio } from "@/components/app/bag-pattern-studio";

export const metadata: Metadata = {
  title: "Bag Pattern Studio · Monosyth Studio",
  description:
    "A private vector drafting studio for tote and zipper bag patterns, seam allowances, boxed corners, and fabric layouts.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BagPatternPage() {
  return <BagPatternStudio />;
}

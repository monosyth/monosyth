import type { Metadata } from "next";

import { BagPatternStudio } from "@/components/app/bag-studio";

export const metadata: Metadata = {
  title: "Modular Bag Studio · Monosyth Studio",
  description:
    "A modular vector drafting studio for tote and zipper bag structures, seam allowances, boxed corners, handles, panel builds, and fabric layouts.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BagStudioPage() {
  return <BagPatternStudio />;
}

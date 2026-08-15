import type { Metadata } from "next";

import { GuideChrome } from "@/components/app/quilt-guide/guide-chrome";

export const metadata: Metadata = {
  title: {
    default: "Quilt Field Guide · Monosyth Studio",
    template: "%s · Quilt Field Guide",
  },
  description: "A visual quilt-math guide for precuts, HSTs, named blocks, efficient ruler cutting, quilt planning, and finishing.",
  robots: { index: false, follow: false },
};

export default function QuiltGuideLayout({ children }: { children: React.ReactNode }) {
  return <GuideChrome>{children}</GuideChrome>;
}

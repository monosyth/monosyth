import type { Metadata } from "next";

import { PossumPaydayGame } from "@/components/app/possum-payday-game";

import "./possum-payday.css";

const title = "Possum Payday · Monosyth Studio";
const description =
  "A rowdy 6×5 family fortune slot game with original characters, junkyard treasures, and the Goat Rodeo bonus.";

export const metadata: Metadata = {
  title,
  description,
  icons: {
    icon: "/possum-payday/art/symbols/earl-possum.png",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title,
    description,
    url: "/app/possum-payday",
    siteName: "Monosyth",
    type: "website",
    images: [
      {
        url: "/possum-payday/og.png",
        alt: "Possum Payday Family Fortune Reels",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/possum-payday/og.png"],
  },
};

export default function PossumPaydayPage() {
  return <PossumPaydayGame />;
}

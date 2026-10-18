import type { Metadata } from "next";
import { PhoneBirdListeningGate } from "@/components/weather/phone-bird-listening-gate";

export const metadata: Metadata = {
  title: "Private bird listening | Monosyth weather",
  robots: { index: false, follow: false },
};

export default function PhoneBirdListeningPage() {
  return <PhoneBirdListeningGate />;
}

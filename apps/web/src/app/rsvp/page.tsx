import type { Metadata } from "next";

import { RSVPApp } from "@/components/rsvp/rsvp-app";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  title: "Monosyth Events",
  description: "Browse upcoming events and send your RSVP.",
  openGraph: {
    title: "Monosyth Events",
    description: "Browse upcoming events and send your RSVP.",
    url: `${siteUrl}/rsvp`,
    siteName: "Monosyth",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monosyth Events",
    description: "Browse upcoming events and send your RSVP.",
  },
};

export default function RSVPPage() {
  return <RSVPApp />;
}

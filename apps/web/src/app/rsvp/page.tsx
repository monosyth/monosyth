import type { Metadata } from "next";

import { RSVPApp } from "@/components/rsvp/rsvp-app";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  title: "Monosyth RSVP Studio",
  description:
    "A personal RSVP experience inspired by RSVPify and rebuilt inside Monosyth.",
  openGraph: {
    title: "Monosyth RSVP Studio",
    description:
      "A personal RSVP experience inspired by RSVPify and rebuilt inside Monosyth.",
    url: `${siteUrl}/rsvp`,
    siteName: "Monosyth",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monosyth RSVP Studio",
    description:
      "A personal RSVP experience inspired by RSVPify and rebuilt inside Monosyth.",
  },
};

export default function RSVPPage() {
  return <RSVPApp />;
}

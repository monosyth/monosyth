import type { Metadata } from "next";

import { EventStoreProvider } from "@/components/rsvp/event-store";
import { ProgressDock } from "@/components/rsvp/progress-dock";
import { RsvpNav } from "@/components/rsvp/rsvp-nav";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  title: {
    default: "Dallas · Sin City Birthday",
    template: "%s · Dallas Sin City",
  },
  description:
    "Dallas's Sin City Birthday Party — six nights in Vegas, July 30–August 4. Itinerary, hotel tips, activities, dress codes, RSVPs & deposits.",
  openGraph: {
    title: "Dallas · Sin City Birthday Party",
    description:
      "Dallas's Sin City Birthday Party — itinerary, hotel tips, activities, dress codes, RSVPs & deposits.",
    url: `${siteUrl}/rsvp`,
    siteName: "Monosyth",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dallas · Sin City Birthday Party",
    description:
      "Six nights in Vegas, July 30–August 4. RSVPs & deposits due June 10.",
  },
};

export default function RSVPLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <EventStoreProvider>
      <main className="rsvp-shell min-h-screen">
        <RsvpNav />
        {children}
        <ProgressDock />
        <footer className="mx-auto w-full max-w-[78rem] px-4 pb-12 pt-8 text-center sm:px-8 lg:px-12">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-[var(--rsvp-ink-dim)]">
            Dallas · Sin City Birthday · July 30 – August 4, 2026 · Las Vegas, NV
          </p>
        </footer>
      </main>
    </EventStoreProvider>
  );
}

import type { Metadata } from "next";
import { JournalConnections } from "@/components/projects/journal-connections";
export const metadata: Metadata = {
  title: "Journal connections | Monosyth", description: "Approve and revoke private project journal connections",
  robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer",
};
export default function ConnectionsPage() { return <JournalConnections />; }

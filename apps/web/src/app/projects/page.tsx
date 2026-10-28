import type { Metadata } from "next";
import { ProjectJournal } from "@/components/projects/project-journal";

export const metadata: Metadata = {
  title: "Project journal | Monosyth",
  description: "Private Monosyth project journal",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export default function ProjectsPage() { return <ProjectJournal />; }

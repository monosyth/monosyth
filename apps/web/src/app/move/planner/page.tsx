import type { Metadata } from "next";
import { MovePlanner } from "@/components/move/planner";
export const metadata: Metadata = {
  title: "Your move | MoveMorrow",
  description:
    "Build a personal moving checklist, timeline, and budget with MoveMorrow.",
  robots: { index: false, follow: false },
};
export default function PlannerPage() {
  return <MovePlanner />;
}

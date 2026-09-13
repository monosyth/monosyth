import type { Metadata } from "next";
import { MovePlanner } from "@/components/move/planner";
export const metadata: Metadata = {
  title: "Your move | MoveMorrow",
  description:
    "Plan your move with a checklist, budget, contacts, and moving-day essentials in MoveMorrow.",
  robots: { index: false, follow: false },
};
export default function PlannerPage() {
  return <MovePlanner />;
}

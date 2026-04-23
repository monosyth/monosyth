import type { Metadata } from "next";

import { DALLAS_EVENT_CONTENT } from "@/lib/rsvp/event-content";

import { DayView } from "./day-view";

type Params = { dayId: string };

export function generateStaticParams(): Params[] {
  return DALLAS_EVENT_CONTENT.schedule.days.map((day) => ({ dayId: day.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { dayId } = await params;
  const day = DALLAS_EVENT_CONTENT.schedule.days.find((d) => d.id === dayId);
  if (!day) return { title: "Day" };
  return {
    title: `${day.dayLabel} · ${day.dayName}`,
    description: day.headline,
  };
}

export default async function DayPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { dayId } = await params;
  return <DayView dayId={dayId} />;
}

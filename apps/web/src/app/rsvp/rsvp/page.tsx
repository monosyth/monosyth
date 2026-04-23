"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { useEventStore } from "@/components/rsvp/event-store";
import { RSVPApp } from "@/components/rsvp/rsvp-app";

function RSVPFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get("q") ?? undefined;
  const { answers, setAnswerById } = useEventStore();

  return (
    <RSVPApp
      initialView="wizard"
      onExitToHome={() => router.push("/rsvp")}
      initialAnswers={answers}
      initialQuestionSlug={slug}
      onAnswerChange={(id, value) => setAnswerById(id, value)}
    />
  );
}

export default function RSVPFormPage() {
  return (
    <Suspense fallback={null}>
      <RSVPFormInner />
    </Suspense>
  );
}

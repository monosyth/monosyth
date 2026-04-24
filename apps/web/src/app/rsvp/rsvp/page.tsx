"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useEventStore } from "@/components/rsvp/event-store";
import { GuestAuthGate } from "@/components/rsvp/guest-auth-gate";
import { RSVPApp } from "@/components/rsvp/rsvp-app";

function RSVPFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get("q") ?? undefined;
  const { user } = useAuth();
  const { answers, setAnswerById, setAnswerBySlug, getAnswerBySlug, ready } =
    useEventStore();

  // Pre-fill guest-name + guest-email from the signed-in user's Google
  // profile if the guest hasn't already typed something in.
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (!ready || !user || prefilledRef.current) return;
    prefilledRef.current = true;
    const currentName = getAnswerBySlug("guest-name");
    if (!currentName || (typeof currentName === "string" && !currentName.trim())) {
      if (user.displayName) setAnswerBySlug("guest-name", user.displayName);
    }
    const currentEmail = getAnswerBySlug("guest-email");
    if (!currentEmail || (typeof currentEmail === "string" && !currentEmail.trim())) {
      if (user.email) setAnswerBySlug("guest-email", user.email);
    }
  }, [ready, user, getAnswerBySlug, setAnswerBySlug]);

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
      <GuestAuthGate>
        <RSVPFormInner />
      </GuestAuthGate>
    </Suspense>
  );
}

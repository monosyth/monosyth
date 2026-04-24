"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { useEventStore } from "@/components/rsvp/event-store";
import { GuestAuthGate } from "@/components/rsvp/guest-auth-gate";
import { useIdentity } from "@/components/rsvp/identity";
import { RSVPApp } from "@/components/rsvp/rsvp-app";

function RSVPFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get("q") ?? undefined;
  const identity = useIdentity();
  const { answers, setAnswerById, setAnswerBySlug, getAnswerBySlug, ready } =
    useEventStore();

  // Pre-fill guest-name + guest-email from the signed-in identity (Google
  // profile or the name+email the guest typed into the gate) if the guest
  // hasn't already typed something in.
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (!ready || identity.status !== "signed_in" || prefilledRef.current) return;
    prefilledRef.current = true;
    const { name, email } = identity.identity;
    const currentName = getAnswerBySlug("guest-name");
    if (!currentName || (typeof currentName === "string" && !currentName.trim())) {
      if (name) setAnswerBySlug("guest-name", name);
    }
    const currentEmail = getAnswerBySlug("guest-email");
    if (!currentEmail || (typeof currentEmail === "string" && !currentEmail.trim())) {
      if (email) setAnswerBySlug("guest-email", email);
    }
  }, [ready, identity, getAnswerBySlug, setAnswerBySlug]);

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

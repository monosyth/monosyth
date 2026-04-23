"use client";

import { useRouter } from "next/navigation";

import { RSVPApp } from "@/components/rsvp/rsvp-app";

export default function RSVPFormPage() {
  const router = useRouter();
  return (
    <RSVPApp
      initialView="wizard"
      onExitToHome={() => router.push("/rsvp")}
    />
  );
}

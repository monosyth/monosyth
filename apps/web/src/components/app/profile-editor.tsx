"use client";

import { useState } from "react";

import { EditableUserProfile } from "@/lib/firebase/profiles";
import { useAuth } from "@/components/auth/auth-provider";

type FormState = {
  bio: string;
  handle: string;
  linksText: string;
  theme: EditableUserProfile["theme"];
};

function toFormState(
  profile: EditableUserProfile | null,
  fallbackHandle: string,
): FormState {
  return {
    bio: profile?.bio ?? "",
    handle: profile?.handle ?? fallbackHandle,
    linksText: profile?.links.join("\n") ?? "",
    theme: profile?.theme ?? "ember",
  };
}

export function ProfileEditor() {
  const {
    profile,
    profileError,
    profileSaveState,
    profileSaveMessage,
    saveProfile,
    user,
  } = useAuth();

  const [form, setForm] = useState<FormState>(() =>
    toFormState(
      profile,
      user?.email?.split("@")[0] ?? user?.displayName ?? "monosyth",
    ),
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await saveProfile({
      bio: form.bio,
      handle: form.handle,
      links: form.linksText.split("\n"),
      theme: form.theme,
    });
  }

  return (
    <section className="glass-panel rounded-[1.75rem] px-5 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            Profile editor
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            Shape the Monosyth identity layer.
          </h2>
        </div>
        <p className="text-sm leading-7 text-stone-600">
          These fields save into your Firestore `users/{'{uid}'}` document.
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm text-stone-700">
            <span className="font-medium">Handle</span>
            <input
              value={form.handle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  handle: event.target.value,
                }))
              }
              className="rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-900/25"
              placeholder="monosyth"
            />
          </label>

          <label className="grid gap-2 text-sm text-stone-700">
            <span className="font-medium">Theme preference</span>
            <select
              value={form.theme}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  theme: event.target.value as EditableUserProfile["theme"],
                }))
              }
              className="rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-900/25"
            >
              <option value="ember">Ember</option>
              <option value="forest">Forest</option>
              <option value="stone">Stone</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm text-stone-700">
          <span className="font-medium">Bio</span>
          <textarea
            value={form.bio}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                bio: event.target.value,
              }))
            }
            className="min-h-32 rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-900/25"
            placeholder="What Monosyth stands for, what you're building, and where this is going."
          />
        </label>

        <label className="grid gap-2 text-sm text-stone-700">
          <span className="font-medium">Links</span>
          <textarea
            value={form.linksText}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                linksText: event.target.value,
              }))
            }
            className="min-h-28 rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-900/25"
            placeholder={"https://github.com/monosyth\nhttps://monosyth.com"}
          />
          <span className="text-xs text-stone-500">
            One URL per line. The app stores up to 8 links.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={profileSaveState === "saving"}
            className="rounded-full bg-[var(--pine)] px-5 py-3 text-sm font-medium text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSaveState === "saving" ? "Saving..." : "Save profile"}
          </button>
          {profileSaveMessage ? (
            <p className="text-sm text-[#1f5c49]">{profileSaveMessage}</p>
          ) : null}
        </div>
      </form>

      {profileError ? (
        <p className="mt-4 rounded-2xl border border-[#d46d31]/25 bg-[#d46d31]/10 px-4 py-3 text-sm text-[#8b3f18]">
          {profileError}
        </p>
      ) : null}
    </section>
  );
}

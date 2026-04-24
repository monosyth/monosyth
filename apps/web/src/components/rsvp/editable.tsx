"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

import { useEventStore } from "@/components/rsvp/event-store";
import { RSVP_IMAGE_LIBRARY } from "@/lib/rsvp/form-data";

/* ---------------------------------------------------------------- */
/* Shared affordance: hover outline + pencil icon                    */
/* ---------------------------------------------------------------- */

const PENCIL_ICON = (
  <svg
    viewBox="0 0 24 24"
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

/* ---------------------------------------------------------------- */
/* EditableText                                                     */
/* ---------------------------------------------------------------- */

type EditableTextProps = {
  /** Dotted path into EventContent (e.g. "overview.title"). */
  path: string;
  /** Current value. Pass from content.* so non-admins see it unchanged. */
  value: string;
  /** The wrapping element type for non-admin render. Defaults to span. */
  as?: keyof React.JSX.IntrinsicElements;
  /** Render as a textarea for multi-line fields. Default: single-line input. */
  multiline?: boolean;
  /** Placeholder in edit mode when the value is empty. */
  placeholder?: string;
  className?: string;
};

export function EditableText({
  path,
  value,
  as = "span",
  multiline = false,
  placeholder,
  className,
}: EditableTextProps) {
  const { canEditContent, setContentAtPath } = useEventStore();
  const [editing, setEditing] = useState(false);
  // Seed draft from the live value whenever editing turns on.
  // (Storing the draft only while editing avoids the cascading-render
  // warning from syncing value -> draft every re-render.)
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const beginEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  // Auto-focus on entering edit mode.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      // place cursor at end
      if (inputRef.current && "setSelectionRange" in inputRef.current) {
        const el = inputRef.current;
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, [editing]);

  // If the viewer isn't an admin, just render the value in the requested
  // element. No wrappers, no extra markup.
  if (!canEditContent) {
    const Tag = as;
    return <Tag className={className}>{value}</Tag>;
  }

  const commit = () => {
    if (draft !== value) {
      setContentAtPath(path, draft);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={(el) => {
            inputRef.current = el;
          }}
          value={draft}
          rows={Math.max(2, Math.ceil(draft.length / 80))}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commit();
            }
          }}
          className={`w-full rounded-md border border-[var(--rsvp-teal)] bg-[rgba(77,225,255,0.05)] px-2 py-1 text-[var(--rsvp-ink)] outline-none focus:ring-2 focus:ring-[var(--rsvp-teal)]/50 ${className ?? ""}`}
        />
      );
    }
    return (
      <input
        ref={(el) => {
          inputRef.current = el;
        }}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className={`rounded-md border border-[var(--rsvp-teal)] bg-[rgba(77,225,255,0.05)] px-2 py-0.5 text-[var(--rsvp-ink)] outline-none focus:ring-2 focus:ring-[var(--rsvp-teal)]/50 ${className ?? ""}`}
      />
    );
  }

  const Tag = as;
  return (
    <span className="group relative inline-block">
      <Tag
        onClick={beginEdit}
        className={`cursor-text rounded-md px-0.5 transition outline-none ${className ?? ""} ring-1 ring-transparent hover:bg-[rgba(77,225,255,0.05)] hover:ring-[var(--rsvp-teal)]/40`}
        title="Click to edit"
      >
        {value || (
          <span className="italic text-[var(--rsvp-ink-dim)]">
            {placeholder ?? "Click to edit"}
          </span>
        )}
      </Tag>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full border border-[var(--rsvp-teal)] bg-[rgba(7,4,10,0.9)] text-[var(--rsvp-teal)] group-hover:flex"
      >
        {PENCIL_ICON}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* EditableImage                                                    */
/* ---------------------------------------------------------------- */

type EditableImageProps = {
  /** Dotted path to the imageUrl field. */
  urlPath: string;
  /** Optional path to a paired alt-text field. */
  altPath?: string;
  /** Current image URL (or undefined when not set). */
  url: string | undefined;
  /** Current alt text. */
  alt?: string;
  /** Tailwind classes for the <img>. */
  className?: string;
  /**
   * Renderer for the non-admin view. If not supplied, an <img> is used with
   * `className`. Provide when the image is a CSS background or otherwise
   * needs custom markup.
   */
  children?: React.ReactNode;
};

export function EditableImage({
  urlPath,
  altPath,
  url,
  alt,
  className,
  children,
}: EditableImageProps) {
  const { canEditContent, setContentAtPath } = useEventStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  const renderImage = () => {
    if (children) return children;
    if (!url) {
      return (
        <div
          className={`flex items-center justify-center bg-[rgba(10,4,18,0.6)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--rsvp-ink-dim)] ${className ?? ""}`}
        >
          No image
        </div>
      );
    }
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={url} alt={alt ?? ""} className={className} loading="lazy" />
    );
  };

  if (!canEditContent) {
    return <>{renderImage()}</>;
  }

  return (
    <div className="group relative">
      {renderImage()}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="absolute right-2 top-2 z-10 hidden items-center gap-1.5 rounded-full border border-[var(--rsvp-teal)] bg-[rgba(7,4,10,0.8)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--rsvp-teal)] backdrop-blur-sm group-hover:flex"
        aria-label="Change image"
      >
        {PENCIL_ICON}
        Change image
      </button>
      {pickerOpen ? (
        <ImagePickerModal
          currentUrl={url}
          onClose={() => setPickerOpen(false)}
          onSelect={(nextUrl, nextAlt) => {
            setContentAtPath(urlPath, nextUrl);
            if (altPath && typeof nextAlt === "string") {
              setContentAtPath(altPath, nextAlt);
            }
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ImagePickerModal({
  currentUrl,
  onClose,
  onSelect,
}: Readonly<{
  currentUrl: string | undefined;
  onClose: () => void;
  onSelect: (url: string | undefined, alt: string) => void;
}>) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-16 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--rsvp-teal)]/40 bg-[rgba(10,4,18,0.98)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-teal)]">
            Change image
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
          >
            Close
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onSelect(undefined, "")}
            className={`rounded-xl border px-2 py-4 text-xs font-semibold uppercase tracking-[0.16em] transition ${
              !currentUrl
                ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]/10 text-[var(--rsvp-pink-soft)]"
                : "border-[var(--rsvp-border-soft)] bg-black/30 text-[var(--rsvp-ink-dim)] hover:border-[var(--rsvp-border)]"
            }`}
          >
            None
          </button>
          {RSVP_IMAGE_LIBRARY.map((asset) => {
            const active = currentUrl === asset.url;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onSelect(asset.url, asset.label)}
                className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? "border-[var(--rsvp-pink)] shadow-[0_0_18px_rgba(255,61,154,0.35)]"
                    : "border-[var(--rsvp-border-soft)] hover:border-[var(--rsvp-teal)]/60"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.label}
                  className="h-28 w-full object-cover"
                />
                <span className="px-2 py-1.5 text-[0.6rem] font-mono uppercase tracking-[0.15em] text-[var(--rsvp-ink-dim)] group-hover:text-[var(--rsvp-ink)]">
                  {asset.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[0.7rem] text-[var(--rsvp-ink-dim)]">
          Need more images? Drop files in <code>public/rsvp-images/</code> and
          add them to <code>RSVP_IMAGE_LIBRARY</code> in form-data.ts.
        </p>
      </div>
    </div>
  );
}
